#!/bin/bash

aiken new hotrdung/swap
cd swap/
aiken check
aiken build
npm install tsx dotenv @meshsdk/core
cp ../hello-world/.env .
cp ../hello-world/generate-credentials.ts .
cp ../hello-world/common.ts .


cd swap/

export FAUCET_ADDR=$(cardano-cli conway address build --payment-verification-key-file ~/cardano-devnet/devnet/credentials/faucet.vk)

# faucet 1000 ADA to `sender.addr`
cardano-cli conway transaction build \
  --tx-in $(cardano-cli conway query utxo --address $FAUCET_ADDR --output-json | jq -r 'keys[0]') \
  --tx-out $(< sender.addr)+1000000000 \
  --change-address $FAUCET_ADDR \
  --out-file transfer.tx
cardano-cli conway transaction sign \
  --tx-file transfer.tx \
  --signing-key-file ~/cardano-devnet/devnet/credentials/faucet.sk \
  --out-file transfer.tx.signed
cardano-cli conway transaction submit --tx-file transfer.tx.signed

cardano-cli conway query utxo --address $(cat sender.addr)


# faucet 25 ADA to `redeemer.addr`
cardano-cli conway transaction build \
  --tx-in $(cardano-cli conway query utxo --address $FAUCET_ADDR --output-json | jq -r 'keys[0]') \
  --tx-out $(< redeemer.addr)+25000000 \
  --change-address $FAUCET_ADDR \
  --out-file transfer2.tx
cardano-cli conway transaction sign \
  --tx-file transfer2.tx \
  --signing-key-file ~/cardano-devnet/devnet/credentials/faucet.sk \
  --out-file transfer2.tx.signed
cardano-cli conway transaction submit --tx-file transfer2.tx.signed

cardano-cli conway query utxo --address $(cat redeemer.addr)



cardano-cli address key-gen \
    --verification-key-file policy.vkey \
    --signing-key-file policy.skey

# cardano-cli address build --payment-verification-key-file policy.vkey --out-file policyNoStake.addr

# # faucet 50 ADA to `policyNoStake.addr`
# cardano-cli conway transaction build \
#   --tx-in $(cardano-cli conway query utxo --address $FAUCET_ADDR --output-json | jq -r 'keys[0]') \
#   --tx-out $(< policyNoStake.addr)+50000000 \
#   --change-address $FAUCET_ADDR \
#   --out-file transfer3.tx
# cardano-cli conway transaction sign \
#   --tx-file transfer3.tx \
#   --signing-key-file ~/cardano-devnet/devnet/credentials/faucet.sk \
#   --out-file transfer3.tx.signed
# cardano-cli conway transaction submit --tx-file transfer3.tx.signed
# cardano-cli conway query utxo --address $(cat policyNoStake.addr)


# MINT >>>
cardano-cli address key-hash --payment-verification-key-file policy.vkey
nano policy.script
# {
#   "keyHash": "dd7a91e04ae00a35a0ae2852677c13fb03b0806f30d1cd47860fa07c",
#   "type": "sig"
# }
cat policy.script
#
# policyId
cardano-cli hash script --script-file policy.script
# asset name
echo -n "pokemoney" | xxd -ps
#
cardano-cli query protocol-parameters --out-file pparams.json


# cardano-cli conway transaction build \
#     --tx-in $(cardano-cli conway query utxo --address $(< policyNoStake.addr) --output-json | jq -r 'keys[0]') \
#     --tx-out $(< redeemer.addr)+2000000+"10 cbdcf78cf6b6e5857b02c8e425f5b388f9b086fed3648dcd5bc1d968.706f6b656d6f6e6579" \
#     --mint "10 cbdcf78cf6b6e5857b02c8e425f5b388f9b086fed3648dcd5bc1d968.706f6b656d6f6e6579" \
#     --mint-script-file policy.script \
#     --change-address $(< policyNoStake.addr) \
#     --out-file mint-tx.raw
cardano-cli conway transaction build \
    --tx-in $(cardano-cli conway query utxo --address $(< redeemer.addr) --output-json | jq -r 'keys[0]') \
    --tx-out $(< redeemer.addr)+10000000+"10 cbdcf78cf6b6e5857b02c8e425f5b388f9b086fed3648dcd5bc1d968.706f6b656d6f6e6579" \
    --mint "10 cbdcf78cf6b6e5857b02c8e425f5b388f9b086fed3648dcd5bc1d968.706f6b656d6f6e6579" \
    --mint-script-file policy.script \
    --change-address $(< redeemer.addr) \
    --out-file mint-tx.raw

cat mint-tx.raw

# ...
# open `sign_cbor.ts` --> replace the txCbor --> exec the script to get txCborHex --> create file `mint-tx.partial.signed`
# ...
npx tsx sign_cbor

cardano-cli conway transaction sign --tx-file mint-tx.partial.signed --signing-key-file policy.skey --out-file mint-tx.signed
cardano-cli conway transaction submit --tx-file mint-tx.signed

cardano-cli query utxo --address $(< redeemer.addr)


npx tsx init_swap.ts
# copy result txHash  --> replace into `accept_swap.ts`
# 96d190ba339039739c30431555c27cd39b894e2f3b22c558d9a8e7dacf166737

npx tsx accept_swap.ts

curl -s localhost:3000/txs/ead9e60469434d72e6d3d138748673b5ffa9831a01294bbffe9fceb881da4c88/utxos | jq

cardano-cli query utxo --address $(< redeemer.addr)
# should have ~45 ADA

cardano-cli query utxo --address $(< sender.addr)
# should have minted 10 FT
