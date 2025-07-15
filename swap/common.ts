import 'dotenv/config';
import {
  IWallet,
  MeshWallet,
  BlockfrostProvider,
  MeshTxBuilder,
  serializePlutusScript,
  OgmiosProvider,
  SLOT_CONFIG_NETWORK,
  builtinByteString,
  UTxO,
} from "@meshsdk/core";
import { stringToHex } from "@meshsdk/common";
import { applyParamsToScript } from "@meshsdk/core-csl";
import fs, { read } from 'fs';
import blueprint from "./plutus.json";


export const bfProvider = new BlockfrostProvider(process.env.BLOCKFROST_API!);

export const ogmProvider = new OgmiosProvider(process.env.OGMIOS_API!);

export const sender_wallet = new MeshWallet({
  networkId: 0,
  fetcher: bfProvider,
  submitter: ogmProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("sender.sk").toString(),
  },
});

export const redeemer_wallet = new MeshWallet({
  networkId: 0,
  fetcher: bfProvider,
  submitter: ogmProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("redeemer.sk").toString(),
  },
});

export const getWalletCollateral = async (wallet?: IWallet): Promise<UTxO | undefined> => {
  if (wallet) {
    const utxos = await wallet.getCollateral();
    return utxos[0];
  }
  return undefined;
};

export const getWalletDappAddress = async (wallet?: IWallet) => {
  if (wallet) {
    const usedAddresses = await wallet.getUsedAddresses();
    if (usedAddresses.length > 0) {
      return usedAddresses[0];
    }
    const unusedAddresses = await wallet.getUnusedAddresses();
    if (unusedAddresses.length > 0) {
      return unusedAddresses[0];
    }
  }
  return "";
};

export const getWalletInfoForTx = async (wallet?: IWallet) => {
  const utxos = await wallet?.getUtxos();
  const collateral = await getWalletCollateral(wallet);
  const walletAddress = await getWalletDappAddress(wallet);
  if (!utxos || utxos?.length === 0) {
    throw new Error("No utxos found");
  }
  if (!collateral) {
    throw new Error("No collateral found");
  }
  if (!walletAddress) {
    throw new Error("No wallet address found");
  }
  return { utxos, collateral, walletAddress };
};

export async function getTxBuilder() {
  const pp = await getPParams();
  return new MeshTxBuilder({
    fetcher: bfProvider,
    evaluator: ogmProvider,
    submitter: ogmProvider,
    params: pp,
    verbose: true, // <-- you can remove this if you dont want to see logs
  });
}

export function getScript() {
  const scriptCbor = applyParamsToScript(
    blueprint.validators[0].compiledCode,
    [],
    "JSON",
  );
  const scriptAddr = serializePlutusScript(
    { code: scriptCbor, version: "V3" },
    undefined,
    0
  ).address
  return { scriptCbor, scriptAddr };
}

export async function getPParams() {
  const pp = await bfProvider.fetchProtocolParameters();
  return pp;
}

SLOT_CONFIG_NETWORK.testnet = {
  zeroTime: 1751960996000,
  zeroSlot: 0,
  slotLength: 500,
  startEpoch: 0,
  epochLength: 300
}
