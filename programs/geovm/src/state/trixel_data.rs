use anchor_lang::prelude::*;

/// Represents different types of data that can be stored in a trixel
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum TrixelDataType {
    Count,
    AggregateOverwrite,
    AggregateAccumulate,
    MeanOverwrite,
    MeanAccumulate,
}

/// Represents different types of data that can be stored in a trixel
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum TrixelData {
    Count {
        count: u32,
    },
    AggregateOverwrite {
        metric: u64
    },
    AggregateAccumulate {
        metric: u64
    },
    MeanOverwrite {
        numerator: u64,
        denominator: u64
    },
    MeanAccumulate {
        numerator: u64,
        denominator: u64
    },
}

impl TrixelData {
    pub fn to_data_type(&self) -> TrixelDataType {
        match self {
            TrixelData::Count { .. } => TrixelDataType::Count,
            TrixelData::AggregateOverwrite { .. } => TrixelDataType::AggregateOverwrite,
            TrixelData::AggregateAccumulate { .. } => TrixelDataType::AggregateAccumulate,
            TrixelData::MeanOverwrite { .. } => TrixelDataType::MeanOverwrite,
            TrixelData::MeanAccumulate { .. } => TrixelDataType::MeanAccumulate,
        }
    }
}

impl Default for TrixelData {
    fn default() -> Self {
        TrixelData::Count { count: 0 }
    }
}

