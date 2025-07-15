import {
  ConStr0,
  mConStr0,
  MeshValue,
  PubKeyAddress,
  UTxO,
  Value,
} from "@meshsdk/common";
import {
  deserializeDatum,
  serializeAddressObj,
  deserializeAddress,
} from "@meshsdk/core";
import {
  bfProvider,
  getTxBuilder,
  sender_wallet,
  getScript,
  getWalletInfoForTx,
} from "./common.js";

export type SwapDatum = ConStr0<[PubKeyAddress, Value, Value]>;

async function cancelSwap(swapUtxo: UTxO): Promise<string> {
  const { utxos, walletAddress, collateral } =
    await getWalletInfoForTx(sender_wallet);

  const inlineDatum = deserializeDatum<SwapDatum>(
    swapUtxo.output.plutusData!,
  );

  const initiatorAddress = serializeAddressObj(
    inlineDatum.fields[0],
    0,  // testnet
  );
  // const initiatorToReceive = inlineDatum.fields[2];

  const { scriptCbor, scriptAddr } = getScript()

  const txBuilder = await getTxBuilder();
  await txBuilder
    .spendingPlutusScript("V3")
    .txIn(
      swapUtxo.input.txHash,
      swapUtxo.input.outputIndex,
      swapUtxo.output.amount,
      swapUtxo.output.address,
    )
    .spendingReferenceTxInInlineDatumPresent()
    .spendingReferenceTxInRedeemerValue(mConStr0([]))  // redeemer #0 Cancel
    .txInScript(scriptCbor)
    // .txOut(
    //   initiatorAddress,
    //   MeshValue.fromValue(initiatorToReceive).toAssets(),
    // )
    .changeAddress(walletAddress)
    .txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address,
    )
    .requiredSignerHash(deserializeAddress(initiatorAddress).pubKeyHash)
    .selectUtxosFrom(utxos)
    .complete();

  return txBuilder.txHex;
};

async function getUtxoByTxHash(txHash) {
  const utxos = await bfProvider.fetchUTxOs(txHash);
  if (utxos.length === 0) {
    throw new Error("UTxO not found");
  }
  return utxos[0];
}

async function main() {
  try {
    const initSwapTxHash = "96d190ba339039739c30431555c27cd39b894e2f3b22c558d9a8e7dacf166737"

    const swapUTxO = await getUtxoByTxHash(initSwapTxHash)

    const unsignedTx = await cancelSwap(swapUTxO);

    const signedTx = await sender_wallet.signTx(unsignedTx);
    console.log("signedTx", signedTx);

    const txHash = await sender_wallet.submitTx(signedTx);
    console.log("txHash", txHash);

  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1); // Exit with an error code
  }
}

main();
