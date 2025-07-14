import { mConStr1, stringToHex, outputReference } from "@meshsdk/common";
import { resolveScriptHash } from "@meshsdk/core";
import {
  bfProvider,
  getTxBuilder,
  redeemer_wallet,
  getScript,
} from "./common.mjs";

async function redeemGiftCard(giftCardUtxo) {
  const utxos = await redeemer_wallet.getUtxos();
  console.log("utxos", utxos);

  // Ref: https://github.com/MeshJS/mesh/blob/main/packages/mesh-contract/src/giftcard/offchain.ts

  // IMPORTANT: this must be the outRef that used to mint the NFT
  const outRef = outputReference("381933bda6d81e5e6e3e3011afe38f1f3a146a884ea557142c5ba7f9e80ee95b", 0);

  const tokenName = "PokeMONEY";
  const { scriptCbor, scriptAddr } = getScript(tokenName, outRef)
  const policyId = resolveScriptHash(scriptCbor, "V3");

  const txBuilder = await getTxBuilder();
  await txBuilder
    .spendingPlutusScriptV3()
    .txIn(
      giftCardUtxo.input.txHash,
      giftCardUtxo.input.outputIndex,
      giftCardUtxo.output.amount,
      giftCardUtxo.output.address,
    )
    .spendingReferenceTxInInlineDatumPresent()
    .spendingReferenceTxInRedeemerValue("")
    .txInScript(scriptCbor)
    .txIn(
      utxos[1].input.txHash,
      utxos[1].input.outputIndex,
      // utxos[0].output.amount,
      // utxos[0].output.address,
    )
    .mintPlutusScriptV3()
    .mint("-1", policyId, stringToHex(tokenName))
    .mintingScript(scriptCbor)
    .mintRedeemerValue(mConStr1([]), "Mesh")
    .changeAddress(await redeemer_wallet.getChangeAddress())
    .txInCollateral(
      utxos[0].input.txHash,
      utxos[0].input.outputIndex,
      // utxos[0].output.amount,
      // utxos[0].output.address,
    )
    .setTotalCollateral("2000000")  // this tell TxBuilder to add "return collateral",
    // because the collateral UTxO contains both ADA and the NFT
    // error if not:
    // An error occurred: {
    //   code: 3133,
    //   message: "One of the input provided as collateral carries something else than Ada tokens. Only Ada can be used as collateral. Since the Babbage era, you also have the option to set a 'collateral return' or 'collateral change' output in order to send the surplus non-Ada tokens to it. Regardless, the field 'data.unsuitableCollateralValue' indicates the actual collateral value found by the ledger",
    //   data: {
    //     unsuitableCollateralValue: {
    //       ada: [Object],
    //       a533d5c0abd700955c18cb4a8e1c4ed4ec884fa4c0dbd698821ba2d9: [Object]
    //     }
    //   }
    // }
    // .setCollateralReturnAddress(await redeemer_wallet.getChangeAddress())  // use changeAddress if omitted
    .selectUtxosFrom(utxos)
    .complete();
  return txBuilder.txHex;
};

async function main() {
  try {
    const txHashFromDesposit = "5ab0f69899adca7496deb4ac881b9ebfb87f456dc584fcd685471cf1bfd62b53"

    const giftCardUTxO = await getUtxoByTxHash(txHashFromDesposit);
    if (giftCardUTxO === undefined) throw new Error("UTxO not found");
    console.log("giftCardUTxO", giftCardUTxO);

    const unsignedTx = await redeemGiftCard(giftCardUTxO);

    const signedTx = await redeemer_wallet.signTx(unsignedTx);
    console.log("signedTx", signedTx);

    const txHash = await redeemer_wallet.submitTx(signedTx);

    //Copy this txHash. You will need this hash in vesting_unlock.mjs
    console.log("txHash", txHash);

  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1); // Exit with an error code
  }
}

async function getUtxoByTxHash(txHash) {
  const utxos = await bfProvider.fetchUTxOs(txHash);
  if (utxos.length === 0) {
    throw new Error("UTxO not found");
  }
  return utxos[0];
}


main();
