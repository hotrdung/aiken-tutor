import { mConStr0, stringToHex, outputReference } from "@meshsdk/common";
import { deserializeAddress, resolveScriptHash } from "@meshsdk/core";
import {
  getTxBuilder,
  sender_wallet,
  getScript,
} from "./common.mjs";

async function createGiftcard(amount) {
  const utxos = await sender_wallet.getUtxos();
  // console.log("utxos", utxos);

  const { pubKeyHash: ownerPubKeyHash } = deserializeAddress(
    sender_wallet.addresses.baseAddressBech32
  );

  // Ref: https://github.com/MeshJS/mesh/blob/main/packages/mesh-contract/src/giftcard/offchain.ts

  const tokenName = "PokeMONEY";

  // use outputReference for Plustus V2+V3
  const outRef = outputReference(utxos[0].input.txHash, utxos[0].input.outputIndex)
  
  // tokenName is also converted to Hex -> byteString
  const { scriptCbor, scriptAddr } = getScript(tokenName, outRef)
  const policyId = resolveScriptHash(scriptCbor, "V3");

  console.log("NFT mint input:", policyId, stringToHex(tokenName), utxos[0].input.txHash + "#" + utxos[0].input.outputIndex);

  const txBuilder = await getTxBuilder();
  await txBuilder
    .txIn(
      utxos[0].input.txHash,
      utxos[0].input.outputIndex,
    )
    .mintPlutusScriptV3()
    .mint("1", policyId, stringToHex(tokenName))
    .mintingScript(scriptCbor)
    .mintRedeemerValue(mConStr0([]), "Mesh")
    .txOut(scriptAddr, amount)
    .txInCollateral(utxos[0].input.txHash, utxos[0].input.outputIndex)
    .changeAddress(await sender_wallet.getChangeAddress())
    .requiredSignerHash(ownerPubKeyHash)
    .selectUtxosFrom(utxos)
    .complete();
  return txBuilder.txHex;
}

async function main() {
  try {
    const assets = [
      {
        unit: "lovelace",
        quantity: "22000000",
      },
    ];

    const unsignedTx = await createGiftcard(assets);

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


main();
