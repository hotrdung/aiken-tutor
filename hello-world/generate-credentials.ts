import { MeshWallet } from "@meshsdk/core";
import fs from "node:fs";
 
async function main() {
  const secret_key = MeshWallet.brew(true) as string;
 
  fs.writeFileSync("me-mesh.sk", secret_key);
 
  const wallet = new MeshWallet({
    networkId: 0,
    key: {
      type: "root",
      bech32: secret_key,
    },
  });
 
  fs.writeFileSync("me-mesh.addr", (await wallet.getUnusedAddresses())[0]);
}
 
main();

// run by `npx tsx generate-credentials.ts`
