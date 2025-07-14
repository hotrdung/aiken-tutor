import {
  deserializeAddress,
  deserializeDatum,
  unixTimeToEnclosingSlot,
  SLOT_CONFIG_NETWORK,
  mConStr0,
  stringToHex,
} from "@meshsdk/core";

import {
  getTxBuilder,
  beneficiary_wallet,
  scriptAddr,
  scriptCbor,
  bfProvider,
  getPParams,
} from "./common.mjs";

async function withdrawFundTx(vestingUtxo) {
  const utxos = await beneficiary_wallet.getUtxos();
  // console.log("utxos", utxos);

  const beneficiaryAddress = beneficiary_wallet.addresses.baseAddressBech32;
  const collateral = await beneficiary_wallet.getCollateral();
  const collateralInput = collateral[0].input;
  const collateralOutput = collateral[0].output;

  const { pubKeyHash: beneficiaryPubKeyHash } = deserializeAddress(
    beneficiary_wallet.addresses.baseAddressBech32
  );

  const datum = deserializeDatum(vestingUtxo.output.plutusData);

  const invalidBefore =
    unixTimeToEnclosingSlot(
      // Math.min(Number(datum.fields[0].int), Date.now() - 19000),
      // SLOT_CONFIG_NETWORK.preview
      Math.min(Number(datum.fields[0].int), Date.now() - 19000),
      SLOT_CONFIG_NETWORK.testnet
    ) + 1;

  const txBuilder = await getTxBuilder();
  await txBuilder
    .spendingPlutusScript("V3")
    .txIn(
      vestingUtxo.input.txHash,
      vestingUtxo.input.outputIndex,
      vestingUtxo.output.amount,
      scriptAddr
    )
    // .spendingReferenceTxInInlineDatumPresent()
    // .spendingReferenceTxInRedeemerValue(mConStr0([]))
    .txInScript(scriptCbor)
    .txInInlineDatumPresent()
    .txInRedeemerValue(mConStr0([stringToHex("")]), "Mesh")
    .txOut(beneficiaryAddress, [])
    .txInCollateral(
      collateralInput.txHash,
      collateralInput.outputIndex,
      collateralOutput.amount,
      collateralOutput.address
    )
    .invalidBefore(invalidBefore)
    .requiredSignerHash(beneficiaryPubKeyHash)
    .changeAddress(beneficiaryAddress)
    .selectUtxosFrom(utxos)
    .complete();
  return txBuilder.txHex;
}

async function main() {
  const txHashFromDesposit =
    //This is the hash that we generated in the locking file when we submitted the transaction.
    "ffcc0e039a7992e5864ec141a432cdbeda277d0c9075bcabf439f5433362c72a";

  try {
    const utxo = await getUtxoByTxHash(txHashFromDesposit);
    if (utxo === undefined) throw new Error("UTxO not found");
    // console.log("vesting utxo", utxo);

    const unsignedTx = await withdrawFundTx(utxo);

    const signedTx = await beneficiary_wallet.signTx(unsignedTx);
    console.log("signedTx", signedTx);

    const txHash = await beneficiary_wallet.submitTx(signedTx);
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
