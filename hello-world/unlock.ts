import {
  deserializeAddress,
  mConStr0,
  stringToHex,
} from "@meshsdk/core";
import { getScript, getPParams, getTxBuilder, getUtxoByTxHash, wallet } from "./common";

async function main() {
  try {
    // wallet.


    // get utxo, collateral and address from wallet
    const utxos = await wallet.getUtxos("enterprise");
    console.log("utxos:", utxos);
    // const walletAddress = (await wallet.getUsedAddresses())[0];
    const walletAddress = (await wallet.getAddresses()).enterpriseAddressBech32!;
    //   console.log("walletAddress:", walletAddress);
    const collateral = (await wallet.getCollateral("enterprise"))[0];
    //   console.log("collateral:", collateral);

    const { scriptCbor } = getScript();
    //   console.log("scriptCbor:", scriptCbor);

    // hash of the public key of the wallet, to be used in the datum
    const signerHash = deserializeAddress(walletAddress).pubKeyHash;
    // redeemer value to unlock the funds
    const message = "Hello from Pokemony!";

    // get the utxo from the script address of the locked funds
    const txHashFromDesposit = process.argv[2];
    //   console.log("txHashFromDesposit:", txHashFromDesposit);
    const scriptUtxo = await getUtxoByTxHash(txHashFromDesposit);
    console.log("scriptUtxo:", scriptUtxo);

    // build transaction with MeshTxBuilder
    const txBuilder = await getTxBuilder();

    // const pp = await getPParams();
    // await txBuilder
    //   .protocolParams(pp)
    //   .spendingPlutusScript("V3") // we used plutus v3
    //   .txIn( // spend the utxo from the script address
    //     scriptUtxo.input.txHash,
    //     scriptUtxo.input.outputIndex,
    //   //   scriptUtxo.output.amount,
    //   //   scriptUtxo.output.address
    //   )
    //   .txInScript(scriptCbor)
    //   .txInRedeemerValue(
    //     mConStr0([stringToHex(message)]),  // provide the required redeemer value `Hello, World!`
    //     // "Mesh",
    //     // {
    //     //   mem: 30000,
    //     //   steps: 9000000,
    //     // },
    //   )
    //   .txInInlineDatumPresent()
    //   // .txInDatumValue(mConStr0([signerHash])) // only the owner of the wallet can unlock the funds
    //   .txIn( // spend the utxo from the wallet address
    //     utxos[0].input.txHash,
    //     utxos[0].input.outputIndex,
    //   //   utxos[0].output.amount,
    //   //   utxos[0].output.address
    //   )
    //   .requiredSignerHash(signerHash)
    //   .changeAddress(walletAddress)
    //   .txInCollateral(
    //     collateral.input.txHash,
    //     collateral.input.outputIndex,
    //     collateral.output.amount,
    //     collateral.output.address
    //   )
    //   // .selectUtxosFrom(utxos)
    //   .complete();

    const pp = await getPParams();
    console.log("pp:", pp);
    await txBuilder
      .protocolParams(pp)
      // .setNetwork("testnet")
      // .setNetwork("preview")
      .spendingPlutusScript("V3") // we used plutus v3
      .txIn( // spend the utxo from the script address
        scriptUtxo.input.txHash,
        scriptUtxo.input.outputIndex,
        // scriptUtxo.output.amount,
        // scriptUtxo.output.address
      )
      .txInScript(scriptCbor)
      .txInRedeemerValue(mConStr0([stringToHex(message)])) // provide the required redeemer value `Hello, World!`
      // .txInDatumValue(mConStr0([signerHash])) // only the owner of the wallet can unlock the funds
      .txInInlineDatumPresent()
      // .txIn( // spend the utxo from the wallet address
      //   utxos[0].input.txHash,
      //   utxos[0].input.outputIndex,
      //   //   utxos[0].output.amount,
      //   //   utxos[0].output.address
      // )
      .requiredSignerHash(signerHash)
      .changeAddress(walletAddress)
      .txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        // collateral.output.amount,
        // collateral.output.address
      )
      .selectUtxosFrom(utxos)
      .changeAddress(walletAddress)
      // .setFee("202097")
      .complete();


    const unsignedTx = txBuilder.txHex;
    console.log("unsignedTx:", unsignedTx);

    const signedTx = await wallet.signTx(unsignedTx);
    console.log("signedTx:", signedTx);

    const txHash = await wallet.submitTx(signedTx);
    console.log(`1 tADA unlocked from the contract at Tx ID: ${txHash}`);

  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1); // Exit with an error code
  }
}

main();

// run by `npx tsx unlock.ts <lock-tx-hash>`
