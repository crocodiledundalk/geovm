use anchor_lang::prelude::*;
use crate::state::World;
use crate::errors::ErrorCode;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateWorldArgs {
    pub max_resolution: u8,
    pub canonical_resolution: u8
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
    ctx.accounts.world.init(
        ctx.accounts.authority.key(),
        args.max_resolution,
        args.canonical_resolution
    );
    Ok(())
}
