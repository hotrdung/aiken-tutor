import { MeshTxBuilder } from "@meshsdk/core";
import {
  bfProvider,
  redeemer_wallet,
  getTxBuilder,
} from "./common.ts";
import { TxParser } from "@meshsdk/core";
import { CSLSerializer } from "@meshsdk/core-csl";

const fetcher = bfProvider;
const serializer = new CSLSerializer();
const txParser = new TxParser(serializer, fetcher);

async function main() {
  try {
    const policyId = "cbdcf78cf6b6e5857b02c8e425f5b388f9b086fed3648dcd5bc1d968";
    const tokenNameHex = "706f6b656d6f6e6579";

    await redeemer_wallet.init();  // must be invoked before getting addr
    const redeemerAddress = redeemer_wallet.addresses.baseAddressBech32;

    const utxos = await redeemer_wallet.getUtxos();
    console.log("utxos:", utxos);

    const txCborHex = "84a400d901028182582025580c2dcff5b504049bb2ee4701c5e7239125eeda949242fb3988bbc40c271f000182825839003625dbedbaef38678e1337590951a2cfd4f47a619bb0397532567eb50413b811a2bcba05a52d326b76ba481b9a27265daaf56a11faa26aca821a00989680a1581ccbdcf78cf6b6e5857b02c8e425f5b388f9b086fed3648dcd5bc1d968a149706f6b656d6f6e65790a825839003625dbedbaef38678e1337590951a2cfd4f47a619bb0397532567eb50413b811a2bcba05a52d326b76ba481b9a27265daaf56a11faa26aca1a00e22a47021a0002b77909a1581ccbdcf78cf6b6e5857b02c8e425f5b388f9b086fed3648dcd5bc1d968a149706f6b656d6f6e65790aa101d90102818200581cdd7a91e04ae00a35a0ae2852677c13fb03b0806f30d1cd47860fa07cf5f6";

    const txBuilderBody = await txParser.parse(txCborHex);
    console.log("txBuilderBody", JSON.stringify(txBuilderBody, null, 2));

    txBuilderBody.inputs.splice(0, 1);
    txBuilderBody.outputs.splice(1, 1);
    console.log("txBuilderBody (removed input)", JSON.stringify(txBuilderBody, null, 2));

    const txBuilder = await getTxBuilder();
    txBuilder.meshTxBuilderBody = txBuilderBody;
    const unsignedTx = await txBuilder
    // .setFee("179713")
    // .completeUnbalanced()
      .selectUtxosFrom(utxos)
      .changeAddress(redeemerAddress!)
      .complete();

    // const unsignedTx = txBuilder.txHex;
    console.log("unsignedTx:", unsignedTx);

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
