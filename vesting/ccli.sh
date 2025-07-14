#!/bin/bash

export FAUCET_ADDR=$(cardano-cli conway address build --payment-verification-key-file ~/cardano-devnet/devnet/credentials/faucet.vk)

# faucet 1000 ADA to `owner.addr`
cardano-cli conway transaction build \
  --tx-in $(cardano-cli conway query utxo --address $FAUCET_ADDR --output-json | jq -r 'keys[0]') \
  --tx-out $(< owner.addr)+1000000000 \
  --change-address $FAUCET_ADDR \
  --out-file transfer.tx
cardano-cli conway transaction sign \
  --tx-file transfer.tx \
  --signing-key-file ~/cardano-devnet/devnet/credentials/faucet.sk \
  --out-file transfer.tx.signed
cardano-cli conway transaction submit --tx-file transfer.tx.signed

cardano-cli conway query utxo --address $(cat owner.addr)


# faucet 5 ADA to `beneficiary.addr`
cardano-cli conway transaction build \
  --tx-in $(cardano-cli conway query utxo --address $FAUCET_ADDR --output-json | jq -r 'keys[0]') \
  --tx-out $(< beneficiary.addr)+5000000 \
  --change-address $FAUCET_ADDR \
  --out-file transfer2.tx
cardano-cli conway transaction sign \
  --tx-file transfer2.tx \
  --signing-key-file ~/cardano-devnet/devnet/credentials/faucet.sk \
  --out-file transfer2.tx.signed
cardano-cli conway transaction submit --tx-file transfer2.tx.signed

cardano-cli conway query utxo --address $(cat beneficiary.addr)


