import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Geovm } from "../target/types/geovm";
import { Keypair, PublicKey, SystemProgram, AccountMeta } from "@solana/web3.js";
import { expect } from "chai";
import { 
    getTrixelAndAncestorPDAs, 
    getTrixelPDA,
    SphericalCoords,
    getTrixelAncestors
} from "./utils";

// Define VALID_IDS_RESOLUTION_5 locally as it's not exported from utils.ts
const VALID_IDS_RESOLUTION_5 = [
  211111, // Changed to an ID with resolution 5 (e.g., Base 2, then five 1s)
  512341, // Another example with resolution 5
];

describe("geovm", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Geovm as Program<Geovm>;
  const payer = provider.wallet;
  const WORLD_RESOLUTION = 4;

  var worldPubkey: PublicKey;
  var coords: SphericalCoords;

  describe("world", () => {
    it("Creates a new world", async () => {
      const worldKeypair = new Keypair();
      worldPubkey = worldKeypair.publicKey;

      // Define arguments matching the new CreateWorldArgs struct
      const worldNameString = "OldTestWorld32Bytes";
      const worldNameArray = Array.from(Buffer.from(worldNameString.padEnd(32, "\0")));
      const dataType = { aggregateOverwrite: {} }; // Example, adjust if needed for this test
      const permissionedUpdates = false;

      await program.methods
        .createWorld({
          name: worldNameArray, 
          canonicalResolution: WORLD_RESOLUTION, // WORLD_RESOLUTION is already defined in this scope
          dataType: dataType,
          permissionedUpdates: permissionedUpdates,
        })
        .accountsStrict({
          payer: payer.publicKey,
          authority: payer.publicKey,
          world: worldPubkey,
          systemProgram: SystemProgram.programId,
        })
        .signers([worldKeypair])
        .rpc();

      // Verify world was created
      const worldAccount = await program.account.world.fetch(worldPubkey);
      console.log(worldAccount);
      expect(worldAccount.canonicalResolution).to.equal(WORLD_RESOLUTION);
      expect(worldAccount.authority).to.eql(payer.publicKey);

      return worldPubkey; // Return for use in other tests
    });


    it("Creates a trixel and its ancestors", async () => {
      // Define coordinates for a trixel at resolution 4
      coords = { ra: 45.0, dec: 0.0 };
      
      // Get trixel ID and PDAs
      const { trixelId, trixelPda, ancestorPDAs } = getTrixelAndAncestorPDAs(
        coords,
        WORLD_RESOLUTION,
        worldPubkey,
        program.programId
      );

      console.log({
        payer: payer.publicKey,
        world: worldPubkey,
        trixel: trixelPda,
        systemProgram: SystemProgram.programId,
      });
      // Create trixel and ancestors
      await program.methods
        .createTrixelAndAncestors({ id: new anchor.BN(trixelId) })
        .accountsStrict({
          payer: payer.publicKey,
          world: worldPubkey,
          trixel: trixelPda,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(
          ancestorPDAs.map(pda => ({
            pubkey: pda,
            isWritable: true,
            isSigner: false,
          }))
        )
        .rpc();
      
      // Verify the update
      const trixelAccount = await program.account.trixel.fetch(trixelPda);
      console.log(trixelAccount);

      // Verify ancestor updates
      for (const ancestorPda of ancestorPDAs) {
        const ancestorAccount = await program.account.trixel.fetch(ancestorPda);
        console.log(ancestorAccount);
      }

       // Verify world was created
       const worldAccount = await program.account.world.fetch(worldPubkey);
       console.log(worldAccount);
    });

    it("Update a trixel and its ancestors", async () => {
      
      // Get trixel ID and PDAs
      const { trixelId, trixelPda, ancestorPDAs } = getTrixelAndAncestorPDAs(
        coords,
        WORLD_RESOLUTION,
        worldPubkey,
        program.programId
      );
      // Update the trixel with some data
      const updateValue = 42;
      await program.methods
        .updateTrixel({ id: new anchor.BN(trixelId), value: updateValue, coords: null })
        .accountsStrict({
          payer: payer.publicKey,
          world: worldPubkey,
          trixel: trixelPda,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(
          ancestorPDAs.map(pda => ({
            pubkey: pda,
            isWritable: true,
            isSigner: false,
          }))
        )
        .rpc();

      // Verify the update
      const trixelAccount = await program.account.trixel.fetch(trixelPda);

      console.log(trixelAccount);
      expect(trixelAccount.data.aggregateOverwrite.metric.eq(new anchor.BN(updateValue))).is.true;

      // Verify ancestor updates
      for (const ancestorPda of ancestorPDAs) {
        const ancestorAccount = await program.account.trixel.fetch(ancestorPda);
        console.log(ancestorAccount);
      }
    });

    it("should handle Count type updates correctly", async () => {
      const worldKeypair = anchor.web3.Keypair.generate();
      const worldNameArray = Array.from(Buffer.from("Test World Count".padEnd(32, "\0")));

      const canonicalResolution = 5;
      const dataType = { count: {} }; 
      const permissionedUpdates = false;

      // 1. Create World
      await program.methods
        .createWorld({
          name: worldNameArray,
          canonicalResolution: canonicalResolution,
          dataType: dataType,
          permissionedUpdates: permissionedUpdates,
        })
        .accountsStrict({ // Not using accountsStrict here for now
          world: worldKeypair.publicKey,
          authority: provider.wallet.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId, // Ensure this name matches Rust struct (system_program)
        })
        .signers([worldKeypair])
        .rpc();

      let worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
      expect(worldAccount.canonicalResolution).to.equal(canonicalResolution);
      expect(worldAccount.permissionedUpdates).to.equal(permissionedUpdates);
      expect(worldAccount.data.hasOwnProperty("count")).is.true;
      // @ts-ignore 
      expect(worldAccount.data.count.count).to.equal(0);

      // 2. Create Trixel and Ancestors
      const targetTrixelIdBN = new anchor.BN(VALID_IDS_RESOLUTION_5[0]); // This will now be 211111
      // Assuming getTrixelPDA expects ID as number, world as PublicKey
      const targetTrixelPdaTuple = await getTrixelPDA(worldKeypair.publicKey, targetTrixelIdBN.toNumber(), program.programId);
      const targetTrixelPda = targetTrixelPdaTuple[0]; // Use the PublicKey part

      const ancestorIds = getTrixelAncestors(targetTrixelIdBN.toNumber());
      const ancestorAccountsMetas: AccountMeta[] = [];
      for (const ancestorIdNum of ancestorIds) {
        // Assuming getTrixelPDA expects ID as number, world as PublicKey
        const pdaTuple = await getTrixelPDA(worldKeypair.publicKey, new anchor.BN(ancestorIdNum).toNumber(), program.programId);
        ancestorAccountsMetas.push({ pubkey: pdaTuple[0], isSigner: false, isWritable: true }); // Use PublicKey part
      }

      await program.methods
        .createTrixelAndAncestors({ id: targetTrixelIdBN })
        .accountsStrict({
          world: worldKeypair.publicKey,
          trixel: targetTrixelPda, // Use the PublicKey
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId, // Ensure this name matches Rust struct
        })
        .remainingAccounts(ancestorAccountsMetas)
        .rpc();

      let trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
      expect(trixelAccount.id.eq(targetTrixelIdBN)).is.true;
      expect(trixelAccount.resolution).to.equal(canonicalResolution);
      expect(trixelAccount.data.hasOwnProperty("count")).is.true;
      // @ts-ignore 
      expect(trixelAccount.data.count.count).to.equal(0);

      // 3. Update Trixel - First Time
      const updateValue1 = 5; 
      const updateArgs1 = { id: targetTrixelIdBN, value: updateValue1, coords: null };

      await program.methods
        .updateTrixel(updateArgs1)
        .accountsStrict({
          world: worldKeypair.publicKey,
          trixel: targetTrixelPda, // Use the PublicKey
          payer: provider.wallet.publicKey, 
          systemProgram: SystemProgram.programId, // Ensure this name matches Rust struct
        })
        .remainingAccounts(ancestorAccountsMetas)
        .rpc();

      trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
      // @ts-ignore 
      expect(trixelAccount.data.count.count).to.equal(1);

      if (ancestorAccountsMetas.length > 0) {
        const firstAncestorAccount = await program.account.trixel.fetch(ancestorAccountsMetas[0].pubkey);
        // @ts-ignore 
        expect(firstAncestorAccount.data.count.count).to.equal(1);
      }

      worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
      // @ts-ignore 
      expect(worldAccount.data.count.count).to.equal(1);

      // 4. Update Trixel - Second Time
      const updateValue2 = 10; 
      const updateArgs2 = { id: targetTrixelIdBN, value: updateValue2, coords: null };

      await program.methods
        .updateTrixel(updateArgs2)
        .accountsStrict({ 
          world: worldKeypair.publicKey,
          trixel: targetTrixelPda, // Use the PublicKey
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId, // Ensure this name matches Rust struct
        })
        .remainingAccounts(ancestorAccountsMetas)
        .rpc();

      trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
      // @ts-ignore 
      expect(trixelAccount.data.count.count).to.equal(2);

      if (ancestorAccountsMetas.length > 0) {
        const firstAncestorAccount = await program.account.trixel.fetch(ancestorAccountsMetas[0].pubkey);
        // @ts-ignore 
        expect(firstAncestorAccount.data.count.count).to.equal(2);
      }
      worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
      // @ts-ignore 
      expect(worldAccount.data.count.count).to.equal(2);
    });

  });

  it("should handle AggregateOverwrite type updates correctly", async () => {
    const worldKeypair = anchor.web3.Keypair.generate();
    const worldNameArray = Array.from(Buffer.from("AggOverWorld".padEnd(32, "\0")));
    const canonicalResolution = 5;
    const dataType = { aggregateOverwrite: {} };
    const permissionedUpdates = false;

    // 1. Create World
    await program.methods
      .createWorld({
        name: worldNameArray,
        canonicalResolution: canonicalResolution,
        dataType: dataType,
        permissionedUpdates: permissionedUpdates,
      })
      .accountsStrict({
        world: worldKeypair.publicKey,
        authority: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([worldKeypair])
      .rpc();

    let worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.aggregateOverwrite.metric.toNumber()).to.equal(0);

    // 2. Create Trixel and Ancestors
    const targetTrixelIdBN = new anchor.BN(VALID_IDS_RESOLUTION_5[0]); // e.g., 211111
    const targetTrixelPdaTuple = await getTrixelPDA(worldKeypair.publicKey, targetTrixelIdBN.toNumber(), program.programId);
    const targetTrixelPda = targetTrixelPdaTuple[0];
    const ancestorIds = getTrixelAncestors(targetTrixelIdBN.toNumber());
    const ancestorAccountsMetas: AccountMeta[] = ancestorIds.map(id => ({
      pubkey: getTrixelPDA(worldKeypair.publicKey, new anchor.BN(id).toNumber(), program.programId)[0],
      isSigner: false,
      isWritable: true,
    })); 
    // The above map is synchronous, if getTrixelPDA was async, a for...of await loop would be needed.
    // For simplicity, assuming getTrixelPDA used here is synchronous or PDAs are pre-fetched if it were async.
    // Correcting if getTrixelPDA is async (which it usually is):
    const asyncAncestorAccountsMetas: AccountMeta[] = [];
    for (const id of ancestorIds) {
        const pdaTuple = await getTrixelPDA(worldKeypair.publicKey, new anchor.BN(id).toNumber(), program.programId);
        asyncAncestorAccountsMetas.push({ pubkey: pdaTuple[0], isSigner: false, isWritable: true });
    }

    await program.methods
      .createTrixelAndAncestors({ id: targetTrixelIdBN })
      .accountsStrict({
        world: worldKeypair.publicKey,
        trixel: targetTrixelPda,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(asyncAncestorAccountsMetas)
      .rpc();
    
    let trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.aggregateOverwrite.metric.toNumber()).to.equal(0);

    // 3. Update Trixel - First Time
    const updateValue1 = 50;
    await program.methods
      .updateTrixel({ id: targetTrixelIdBN, value: updateValue1, coords: null })
      .accountsStrict({
        world: worldKeypair.publicKey,
        trixel: targetTrixelPda,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(asyncAncestorAccountsMetas)
      .rpc();

    trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.aggregateOverwrite.metric.toNumber()).to.equal(updateValue1);
    if (asyncAncestorAccountsMetas.length > 0) {
      const firstAncestorAccount = await program.account.trixel.fetch(asyncAncestorAccountsMetas[0].pubkey);
      // @ts-ignore
      expect(firstAncestorAccount.data.aggregateOverwrite.metric.toNumber()).to.equal(updateValue1);
    }
    worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.aggregateOverwrite.metric.toNumber()).to.equal(updateValue1);

    // 4. Update Trixel - Second Time (Overwrite)
    const updateValue2 = 30;
    await program.methods
      .updateTrixel({ id: targetTrixelIdBN, value: updateValue2, coords: null })
      .accountsStrict({
        world: worldKeypair.publicKey,
        trixel: targetTrixelPda,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(asyncAncestorAccountsMetas)
      .rpc();

    trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.aggregateOverwrite.metric.toNumber()).to.equal(updateValue2);
    if (asyncAncestorAccountsMetas.length > 0) {
      const firstAncestorAccount = await program.account.trixel.fetch(asyncAncestorAccountsMetas[0].pubkey);
      // @ts-ignore
      expect(firstAncestorAccount.data.aggregateOverwrite.metric.toNumber()).to.equal(updateValue2);
    }
    worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.aggregateOverwrite.metric.toNumber()).to.equal(updateValue2);
  });

  it("should handle AggregateAccumulate type updates correctly", async () => {
    const worldKeypair = anchor.web3.Keypair.generate();
    const worldNameArray = Array.from(Buffer.from("AggAccWorld".padEnd(32, "\0")));
    const canonicalResolution = 5;
    const dataType = { aggregateAccumulate: {} };
    const permissionedUpdates = false;

    await program.methods
      .createWorld({ name: worldNameArray, canonicalResolution, dataType, permissionedUpdates })
      .accountsStrict({ world: worldKeypair.publicKey, authority: provider.wallet.publicKey, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .signers([worldKeypair]).rpc();
    let worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.aggregateAccumulate.metric.toNumber()).to.equal(0);

    const targetTrixelIdBN = new anchor.BN(VALID_IDS_RESOLUTION_5[0]);
    const targetTrixelPdaTuple = await getTrixelPDA(worldKeypair.publicKey, targetTrixelIdBN.toNumber(), program.programId);
    const targetTrixelPda = targetTrixelPdaTuple[0];
    const ancestorIds = getTrixelAncestors(targetTrixelIdBN.toNumber());
    const ancestorAccountsMetas: AccountMeta[] = [];
    for (const id of ancestorIds) {
        const pdaTuple = await getTrixelPDA(worldKeypair.publicKey, new anchor.BN(id).toNumber(), program.programId);
        ancestorAccountsMetas.push({ pubkey: pdaTuple[0], isSigner: false, isWritable: true });
    }

    await program.methods.createTrixelAndAncestors({ id: targetTrixelIdBN })
      .accountsStrict({ world: worldKeypair.publicKey, trixel: targetTrixelPda, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .remainingAccounts(ancestorAccountsMetas).rpc();
    let trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.aggregateAccumulate.metric.toNumber()).to.equal(0);

    const updateValue1 = 70;
    await program.methods.updateTrixel({ id: targetTrixelIdBN, value: updateValue1, coords: null })
      .accountsStrict({ world: worldKeypair.publicKey, trixel: targetTrixelPda, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .remainingAccounts(ancestorAccountsMetas).rpc();
    
    trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.aggregateAccumulate.metric.toNumber()).to.equal(updateValue1);
    if (ancestorAccountsMetas.length > 0) {
      const firstAncestorAccount = await program.account.trixel.fetch(ancestorAccountsMetas[0].pubkey);
      // @ts-ignore
      expect(firstAncestorAccount.data.aggregateAccumulate.metric.toNumber()).to.equal(updateValue1);
    }
    worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.aggregateAccumulate.metric.toNumber()).to.equal(updateValue1);

    const updateValue2 = -20;
    await program.methods.updateTrixel({ id: targetTrixelIdBN, value: updateValue2, coords: null })
      .accountsStrict({ world: worldKeypair.publicKey, trixel: targetTrixelPda, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .remainingAccounts(ancestorAccountsMetas).rpc();

    trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.aggregateAccumulate.metric.toNumber()).to.equal(updateValue1 + updateValue2);
    if (ancestorAccountsMetas.length > 0) {
      const firstAncestorAccount = await program.account.trixel.fetch(ancestorAccountsMetas[0].pubkey);
      // @ts-ignore
      expect(firstAncestorAccount.data.aggregateAccumulate.metric.toNumber()).to.equal(updateValue1 + updateValue2);
    }
    worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.aggregateAccumulate.metric.toNumber()).to.equal(updateValue1 + updateValue2);
  });

  it("should handle MeanOverwrite type updates correctly", async () => {
    const worldKeypair = anchor.web3.Keypair.generate();
    const worldNameArray = Array.from(Buffer.from("MeanOverWorld".padEnd(32, "\0")));
    const canonicalResolution = 5;
    const dataType = { meanOverwrite: {} };
    const permissionedUpdates = false;

    await program.methods
      .createWorld({ name: worldNameArray, canonicalResolution, dataType, permissionedUpdates })
      .accountsStrict({ world: worldKeypair.publicKey, authority: provider.wallet.publicKey, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .signers([worldKeypair]).rpc();
    let worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.meanOverwrite.numerator.toNumber()).to.equal(0);
    // @ts-ignore
    expect(worldAccount.data.meanOverwrite.denominator.toNumber()).to.equal(0);

    const targetTrixelIdBN = new anchor.BN(VALID_IDS_RESOLUTION_5[0]);
    const targetTrixelPdaTuple = await getTrixelPDA(worldKeypair.publicKey, targetTrixelIdBN.toNumber(), program.programId);
    const targetTrixelPda = targetTrixelPdaTuple[0];
    const ancestorIds = getTrixelAncestors(targetTrixelIdBN.toNumber());
    const ancestorAccountsMetas: AccountMeta[] = [];
    for (const id of ancestorIds) {
        const pdaTuple = await getTrixelPDA(worldKeypair.publicKey, new anchor.BN(id).toNumber(), program.programId);
        ancestorAccountsMetas.push({ pubkey: pdaTuple[0], isSigner: false, isWritable: true });
    }

    await program.methods.createTrixelAndAncestors({ id: targetTrixelIdBN })
      .accountsStrict({ world: worldKeypair.publicKey, trixel: targetTrixelPda, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .remainingAccounts(ancestorAccountsMetas).rpc();
    let trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.meanOverwrite.numerator.toNumber()).to.equal(0);
    // @ts-ignore
    expect(trixelAccount.data.meanOverwrite.denominator.toNumber()).to.equal(0);

    // Update 1
    const updateValue1 = 100;
    await program.methods.updateTrixel({ id: targetTrixelIdBN, value: updateValue1, coords: null })
      .accountsStrict({ world: worldKeypair.publicKey, trixel: targetTrixelPda, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .remainingAccounts(ancestorAccountsMetas).rpc();
    
    trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.meanOverwrite.numerator.toNumber()).to.equal(updateValue1);
    // @ts-ignore
    expect(trixelAccount.data.meanOverwrite.denominator.toNumber()).to.equal(1); // Denom becomes 1
    if (ancestorAccountsMetas.length > 0) {
      const firstAncestorAccount = await program.account.trixel.fetch(ancestorAccountsMetas[0].pubkey);
      // @ts-ignore
      expect(firstAncestorAccount.data.meanOverwrite.numerator.toNumber()).to.equal(updateValue1);
      // @ts-ignore
      expect(firstAncestorAccount.data.meanOverwrite.denominator.toNumber()).to.equal(1); // Activated
    }
    worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.meanOverwrite.numerator.toNumber()).to.equal(updateValue1);
    // @ts-ignore
    expect(worldAccount.data.meanOverwrite.denominator.toNumber()).to.equal(1); // Activated

    // Update 2 (Overwrite)
    const updateValue2 = 60;
    await program.methods.updateTrixel({ id: targetTrixelIdBN, value: updateValue2, coords: null })
      .accountsStrict({ world: worldKeypair.publicKey, trixel: targetTrixelPda, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .remainingAccounts(ancestorAccountsMetas).rpc();
    
    trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.meanOverwrite.numerator.toNumber()).to.equal(updateValue2);
    // @ts-ignore
    expect(trixelAccount.data.meanOverwrite.denominator.toNumber()).to.equal(1); // Stays 1
    if (ancestorAccountsMetas.length > 0) {
      const firstAncestorAccount = await program.account.trixel.fetch(ancestorAccountsMetas[0].pubkey);
      // @ts-ignore
      expect(firstAncestorAccount.data.meanOverwrite.numerator.toNumber()).to.equal(updateValue2); // Old (100) removed, New (60) added
      // @ts-ignore
      expect(firstAncestorAccount.data.meanOverwrite.denominator.toNumber()).to.equal(1); // Was already activated
    }
    worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.meanOverwrite.numerator.toNumber()).to.equal(updateValue2);
    // @ts-ignore
    expect(worldAccount.data.meanOverwrite.denominator.toNumber()).to.equal(1);
  });

  it("should handle MeanAccumulate type updates correctly", async () => {
    const worldKeypair = anchor.web3.Keypair.generate();
    const worldNameArray = Array.from(Buffer.from("MeanAccWorld".padEnd(32, "\0")));
    const canonicalResolution = 5;
    const dataType = { meanAccumulate: {} };
    const permissionedUpdates = false;

    await program.methods
      .createWorld({ name: worldNameArray, canonicalResolution, dataType, permissionedUpdates })
      .accountsStrict({ world: worldKeypair.publicKey, authority: provider.wallet.publicKey, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .signers([worldKeypair]).rpc();
    let worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.meanAccumulate.numerator.toNumber()).to.equal(0);
    // @ts-ignore
    expect(worldAccount.data.meanAccumulate.denominator.toNumber()).to.equal(0);

    const targetTrixelIdBN = new anchor.BN(VALID_IDS_RESOLUTION_5[0]);
    const targetTrixelPdaTuple = await getTrixelPDA(worldKeypair.publicKey, targetTrixelIdBN.toNumber(), program.programId);
    const targetTrixelPda = targetTrixelPdaTuple[0];
    const ancestorIds = getTrixelAncestors(targetTrixelIdBN.toNumber());
    const ancestorAccountsMetas: AccountMeta[] = [];
    for (const id of ancestorIds) {
        const pdaTuple = await getTrixelPDA(worldKeypair.publicKey, new anchor.BN(id).toNumber(), program.programId);
        ancestorAccountsMetas.push({ pubkey: pdaTuple[0], isSigner: false, isWritable: true });
    }

    await program.methods.createTrixelAndAncestors({ id: targetTrixelIdBN })
      .accountsStrict({ world: worldKeypair.publicKey, trixel: targetTrixelPda, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .remainingAccounts(ancestorAccountsMetas).rpc();
    let trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.meanAccumulate.numerator.toNumber()).to.equal(0);
    // @ts-ignore
    expect(trixelAccount.data.meanAccumulate.denominator.toNumber()).to.equal(0);

    // Update 1
    const updateValue1 = 100;
    await program.methods.updateTrixel({ id: targetTrixelIdBN, value: updateValue1, coords: null })
      .accountsStrict({ world: worldKeypair.publicKey, trixel: targetTrixelPda, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .remainingAccounts(ancestorAccountsMetas).rpc();
    
    trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.meanAccumulate.numerator.toNumber()).to.equal(updateValue1);
    // @ts-ignore
    expect(trixelAccount.data.meanAccumulate.denominator.toNumber()).to.equal(1);
    if (ancestorAccountsMetas.length > 0) {
      const firstAncestorAccount = await program.account.trixel.fetch(ancestorAccountsMetas[0].pubkey);
      // @ts-ignore
      expect(firstAncestorAccount.data.meanAccumulate.numerator.toNumber()).to.equal(updateValue1);
      // @ts-ignore
      expect(firstAncestorAccount.data.meanAccumulate.denominator.toNumber()).to.equal(1);
    }
    worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.meanAccumulate.numerator.toNumber()).to.equal(updateValue1);
    // @ts-ignore
    expect(worldAccount.data.meanAccumulate.denominator.toNumber()).to.equal(1);

    // Update 2 (Accumulate)
    const updateValue2 = -30;
    await program.methods.updateTrixel({ id: targetTrixelIdBN, value: updateValue2, coords: null })
      .accountsStrict({ world: worldKeypair.publicKey, trixel: targetTrixelPda, payer: provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .remainingAccounts(ancestorAccountsMetas).rpc();
    
    trixelAccount = await program.account.trixel.fetch(targetTrixelPda);
    // @ts-ignore
    expect(trixelAccount.data.meanAccumulate.numerator.toNumber()).to.equal(updateValue1 + updateValue2);
    // @ts-ignore
    expect(trixelAccount.data.meanAccumulate.denominator.toNumber()).to.equal(1); // Stays 1
    if (ancestorAccountsMetas.length > 0) {
      const firstAncestorAccount = await program.account.trixel.fetch(ancestorAccountsMetas[0].pubkey);
      // @ts-ignore
      expect(firstAncestorAccount.data.meanAccumulate.numerator.toNumber()).to.equal(updateValue1 + updateValue2);
      // @ts-ignore
      expect(firstAncestorAccount.data.meanAccumulate.denominator.toNumber()).to.equal(1); // Was already activated
    }
    worldAccount = await program.account.world.fetch(worldKeypair.publicKey);
    // @ts-ignore
    expect(worldAccount.data.meanAccumulate.numerator.toNumber()).to.equal(updateValue1 + updateValue2);
    // @ts-ignore
    expect(worldAccount.data.meanAccumulate.denominator.toNumber()).to.equal(1);
  });
});
