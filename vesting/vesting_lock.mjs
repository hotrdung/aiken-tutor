import { mConStr0 } from "@meshsdk/common";
import { deserializeAddress } from "@meshsdk/core";
import {
  getTxBuilder,
  owner_wallet,
  beneficiary_wallet,
  scriptAddr,
} from "./common.mjs";

async function depositFundTx(amount, lockUntilTimeStampMs) {
  const utxos = await owner_wallet.getUtxos();
  // console.log("utxos", utxos);

  await beneficiary_wallet.init();

  const { pubKeyHash: ownerPubKeyHash } = deserializeAddress(
    owner_wallet.addresses.baseAddressBech32
  );
  const { pubKeyHash: beneficiaryPubKeyHash } = deserializeAddress(
    beneficiary_wallet.addresses.baseAddressBech32
  );

  const txBuilder = await getTxBuilder();
  await txBuilder
    .txOut(scriptAddr, amount)
    .txOutInlineDatumValue(
      mConStr0([lockUntilTimeStampMs, ownerPubKeyHash, beneficiaryPubKeyHash])
    )
    .changeAddress(await owner_wallet.getChangeAddress())
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
        quantity: "3000000",
      },
    ];

    const lockUntilTimeStamp = new Date();
    lockUntilTimeStamp.setSeconds(lockUntilTimeStamp.getSeconds() + 60 / (1 / 0.5));

    const unsignedTx = await depositFundTx(assets, lockUntilTimeStamp.getTime());

    const signedTx = await owner_wallet.signTx(unsignedTx);
    console.log("signedTx", signedTx);

    const txHash = await owner_wallet.submitTx(signedTx);

    //Copy this txHash. You will need this hash in vesting_unlock.mjs
    console.log("txHash", txHash);

  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1); // Exit with an error code
  }
}


main();
