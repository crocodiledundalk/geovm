use anchor_lang::prelude::*;
use crate::state::{Trixel, World, TrixelData};
use crate::state::trixel_data::TrixelDataType;
use crate::errors::ErrorCode;
use crate::helpers::htm::{get_trixel_ancestors, resolution_from_trixel_id, get_child_index, SphericalCoords, get_trixel_id};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UpdateTrixelArgs {
    pub id: u64,
    pub value: i32,  // The value to add/set to the trixel and affect its ancestors
    pub coords: Option<SphericalCoords>,  // Optional coordinates to verify the trixel ID
}

#[derive(Accounts)]
#[instruction(args: UpdateTrixelArgs)]
pub struct UpdateTrixelCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut,
        constraint = world.authority == payer.key() || !world.permissioned_updates @ ErrorCode::UnauthorizedAction 
    )]
    pub world: Account<'info, World>,

    #[account(
        mut,
        has_one = world,
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
    // Get world key before mutable borrow
    let world_key = ctx.accounts.world.key();

    // Dereference world and trixel accounts for easier access to their fields/methods
    let world = &mut ctx.accounts.world;
    let trixel = &mut ctx.accounts.trixel;

    // 1. Preliminaries
    let world_data_type = world.data.to_data_type();

    // If coordinates are provided, verify they match the trixel ID
    if let Some(coords) = args.coords {
        let expected_id = get_trixel_id(coords, world.canonical_resolution)?;
        require!(
            expected_id == args.id,
            ErrorCode::InvalidTrixelId
        );
    }

    // Check that the resolution of the trixel is the world's canonical resolution
    let trixel_resolution = resolution_from_trixel_id(args.id)?;
    require!(
        trixel_resolution == world.canonical_resolution,
        ErrorCode::InvalidResolution
    );
    // The has_one = world constraint on the trixel account handles this check implicitly.
    // require!(trixel.world == world.key(), ErrorCode::AccountMismatch); // world.key() is not available on World, but on Account<World>
                                                                       // This is checked by has_one constraint.

    // Derive the list of ancestors of the trixel
    let ancestors = get_trixel_ancestors(args.id)?;

    // Verify we have the correct number of remaining accounts
    require!(
        ancestors.len() == ctx.remaining_accounts.len(),
        ErrorCode::InvalidArgument
    );

    // 2. Canonical Trixel Update
    let mut update_delta_for_parent: i64 = 0;
    let mut denominator_activated_by_canonical_trixel: bool = false;
    let canonical_trixel_id = args.id;

    match world_data_type {
        TrixelDataType::Count => {
            if let TrixelData::Count { count } = &mut trixel.data {
                *count = count.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
            } else { return Err(ErrorCode::AccountMismatch.into()); }
            update_delta_for_parent = 1;
            denominator_activated_by_canonical_trixel = false;
        }
        TrixelDataType::AggregateOverwrite => {
            require!(args.value >= 0, ErrorCode::InvalidArgument);
            if let TrixelData::AggregateOverwrite { metric } = &mut trixel.data {
                let old_metric = *metric;
                *metric = args.value as u64;
                update_delta_for_parent = (*metric as i64) - (old_metric as i64);
            } else { return Err(ErrorCode::AccountMismatch.into()); }
            denominator_activated_by_canonical_trixel = false;
        }
        TrixelDataType::AggregateAccumulate => {
            if let TrixelData::AggregateAccumulate { metric } = &mut trixel.data {
                if args.value >= 0 {
                    *metric = metric.checked_add(args.value as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
                } else {
                    *metric = metric.checked_sub(args.value.abs() as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
                }
                update_delta_for_parent = args.value as i64;
            } else { return Err(ErrorCode::AccountMismatch.into()); }
            denominator_activated_by_canonical_trixel = false;
        }
        TrixelDataType::MeanOverwrite => {
            require!(args.value >= 0, ErrorCode::InvalidArgument);
            if let TrixelData::MeanOverwrite { numerator, denominator } = &mut trixel.data {
                let old_numerator = *numerator;
                let old_denominator_val = *denominator;
                *numerator = args.value as u64;
                *denominator = 1; 
                update_delta_for_parent = (*numerator as i64) - (old_numerator as i64);
                denominator_activated_by_canonical_trixel = old_denominator_val == 0 && *denominator == 1;
            } else { return Err(ErrorCode::AccountMismatch.into()); }
        }
        TrixelDataType::MeanAccumulate => {
            if let TrixelData::MeanAccumulate { numerator, denominator } = &mut trixel.data {
                let old_denominator_val = *denominator;
                if args.value >= 0 {
                    *numerator = numerator.checked_add(args.value as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
                } else {
                    *numerator = numerator.checked_sub(args.value.abs() as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
                }
                *denominator = 1; 
                update_delta_for_parent = args.value as i64;
                denominator_activated_by_canonical_trixel = old_denominator_val == 0 && *denominator == 1;
            } else { return Err(ErrorCode::AccountMismatch.into()); }
        }
    }

    trixel.last_update = Clock::get()?.unix_timestamp;
    trixel.updates = trixel.updates.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
    
    let mut prev_hash = trixel.refresh_hash()?;
    let (mut prev_child_idx, _) = get_child_index(canonical_trixel_id)?;

    // 3. Ancestor Trixel Updates (Loop)
    for (i, rem_acc) in ctx.remaining_accounts.iter().enumerate() {
        let ancestor_id = ancestors[i];
        let ancestor_id_bytes = ancestor_id.to_le_bytes();

        let (ancestor_pda, _ancestor_bump) = Pubkey::find_program_address(
            &[
                b"trixel",
                world_key.as_ref(), // Use world_key here
                ancestor_id_bytes.as_ref()
            ],
            ctx.program_id
        );
        require!(rem_acc.key() == ancestor_pda, ErrorCode::InvalidTrixelAccount);

        let mut ancestor = Account::<'info, Trixel>::try_from(rem_acc)?;
        // require!(ancestor.world == ctx.accounts.world.key(), ErrorCode::AccountMismatch); // checked by has_one on trixel, ancestor is not has_one
                                                                                          // instead check ancestor.world == world.key() where world is the dereferenced Account<World>
        require!(ancestor.world == world_key, ErrorCode::AccountMismatch); // Use world_key here
        require!(ancestor.data.to_data_type() == world_data_type, ErrorCode::AccountMismatch);

        match world_data_type {
            TrixelDataType::Count => {
                if let TrixelData::Count { count } = &mut ancestor.data {
                    *count = count.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
                } else { return Err(ErrorCode::AccountMismatch.into()); }
            }
            TrixelDataType::AggregateOverwrite | TrixelDataType::AggregateAccumulate => {
                let current_metric = match &mut ancestor.data {
                    TrixelData::AggregateOverwrite { metric } => metric,
                    TrixelData::AggregateAccumulate { metric } => metric,
                    _ => return Err(ErrorCode::AccountMismatch.into()),
                };
                if update_delta_for_parent >= 0 {
                    *current_metric = current_metric.checked_add(update_delta_for_parent as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
                } else {
                    *current_metric = current_metric.checked_sub(update_delta_for_parent.abs() as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
                }
            }
            TrixelDataType::MeanOverwrite | TrixelDataType::MeanAccumulate => {
                let (current_numerator, current_denominator) = match &mut ancestor.data {
                    TrixelData::MeanOverwrite { numerator, denominator } => (numerator, denominator),
                    TrixelData::MeanAccumulate { numerator, denominator } => (numerator, denominator),
                    _ => return Err(ErrorCode::AccountMismatch.into()),
                };
                if update_delta_for_parent >= 0 {
                    *current_numerator = current_numerator.checked_add(update_delta_for_parent as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
                } else {
                    *current_numerator = current_numerator.checked_sub(update_delta_for_parent.abs() as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
                }
                if denominator_activated_by_canonical_trixel {
                    *current_denominator = current_denominator.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
                }
            }
        }

        ancestor.last_update = Clock::get()?.unix_timestamp;
        ancestor.updates = ancestor.updates.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
        prev_hash = ancestor.update_child_hash(prev_child_idx, prev_hash)?;
        (prev_child_idx, _) = get_child_index(ancestor.id)?;
        ancestor.exit(ctx.program_id)?;
    }

    // 4. World Account Update
    match world_data_type {
        TrixelDataType::Count => {
            if let TrixelData::Count { count } = &mut world.data {
                *count = count.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
            } else { return Err(ErrorCode::AccountMismatch.into()); }
        }
        TrixelDataType::AggregateOverwrite | TrixelDataType::AggregateAccumulate => {
             let world_metric = match &mut world.data {
                TrixelData::AggregateOverwrite { metric } => metric,
                TrixelData::AggregateAccumulate { metric } => metric,
                _ => return Err(ErrorCode::AccountMismatch.into()),
            };
            if update_delta_for_parent >= 0 {
                *world_metric = world_metric.checked_add(update_delta_for_parent as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
            } else {
                *world_metric = world_metric.checked_sub(update_delta_for_parent.abs() as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
            }
        }
        TrixelDataType::MeanOverwrite | TrixelDataType::MeanAccumulate => {
            let (world_numerator, world_denominator) = match &mut world.data {
                TrixelData::MeanOverwrite { numerator, denominator } => (numerator, denominator),
                TrixelData::MeanAccumulate { numerator, denominator } => (numerator, denominator),
                _ => return Err(ErrorCode::AccountMismatch.into()),
            };
            if update_delta_for_parent >= 0 {
                *world_numerator = world_numerator.checked_add(update_delta_for_parent as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
            } else {
                *world_numerator = world_numerator.checked_sub(update_delta_for_parent.abs() as u64).ok_or(ErrorCode::ArithmeticOverflow)?;
            }
            if denominator_activated_by_canonical_trixel {
                *world_denominator = world_denominator.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
            }
        }
    }
    
    world.updates = world.updates.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
    world.update_child_hash_and_root(prev_child_idx, prev_hash)?;

    Ok(())
} 
