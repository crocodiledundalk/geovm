use anchor_lang::prelude::*;
use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    UnspecifiedError,
    InvalidArgument,
    InvalidAccount,
    AccountMismatch,
    UnauthorizedAction,
    InvalidResolution,
    InvalidCoordinates,
    InvalidTrixelAccount,
    InvalidTrixelId,
    ArithmeticOverflow
}