use anchor_lang::prelude::*;
use crate::helpers::get_child_index;
use crate::state::{Trixel, World};
use crate::errors::ErrorCode;
use crate::helpers::htm::{get_trixel_ancestors, resolution_from_trixel_id};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateTrixelAndAncestorsArgs {
    pub id: u64,
}

#[derive(Accounts)]
#[instruction(args: CreateTrixelAndAncestorsArgs)]
pub struct CreateTrixelAndAncestorsCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut
    )]
    pub world: Account<'info, World>,

    #[account(
        init_if_needed,
        payer = payer,
        space = Trixel::bytes(),
        seeds = [b"trixel", world.key().as_ref(), args.id.to_le_bytes().as_ref()],
        bump
    )]
    pub trixel: Account<'info, Trixel>,

    /// CHECK: This is the system program
    pub system_program: Program<'info, System>,
}


pub fn handle_create_trixel_and_ancestors<'info>(ctx: Context<'_, '_, 'info, 'info, CreateTrixelAndAncestorsCtx<'info>>, args: CreateTrixelAndAncestorsArgs) -> Result<()> {
    // Check that the resolution of the trixel is the world's canonical resolution
    let trixel_resolution = resolution_from_trixel_id(args.id)?;
    require!(
        trixel_resolution == ctx.accounts.world.canonical_resolution,
        ErrorCode::InvalidResolution
    );
    let world_data_type = ctx.accounts.world.data.to_data_type();


    // Initialize the main trixel
    let trixel = &mut ctx.accounts.trixel;
    trixel.init(
        ctx.accounts.world.key(),
        args.id,
        trixel_resolution,
        world_data_type
    )?;
    // Get the child index of this trixel within its parent
    let (mut prev_child_idx, mut prev_resolution) = get_child_index(args.id)?;
    let mut prev_hash = ctx.accounts.trixel.hash;
    
    // Derive the list of ancestors of the trixel
    let ancestors = get_trixel_ancestors(args.id)?;

    // Verify we have the correct number of remaining accounts
    require!(
        ancestors.len() == ctx.remaining_accounts.len(),
        ErrorCode::InvalidArgument
    );

    // Iterate across each of the ancestors, initing them if required
    for (i, rem_acc) in ctx.remaining_accounts.iter().enumerate() {
        let ancestor_id = ancestors[i];
        let ancestor_id_bytes = ancestor_id.to_le_bytes();
        let trixel_resolution = resolution_from_trixel_id(ancestor_id)?;

        // Derive the PDA for this ancestor
        let (ancestor_pda, ancestor_bump) = Pubkey::find_program_address(
            &[
                b"trixel",
                ctx.accounts.world.key().as_ref(),
                ancestor_id_bytes.as_ref()
            ],
            ctx.program_id
        );

        // Verify this remaining account matches the expected PDA
        require!(
            rem_acc.key() == ancestor_pda,
            ErrorCode::InvalidTrixelAccount
        );

        // Check if the ancestor account exists
        if rem_acc.data_is_empty() {
            // Create the ancestor account
            let rent = Rent::get()?;
            let space = Trixel::bytes();
            let lamports = rent.minimum_balance(space);
            
            // Create the account with system program
            let create_account_ix = anchor_lang::solana_program::system_instruction::create_account(
                &ctx.accounts.payer.key(),
                &ancestor_pda,
                lamports,
                space as u64,
                ctx.program_id,
            );
            
            // Execute the instruction
            anchor_lang::solana_program::program::invoke_signed(
                &create_account_ix,
                &[
                    ctx.accounts.payer.to_account_info(),
                    rem_acc.clone(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[&[
                    b"trixel",
                    ctx.accounts.world.key().as_ref(),
                    ancestor_id_bytes.as_ref(),
                    &[ancestor_bump],
                ]],
            )?;
            let mut ancestor_account_data = Account::<'info, Trixel>::try_from_unchecked(rem_acc)?;
            ancestor_account_data.init(
                ctx.accounts.world.key(),
                ancestor_id,
                trixel_resolution,
                world_data_type
            )?;
            // Give it the child hash for the previous
            ancestor_account_data.update_child_hash(prev_child_idx, prev_hash)?;
            // Get the updated hash for this ancestor
            (prev_child_idx, prev_resolution) = get_child_index(ancestor_account_data.id)?;
            prev_hash = ancestor_account_data.hash;
            // Exit the account so it's saved
            ancestor_account_data.exit(&*ctx.program_id)?;
        } else {
            let mut ancestor = Account::<'info, Trixel>::try_from(rem_acc)?;
            // Give it the child hash for the previous
            ancestor.update_child_hash(prev_child_idx, prev_hash)?;
            // Get the updated hash for this ancestor
            (prev_child_idx, prev_resolution) = get_child_index(ancestor.id)?;
            prev_hash = ancestor.hash;
            // Exit the account so it's saved
            ancestor.exit(&*ctx.program_id)?;
        }
    }

    // Update the World
    ctx.accounts.world.update_child_hash_and_root(prev_child_idx, prev_hash)?;


    Ok(())
}
