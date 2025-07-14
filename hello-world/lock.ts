import { Asset, deserializeAddress, mConStr0 } from "@meshsdk/core";
import { getScript, getTxBuilder, wallet } from "./common";
 
async function main() {
  // these are the assets we want to lock into the contract
  const assets: Asset[] = [
    {
      unit: "lovelace",
      quantity: "3300000",
    },
  ];
 
  // get utxo and wallet address
  const utxos = await wallet.getUtxos("enterprise");
  // const walletAddress = (await wallet.getUsedAddresses())[0];
  const walletAddress = (await wallet.getAddresses()).enterpriseAddressBech32!;
 
  const { scriptAddr } = getScript();
 
  // hash of the public key of the wallet, to be used in the datum
  const signerHash = deserializeAddress(walletAddress).pubKeyHash;
 
  // build transaction with MeshTxBuilder
  const txBuilder = await getTxBuilder();
  await txBuilder
    // .setNetwork("preview")
    .txOut(scriptAddr, assets) // send assets to the script address
    .txOutInlineDatumValue(mConStr0([signerHash]))
    // .txOutDatumHashValue(mConStr0([signerHash])) // provide the datum where `"constructor": 0`
    .changeAddress(walletAddress) // send change back to the wallet address
    .selectUtxosFrom(utxos)
    .complete();
  const unsignedTx = txBuilder.txHex;
 
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`1 tADA locked into the contract at Tx ID: ${txHash}`);
}

main();

// run by `npx tsx lock.ts`
