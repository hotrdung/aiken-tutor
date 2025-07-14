

export FAUCET_ADDR=$(cardano-cli conway address build --payment-verification-key-file ~/cardano-devnet/devnet/credentials/faucet.vk)


# faucet 100 ADA to `me.addr`
cardano-cli conway transaction build \
  --tx-in $(cardano-cli conway query utxo --address $FAUCET_ADDR --output-json | jq -r 'keys[0]') \
  --tx-out $(< me.addr)+100000000 \
  --change-address $FAUCET_ADDR \
  --out-file transfer.tx
cardano-cli conway transaction sign \
  --tx-file transfer.tx \
  --signing-key-file ~/cardano-devnet/devnet/credentials/faucet.sk \
  --out-file transfer.tx.signed
cardano-cli conway transaction submit --tx-file transfer.tx.signed


# faucet 100 ADA to `me-mesh.addr`
cardano-cli conway transaction build \
  --tx-in $(cardano-cli conway query utxo --address $FAUCET_ADDR --output-json | jq -r 'keys[0]') \
  --tx-out $(< me-mesh.addr)+100000000 \
  --change-address $FAUCET_ADDR \
  --out-file transfer-mesh.tx
cardano-cli conway transaction sign \
  --tx-file transfer-mesh.tx \
  --signing-key-file ~/cardano-devnet/devnet/credentials/faucet.sk \
  --out-file transfer-mesh.tx.signed
cardano-cli conway transaction submit --tx-file transfer-mesh.tx.signed

# ----------
# https://aiken-lang.org/example--hello-world/end-to-end/cardano-cli

# cardano-cli address key-gen --verification-key-file me.vk --signing-key-file me.sk
# cardano-cli conway address build --payment-verification-key-file me.vk | tee me.addr

cardano-cli conway query utxo --address $(cat me.addr)

# generate a script file (uses a CBOR-in-CBOR encoding wrapped in a simple TextEnvelope JSON file)
aiken blueprint convert > hello.script
cardano-cli address build --payment-script-file hello.script | tee hello.addr

# prepare datum JSON file
cardano-cli conway address build --payment-verification-key-file me.vk \
   | cardano-address address inspect \
   | jq -r .spending_key_hash \
   | tee me.hash

jq -c -R '{constructor:0,fields:[{bytes:.}]}' < me.hash | tee datum.json

# lock ADA to the SC, with datum.json specifies the key hash to unlock
cardano-cli conway transaction build \
      --tx-in 7e4233216776ef5e5583a9acbe9d155b21529f1800f28dfce3eb44c15953e78e#0 \
      --tx-out $(cat hello.addr)+1100000 \
      --tx-out-inline-datum-file datum.json \
      --change-address $(cat me.addr) \
      --out-file tx.lock.raw

cardano-cli conway transaction sign --tx-file tx.lock.raw --out-file tx.lock.signed --signing-key-file me.sk
cardano-cli conway transaction submit --tx-file tx.lock.signed


# find the utxo at the SC address to unlock
# by get the submitted lock tx ID:
cardano-cli conway transaction txid --tx-file tx.lock.signed
# or:
cardano-cli conway query utxo --address $(cat hello.addr) --output-json

# prepare redeemer JSON file
jq -c -R '{constructor:0,fields:[{bytes:.}]}' <<< "$(echo -n 'Hello from Pokemony!' | xxd -ps)" | tee redeemer.json
# echo -n "..."  <-- print without \n at the end
# xxd -ps        <-- outputs hex string

cardano-cli conway query protocol-parameters > pparams.json

# check for CPU time and MEM used by the SC
# -> round up values for: --tx-in-execution-units '(12000000,34000)'
aiken check

# get input UTxO amount at `me.addr` --> 98728031
cardano-cli conway query utxo --address $(cat me.addr) --output-json
# echo $((98728031 + 1100000 - 187380))
# 1100000: locked amount in SC UTxO
# 187380: tx fee

cardano-cli conway transaction build-raw \
  --tx-in 945e172cbfbe645deee677e6f8ec473f4f2472205aee5fb89ce01eb89b90109a#1 \
  --tx-in 945e172cbfbe645deee677e6f8ec473f4f2472205aee5fb89ce01eb89b90109a#0 \
  --tx-in-collateral 945e172cbfbe645deee677e6f8ec473f4f2472205aee5fb89ce01eb89b90109a#1 \
  --tx-in-script-file hello.script \
  --tx-in-inline-datum-present \
  --tx-in-redeemer-file redeemer.json \
  --tx-in-execution-units '(12000000,34000)' \
  --tx-out $(cat me.addr)+99640651 \
  --fee 187380 \
  --protocol-params-file pparams.json \
  --out-file tx.unlock.raw \
  --required-signer me.sk

