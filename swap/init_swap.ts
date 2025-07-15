import {
  Asset,
  conStr0,
  ConStr0,
  mConStr0,
  mConStr1,
  MeshValue,
  pubKeyAddress,
  PubKeyAddress,
  UTxO,
  value,
  Value,
  outputReference,
} from "@meshsdk/common";
import {
  deserializeAddress,
  deserializeDatum,
  serializeAddressObj,
  resolveScriptHash,
} from "@meshsdk/core";
import {
  getTxBuilder,
  sender_wallet,
  getWalletInfoForTx,
  getScript,
} from "./common.js";

export type SwapDatum = ConStr0<[PubKeyAddress, Value, Value]>;

async function initSwap(
  toProvide: Asset[],
  toReceive: Asset[],
) {
  const { utxos, walletAddress, collateral } =
      await getWalletInfoForTx(sender_wallet);

  const { pubKeyHash, stakeCredentialHash } = deserializeAddress(walletAddress);

  // Ref: https://github.com/MeshJS/mesh/blob/main/packages/mesh-contract/src/giftcard/offchain.ts

  // tokenName is also converted to Hex -> byteString
  const { scriptCbor, scriptAddr } = getScript()

  const swapDatum: SwapDatum = conStr0([
    pubKeyAddress(pubKeyHash, stakeCredentialHash),
    value(toProvide),
    value(toReceive),
  ]);

  const txBuilder = await getTxBuilder();
  await txBuilder
    .txOut(scriptAddr, toProvide)  // addr_test1wq4jn4668gs4mfd0ahdv4e9dqc97we54qhxdtvv598p204qkymsgn
    .txOutInlineDatumValue(swapDatum, "JSON")
    .changeAddress(walletAddress)
    .txInCollateral(
      utxos[0].input.txHash,
      utxos[0].input.outputIndex,
      utxos[0].output.amount,
      utxos[0].output.address
    )
    .selectUtxosFrom(utxos)
    .complete();
  
    return txBuilder.txHex;
}

async function main() {
  try {
    const toProvide: Asset[] = [
      {
        unit: "lovelace",
        quantity: "22000000",
      },
    ];

    // mintPolicyId: cbdcf78cf6b6e5857b02c8e425f5b388f9b086fed3648dcd5bc1d968
    // tokenNameHex: 706f6b656d6f6e6579
    const toReceive: Asset[] = [
      {
        unit: "cbdcf78cf6b6e5857b02c8e425f5b388f9b086fed3648dcd5bc1d968706f6b656d6f6e6579",
        quantity: "10",
      },
    ];

    const unsignedTx = await initSwap(toProvide, toReceive);

    const signedTx = await sender_wallet.signTx(unsignedTx);
    console.log("signedTx", signedTx);

    const txHash = await sender_wallet.submitTx(signedTx);
    console.log("txHash", txHash);
    // addr_test1wq4jn4668gs4mfd0ahdv4e9dqc97we54qhxdtvv598p204qkymsgn

  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1); // Exit with an error code
  }
}

main();
