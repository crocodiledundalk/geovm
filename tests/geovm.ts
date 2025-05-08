import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Geovm } from "../target/types/geovm";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { getTrixelAndAncestorPDAs, getTrixelPDA, SphericalCoords } from "./utils";

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

      await program.methods
        .createWorld({
          maxResolution: WORLD_RESOLUTION,
          canonicalResolution: WORLD_RESOLUTION,
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
      expect(worldAccount.maxResolution).to.equal(WORLD_RESOLUTION);
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
        .updateTrixel({ id: new anchor.BN(trixelId), value: updateValue })
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
      expect(trixelAccount.data.toString()).to.equal(updateValue.toString());

      // Verify ancestor updates
      for (const ancestorPda of ancestorPDAs) {
        const ancestorAccount = await program.account.trixel.fetch(ancestorPda);
        console.log(ancestorAccount);
        // expect(ancestorAccount.data.toString()).to.equal(updateValue.toString());
      }
    });

    // it("Handles multiple updates correctly", async () => {
    //   const trixelId = 21;
    //   const [trixelPDA] = getTrixelPDA(worldPubkey, trixelId, program.programId);
    //   const [ancestorPDA] = getTrixelPDA(worldPubkey, 2, program.programId);

    //   // Create the trixel first
    //   await program.methods
    //     .createTrixelAndAncestors({ id: new anchor.BN(trixelId) })
    //     .accountsStrict({
    //       payer: payer.publicKey,
    //       world: worldPubkey,
    //       trixel: trixelPDA,
    //       systemProgram: SystemProgram.programId,
    //     })
    //     .remainingAccounts([
    //       { pubkey: ancestorPDA, isWritable: true, isSigner: false },
    //     ])
    //     .rpc();

    //   // Update multiple times
    //   const updates = [100, 50, -30];
    //   for (const value of updates) {
    //     await program.methods
    //       .updateTrixel({
    //         id: new anchor.BN(trixelId),
    //         value: value,
    //       })
    //       .accountsStrict({
    //         payer: payer.publicKey,
    //         world: worldPubkey,
    //         trixel: trixelPDA,
    //         systemProgram: SystemProgram.programId,
    //       })
    //       .remainingAccounts([
    //         { pubkey: ancestorPDA, isWritable: true, isSigner: false },
    //       ])
    //       .rpc();
    //   }

    //   // Verify final values
    //   const trixelAccount = await program.account.trixel.fetch(trixelPDA);
    //   expect(trixelAccount.data.toString()).to.equal("120"); // 100 + 50 - 30

    //   const ancestorAccount = await program.account.trixel.fetch(ancestorPDA);
    //   expect(ancestorAccount.data.toString()).to.equal("120");
    // });

    // it("Fails with invalid ancestor account", async () => {
    //   const trixelId = 21;
    //   const [trixelPDA] = getTrixelPDA(worldPubkey, trixelId, program.programId);
      
    //   // Create a random PDA that's not the correct ancestor
    //   const [wrongPDA] = await PublicKey.findProgramAddress(
    //     [Buffer.from("wrong")],
    //     program.programId
    //   );

    //   // Create the trixel first
    //   await program.methods
    //     .createTrixelAndAncestors({ id: new anchor.BN(trixelId) })
    //     .accountsStrict({
    //       payer: payer.publicKey,
    //       world: worldPubkey,
    //       trixel: trixelPDA,
    //       systemProgram: SystemProgram.programId,
    //     })
    //     .remainingAccounts([
    //       { pubkey: wrongPDA, isWritable: true, isSigner: false },
    //     ])
    //     .rpc();

    //   // Try to update with wrong ancestor
    //   try {
    //     await program.methods
    //       .updateTrixel({
    //         id: new anchor.BN(trixelId),
    //         value: 100,
    //       })
    //       .accountsStrict({
    //         payer: payer.publicKey,
    //         world: worldPubkey,
    //         trixel: trixelPDA,
    //         systemProgram: SystemProgram.programId,
    //       })
    //       .remainingAccounts([
    //         { pubkey: wrongPDA, isWritable: true, isSigner: false },
    //       ])
    //       .rpc();
    //     expect.fail("Should have failed with invalid ancestor");
    //   } catch (e) {
    //     expect(e.toString()).to.include("InvalidTrixelAccount");
    //   }
    // });
  });
});