# THIS COMMAND IS THE SAME AS ABOVE
# BUT NOTICE THAT: it would fail if trying executing the SC got invalid.
cardano-cli conway transaction build \
  --tx-in 9fee7e3417833187ff1c979bd2781d5a64feba4e0adb194359375f98b625d0f9#0 \
  --tx-in-script-file hello.script \
  --tx-in-inline-datum-present \
  --tx-in-redeemer-file redeemer.json \
  --tx-in 9fee7e3417833187ff1c979bd2781d5a64feba4e0adb194359375f98b625d0f9#1 \
  --tx-in-collateral 9fee7e3417833187ff1c979bd2781d5a64feba4e0adb194359375f98b625d0f9#1 \
  --change-address $(< me.addr) \
  --out-file tx3b.unlock.raw \
  --required-signer me.sk


cardano-cli conway transaction calculate-min-fee --tx-body-file tx.unlock.raw --protocol-params-file pparams.json --witness-count 1
# --> 187380

# replace the fee, recompute the output UTxO amount, and build-raw tx again

cardano-cli conway transaction sign --tx-file tx3b.unlock.raw --out-file tx3b.unlock.signed --signing-key-file me.sk
cardano-cli conway transaction submit --tx-file tx3b.unlock.signed



# again, with auto-balancing

cardano-cli conway query utxo --address $(cat me.addr)

# ... lock

cardano-cli conway transaction build \
  --tx-in e3935f7905337e7569c634c389a28542c5b41706ccf693a4c50c505976f78369#0 \
  --tx-in-script-file hello.script \
  --tx-in-inline-datum-present \
  --tx-in-redeemer-file redeemer.json \
  --tx-in e3935f7905337e7569c634c389a28542c5b41706ccf693a4c50c505976f78369#1 \
  --tx-in-collateral e3935f7905337e7569c634c389a28542c5b41706ccf693a4c50c505976f78369#1 \
  --change-address $(< me.addr) \
  --out-file tx2.unlock.raw \
  --required-signer me.sk

cardano-cli conway transaction sign --tx-file tx2.unlock.raw --out-file tx2.unlock.signed --signing-key-file me.sk



# --------------

cardano-cli conway query utxo --address $(cat me-mesh.addr) | jq
cardano-cli conway query utxo --address $(cat hello.addr) | jq

bech32 <<< $(cat me-mesh.addr) | cut -c 3-58 | tee me-mesh.hash

bech32 <<< $(cat me-mesh.sk) | cut -c1-64
# 8015ae0c17b0732369f399532a27f12c46a884c14f117abd16ab8e974afdca42
# <==>
cardano-cli key convert-cardano-address-key --shelley-payment-key --signing-key-file me-mesh.sk --out-file me-mesh.skey
jq -R '{type:"PaymentSigningKeyShelley_ed25519",description:"Payment Signing Key",cborHex:.}' \
  <<< 5820$(cat me-mesh.skey | jq -r '.cborHex' | cut -c5-68) | tee me-mesh.cli.sk
# 8015ae0c17b0732369f399532a27f12c46a884c14f117abd16ab8e974afdca42


cardano-cli key verification-key --signing-key-file me-mesh.cli.sk --verification-key-file me-mesh.cli.vk
cardano-cli conway address build --payment-verification-key-file me-mesh.cli.vk
# --> addr_test1vpcpmxczu2fyp03pafqhhjl67wmgm6kfcath40k5cscj49s8qxj8d
# just verify `me-mesh.cli.vk` matches with the addr built above
bech32 <<< addr_test1vpcpmxczu2fyp03pafqhhjl67wmgm6kfcath40k5cscj49s8qxj8d
# --> 60701d9b02e29240be21ea417bcbfaf3b68deac9c7577abed4c4312a96
blake2b 224 ffc68dcec27071055a43ff4717831c5cc9fd8a157e1643bea3465b5f95e539b6
# --> 701d9b02e29240be21ea417bcbfaf3b68deac9c7577abed4c4312a96

cardano-cli conway transaction sign --tx-file tx3.unlock.raw --out-file tx3b.unlock.signed --signing-key-file me-mesh.cli.sk

cardano-cli conway transaction submit --tx-file tx3.unlock.signed

