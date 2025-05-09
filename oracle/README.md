# GeoVM CSV Import Tool

This tool imports data from a CSV file into the GeoVM system by creating trixels and updating them with values from the CSV.

## Features

- Creates a new World with a specified name and canonical resolution
- Loads data from a CSV file containing trixel IDs and values
- Creates trixels and their ancestors
- Updates trixels with values from the CSV
- Rate limits transactions to avoid overwhelming the Solana network (max 20 TPS)
- Combines create and update operations into a single transaction

## Prerequisites

- Node.js (v16+)
- TypeScript
- Solana CLI tools
- A Solana keypair
- The GeoVM program deployed to a Solana network (local or devnet)

## Installation

```bash
cd oracle
npm install
```

## CSV Format

The CSV file should have the following format:

```
trixelId,value
211111,42
211112,24
211113,36
...
```

Where:
- `trixelId`: The ID of the trixel
- `value`: The numeric value to store in the trixel

## Usage

### Using Yarn/NPM Scripts

The simplest way to run the importer is using the provided scripts:

```bash
# Run with sample data
yarn import:sample

# Run with custom parameters
yarn import:csv ./your-data.csv "My World" 5 AggregateOverwrite ~/.config/solana/id.json
```

### Manual Execution

```bash
yarn start <csv-file-path> <world-name> <canonical-resolution> <data-type> [keypair-path]
```

Example:

```bash
yarn start ./sample-data.csv "My Geo World" 5 AggregateOverwrite ~/.config/solana/id.json
```

Parameters:
- `csv-file-path`: Path to the CSV file containing the data
- `world-name`: Name of the world to create (max 32 characters)
- `canonical-resolution`: Resolution level (1-10)
- `data-type`: Either `AggregateOverwrite` or `MeanOverwrite`
- `keypair-path` (optional): Path to your Solana keypair file (defaults to `~/.config/solana/id.json`)

## Note about Program ID

Make sure to update the program ID in the script to match your deployed GeoVM program:

```typescript
// In import-csv-to-geovm.ts
const programId = new PublicKey('Your_Deployed_Program_ID_Here');
``` 