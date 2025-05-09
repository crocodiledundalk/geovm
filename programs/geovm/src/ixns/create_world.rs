use anchor_lang::prelude::*;
use crate::state::trixel_data::TrixelDataType;
use crate::state::World;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateWorldArgs {
    pub canonical_resolution: u8,
    pub data_type: TrixelDataType,
    pub name: [u8;32],
    pub permissioned_updates: bool,
}

#[derive(Accounts)]
pub struct CreateWorldCtx<'info> {
        
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)] /// CHECK:
    pub authority: AccountInfo<'info>,
    
    #[account(
        init,
        payer = payer,
        space = World::bytes()
    )]
    pub world: Account<'info, World>,

    pub system_program: Program<'info, System>,
}

pub fn handle_create_world(ctx: Context<CreateWorldCtx>, args: CreateWorldArgs) -> Result<()> {
    let world = &mut ctx.accounts.world;
    world.init(
        ctx.accounts.authority.key(),
        args.name,
        args.canonical_resolution,
        args.permissioned_updates,
        args.data_type
    );
    Ok(())
}
