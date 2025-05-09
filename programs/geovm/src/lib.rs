use anchor_lang::prelude::*;

mod errors;
mod ixns;
mod state;
mod helpers;

pub use ixns::*;

declare_id!("2v5V4aVkQnFHojUoY4td6X7E7e5NQ78mKzAjAoA6JBrJ");

#[program]
pub mod geovm {
    use super::*;

    pub fn create_world(ctx: Context<CreateWorldCtx>, args: CreateWorldArgs) -> Result<()> {
        handle_create_world(ctx, args)
    }

    pub fn create_trixel_and_ancestors<'info>(ctx: Context<'_, '_, 'info, 'info, CreateTrixelAndAncestorsCtx<'info>>, args: CreateTrixelAndAncestorsArgs) -> Result<()> {
        handle_create_trixel_and_ancestors(ctx, args)
    }

    pub fn update_trixel<'info>(ctx: Context<'_, '_, 'info, 'info, UpdateTrixelCtx<'info>>, args: UpdateTrixelArgs) -> Result<()> {
        handle_update_trixel(ctx, args)
    }


}
