import fs from 'node:fs';
import {
  MeshWallet,
} from "@meshsdk/core";
 
 
// Generate a secret key for the owner wallet and beneficiary wallet
const owner_secret_key = MeshWallet.brew(true);
const beneficiary_secret_key = MeshWallet.brew(true);
 
//Save secret keys to files
fs.writeFileSync('owner.sk', owner_secret_key);
fs.writeFileSync('beneficiary.sk', beneficiary_secret_key);
 
const owner_wallet = new MeshWallet({
  networkId: 0,
  key: {
    type: 'root',
    bech32: owner_secret_key,
  },
});
 
const beneficiary_wallet = new MeshWallet({
  networkId: 0,
  key: {
    type: 'root',
    bech32: beneficiary_secret_key,
  },
});
 
const owner_addr = await owner_wallet.getUnusedAddresses();
console.log("owner_addr", owner_addr[0]);
fs.writeFileSync('owner.addr', owner_addr[0]);

const beneficiary_addr = await beneficiary_wallet.getUnusedAddresses();
console.log("beneficiary_addr", beneficiary_addr[0]);
fs.writeFileSync('beneficiary.addr', beneficiary_addr[0]);
