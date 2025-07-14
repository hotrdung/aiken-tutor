#!/bin/bash

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


# faucet 5 ADA to `redeemer.addr`
cardano-cli conway transaction build \
  --tx-in $(cardano-cli conway query utxo --address $FAUCET_ADDR --output-json | jq -r 'keys[0]') \
  --tx-out $(< redeemer.addr)+5000000 \
  --change-address $FAUCET_ADDR \
  --out-file transfer2.tx
cardano-cli conway transaction sign \
  --tx-file transfer2.tx \
  --signing-key-file ~/cardano-devnet/devnet/credentials/faucet.sk \
  --out-file transfer2.tx.signed
cardano-cli conway transaction submit --tx-file transfer2.tx.signed

cardano-cli conway query utxo --address $(cat redeemer.addr)


curl -s localhost:3000/txs/5ab0f69899adca7496deb4ac881b9ebfb87f456dc584fcd685471cf1bfd62b53 | jq
curl -s localhost:3000/txs/5ab0f69899adca7496deb4ac881b9ebfb87f456dc584fcd685471cf1bfd62b53/utxos | jq
curl -s localhost:3000/txs/5ab0f69899adca7496deb4ac881b9ebfb87f456dc584fcd685471cf1bfd62b53/redeemers | jq
curl -s localhost:3000/txs/5ab0f69899adca7496deb4ac881b9ebfb87f456dc584fcd685471cf1bfd62b53/cbor | jq



cardano-cli conway transaction build \
  --tx-in $(cardano-cli conway query utxo --address $(< sender.addr) --output-json | jq -r 'keys[0]') \
  --tx-out $(< redeemer.addr)+2000000+"1 a533d5c0abd700955c18cb4a8e1c4ed4ec884fa4c0dbd698821ba2d9.506f6b654d4f4e4559" \
  --change-address $(< redeemer.addr) \
  --out-file transfer.raw
cardano-cli conway transaction sign --tx-file transfer.raw --signing-key-file sender.sk --out-file transfer.signed
cardano-cli conway transaction submit --tx-file transfer.signed
