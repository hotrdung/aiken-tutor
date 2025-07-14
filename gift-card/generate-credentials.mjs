import fs from 'node:fs';
import {
  MeshWallet,
} from "@meshsdk/core";
 
 
// Generate a secret key for the sender wallet and redeemer wallet
const sender_skey = MeshWallet.brew(true);
const redeemer_skey = MeshWallet.brew(true);
 
//Save secret keys to files
fs.writeFileSync('sender.sk', sender_skey);
fs.writeFileSync('redeemer.sk', redeemer_skey);
 
const sender_wallet = new MeshWallet({
  networkId: 0,
  key: {
    type: 'root',
    bech32: sender_skey,
  },
});
 
const redeemer_wallet = new MeshWallet({
  networkId: 0,
  key: {
    type: 'root',
    bech32: redeemer_skey,
  },
});
 
const sender_addr = await sender_wallet.getUnusedAddresses();
console.log("sender_addr", sender_addr[0]);
fs.writeFileSync('sender.addr', sender_addr[0]);

const redeemer_addr = await redeemer_wallet.getUnusedAddresses();
console.log("redeemer_addr", redeemer_addr[0]);
fs.writeFileSync('redeemer.addr', redeemer_addr[0]);
