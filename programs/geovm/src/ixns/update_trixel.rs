use anchor_lang::prelude::*;
use crate::state::{Trixel, World};
use crate::errors::ErrorCode;
use crate::helpers::htm::{get_trixel_ancestors, resolution_from_trixel_id, get_child_index, SphericalCoords, get_trixel_id};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UpdateTrixelArgs {
    pub id: u64,
    pub value: i32,  // The value to add to the trixel and its ancestors
    pub coords: Option<SphericalCoords>,  // Optional coordinates to verify the trixel ID
}

#[derive(Accounts)]
#[instruction(args: UpdateTrixelArgs)]
pub struct UpdateTrixelCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut
    )]
    pub world: Account<'info, World>,

    #[account(
        mut,
        seeds = [b"trixel", world.key().as_ref(), args.id.to_le_bytes().as_ref()],
        bump
    )]
    pub trixel: Account<'info, Trixel>,

    /// CHECK: This is the system program
    pub system_program: Program<'info, System>,
}

pub fn handle_update_trixel<'info>(
    ctx: Context<'_, '_, 'info, 'info, UpdateTrixelCtx<'info>>, 
    args: UpdateTrixelArgs
) -> Result<()> {
    // If coordinates are provided, verify they match the trixel ID
    if let Some(coords) = args.coords {
        let expected_id = get_trixel_id(coords, ctx.accounts.world.canonical_resolution)?;
        require!(
            expected_id == args.id,
            ErrorCode::InvalidTrixelId
        );
    }

    // Check that the resolution of the trixel is the world's canonical resolution
    let trixel_resolution = resolution_from_trixel_id(args.id)?;
    require!(
        trixel_resolution == ctx.accounts.world.canonical_resolution,
        ErrorCode::InvalidResolution
    );

    // Derive the list of ancestors of the trixel
    let ancestors = get_trixel_ancestors(args.id)?;

    // Verify we have the correct number of remaining accounts
    require!(
        ancestors.len() == ctx.remaining_accounts.len(),
        ErrorCode::InvalidArgument
    );

    

    // Update the main trixel
    if args.value >= 0 {
        // For positive values, use checked_add
        ctx.accounts.trixel.data = ctx.accounts.trixel.data.checked_add(args.value as u64)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
    } else {
        // For negative values, convert to positive and use checked_sub
        let abs_value = args.value.checked_abs().ok_or(ErrorCode::ArithmeticOverflow)? as u64;
        ctx.accounts.trixel.data = ctx.accounts.trixel.data.checked_sub(abs_value)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
    }

    // Get the child index and resolution using the helper method
    let mut prev_hash = ctx.accounts.trixel.refresh_hash()?;
    let (mut prev_child_idx, mut prev_resolution) = get_child_index(args.id)?;



    // Iterate across each of the ancestors, updating their values
    for (i, rem_acc) in ctx.remaining_accounts.iter().enumerate() {
        let ancestor_id = ancestors[i];
        let ancestor_id_bytes = ancestor_id.to_le_bytes();

        // Derive the PDA for this ancestor
        let (ancestor_pda, _) = Pubkey::find_program_address(
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

        // Update the ancestor account
        let mut ancestor = Account::<'info, Trixel>::try_from(rem_acc)?;
        if args.value >= 0 {
            // For positive values, use checked_add
            ancestor.data = ancestor.data.checked_add(args.value as u64)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
        } else {
            // For negative values, convert to positive and use checked_sub
            let abs_value = args.value.checked_abs().ok_or(ErrorCode::ArithmeticOverflow)? as u64;
            ancestor.data = ancestor.data.checked_sub(abs_value)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
        }

        // Get the updated hash for this ancestor
        prev_hash = ancestor.update_child_hash(prev_child_idx, prev_hash)?;
        (prev_child_idx, prev_resolution) = get_child_index(ancestor.id)?;

        ancestor.exit(&*ctx.program_id)?;
    }

    ctx.accounts.world.update_child_hash(prev_child_idx, prev_hash)?;


    Ok(())
} 


// use anchor_lang::prelude::*;
// use crate::state::{Trixel, World};
// use crate::errors::ErrorCode;
// use crate::helpers::htm::{get_trixel_ancestors, resolution_from_trixel_id, get_child_index};

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
// pub struct UpdateTrixelArgs {
//     pub id: u64,
//     pub value: i32,  // The value to add to the trixel and its ancestors
// }

// #[derive(Accounts)]
// #[instruction(args: UpdateTrixelArgs)]
// pub struct UpdateTrixelCtx<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
    
//     #[account(
//         mut
//     )]
//     pub world: Account<'info, World>,

//     #[account(
//         mut,
//         seeds = [b"trixel", world.key().as_ref(), args.id.to_le_bytes().as_ref()],
//         bump
//     )]
//     pub trixel: Account<'info, Trixel>,

//     /// CHECK: This is the system program
//     pub system_program: Program<'info, System>,
// }

// pub fn handle_update_trixel<'info>(
//     ctx: Context<'_, '_, 'info, 'info, UpdateTrixelCtx<'info>>, 
//     args: UpdateTrixelArgs
// ) -> Result<()> {
//     // Check that the resolution of the trixel is the world's canonical resolution
//     let trixel_resolution = resolution_from_trixel_id(args.id)?;
//     require!(
//         trixel_resolution == ctx.accounts.world.canonical_resolution,
//         ErrorCode::InvalidResolution
//     );


   
//     // Update the main trixel's data and compute new hash
//     let new_data = if args.value >= 0 {
//         ctx.accounts.trixel.data.checked_add(args.value as u64)
//             .ok_or(ErrorCode::ArithmeticOverflow)?
//     } else {
//         let abs_value = args.value.checked_abs().ok_or(ErrorCode::ArithmeticOverflow)? as u64;
//         ctx.accounts.trixel.data.checked_sub(abs_value)
//             .ok_or(ErrorCode::ArithmeticOverflow)?
//     };
//     let mut prev_hash = ctx.accounts.trixel.update_data(new_data)?;
//     // Get the child index and resolution using the helper method
//     let (mut prev_child_idx, mut prev_resolution) = get_child_index(args.id)?;



//     // Derive the list of ancestors of the trixel
//     let ancestors = get_trixel_ancestors(args.id)?;

//     // Verify we have the correct number of remaining accounts
//     require!(
//         ancestors.len() == ctx.remaining_accounts.len(),
//         ErrorCode::InvalidArgument
//     );


     
//     // Iterate across each of the ancestors, updating their child hashes
//     for (i, rem_acc) in ctx.remaining_accounts.iter().enumerate() {
//         let ancestor_id = ancestors[i];
//         let ancestor_id_bytes = ancestor_id.to_le_bytes();

//         // Derive the PDA for this ancestor
//         let (ancestor_pda, _) = Pubkey::find_program_address(
//             &[
//                 b"trixel",
//                 ctx.accounts.world.key().as_ref(),
//                 ancestor_id_bytes.as_ref()
//             ],
//             ctx.program_id
//         );

//         // Verify this remaining account matches the expected PDA
//         require!(
//             rem_acc.key() == ancestor_pda,
//             ErrorCode::InvalidTrixelAccount
//         );

//         // Update ancestor's child hash
//         let mut ancestor = Account::<'info, Trixel>::try_from(rem_acc)?;
//         // Update the data stored
//         // Update the main trixel's data and compute new hash
//         let new_data = if args.value >= 0 {
//             ancestor.data.checked_add(args.value as u64)
//                 .ok_or(ErrorCode::ArithmeticOverflow)?
//         } else {
//             let abs_value = args.value.checked_abs().ok_or(ErrorCode::ArithmeticOverflow)? as u64;
//             ancestor.data.checked_sub(abs_value)
//                 .ok_or(ErrorCode::ArithmeticOverflow)?
//         };
//         ancestor.update_child_hash(prev_child_idx, prev_hash)?;

//         // Get the updated hash for this ancestor
//         (prev_child_idx, prev_resolution) = get_child_index(ancestor.id)?;
//         prev_hash = ancestor.hash;

//         msg!{"ancestor.data: {:?}", ancestor.data};

//         // Exit the account so it's saved
//         ancestor.exit(&ctx.program_id)?;
//     }


//     ctx.accounts.world.update_child_hash(prev_child_idx, prev_hash)?;


//     Ok(())
// } 