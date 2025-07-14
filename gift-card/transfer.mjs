import { mConStr1, stringToHex, outputReference } from "@meshsdk/common";
import { resolveScriptHash } from "@meshsdk/core";
import {
  bfProvider,
  getTxBuilder,
  sender_wallet,
  redeemer_wallet,
  getScript,
} from "./common.mjs";

async function main() {
  try {
    const txHashFromDesposit = "5ab0f69899adca7496deb4ac881b9ebfb87f456dc584fcd685471cf1bfd62b53"

    const giftCardUTxO = await getUtxoByTxHash(txHashFromDesposit);
    if (giftCardUTxO === undefined) throw new Error("UTxO not found");
    console.log("giftCardUTxO", giftCardUTxO);

    const utxos = await sender_wallet.getUtxos();
    console.log("utxos", utxos);

    const tokenName = "PokeMONEY";
    // IMPORTANT: this must be the outRef that used to mint the NFT
    const outRef = outputReference("381933bda6d81e5e6e3e3011afe38f1f3a146a884ea557142c5ba7f9e80ee95b", 0);
    const { scriptCbor, scriptAddr } = getScript(tokenName, outRef)
    const policyId = resolveScriptHash(scriptCbor, "V3");

    await redeemer_wallet.init();  // must be invoked before getting addr
    const redeemerAddress = redeemer_wallet.addresses.baseAddressBech32;

    const txBuilder = await getTxBuilder();
    await txBuilder
      .txIn(
        utxos[0].input.txHash,
        utxos[0].input.outputIndex,
        utxos[0].output.amount,
        utxos[0].output.address,
      )
      .changeAddress(await sender_wallet.getChangeAddress())
      .txOut(
        redeemerAddress,
        [
          {
            unit: policyId + stringToHex(tokenName),
            quantity: 1,
          }
        ]
      )
      .selectUtxosFrom(utxos)
      .complete();

    const unsignedTx = txBuilder.txHex;
    const signedTx = await sender_wallet.signTx(unsignedTx);
    console.log("signedTx", signedTx);

    const txHash = await sender_wallet.submitTx(signedTx);

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
