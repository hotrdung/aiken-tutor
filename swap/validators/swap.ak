use aiken/collection/list
use cardano/address.{Address}
use cardano/assets.{
  AssetName, PolicyId, from_asset, from_asset_list, from_lovelace, merge,
}
use cardano/transaction.{Input, OutputReference, Transaction, find_input}
use cocktail.{
  address_pub_key, get_all_value_from, get_all_value_to, input_inline_datum,
  inputs_at, key_signed, value_geq,
}
use mocktail.{
  complete, mock_pub_key_address, mock_script_address, mock_tx_hash,
  mock_utxo_ref, mocktail_tx, tx_in, tx_in_inline_datum, tx_out,
}

pub type MValue =
  Pairs<PolicyId, Pairs<AssetName, Int>>

pub type SwapDatum {
  SwapDatum { initiator: Address, to_provide: MValue, to_receive: MValue }
}

pub type SwapRedeemer {
  Cancel
  Swap
}

validator double_satisfaction_swap {
  spend(
    datum_opt: Option<SwapDatum>,
    redeemer: SwapRedeemer,
    input: OutputReference,
    tx: Transaction,
  ) {
    expect Some(datum) = datum_opt
    when redeemer is {
      Swap -> {
        expect Some(script_input) = find_input(tx.inputs, input)
        let script_address = script_input.output.address
        let inputs_from_script = inputs_at(tx.inputs, script_address)

        let all_datums_to_receive =
          list.filter_map(
            inputs_from_script,
            fn(i) {
              if i.output.address == datum.initiator {
                let id = input_inline_datum(i)
                if id is SwapDatum {
                  Some(id.to_receive)
                } else {
                  None
                }
              } else {
                None
              }
            },
          )
        let total_to_receive =
          all_datums_to_receive
            |> list.reduce(
                from_asset_list([]),
                fn(total, entry) {
                  let v = from_asset_list(entry)
                  merge(total, v)
                },
              )

        get_all_value_to(tx.outputs, datum.initiator)
          |> value_geq(total_to_receive)
      }

      Cancel -> {
        expect Some(pub_key) = address_pub_key(datum.initiator)
        key_signed(tx.extra_signatories, pub_key)
      }
    }
  }

  else(_) {
    fail
  }
}

type SwapTestCase {
  is_only_one_input_from_script: Bool,
  is_token_unlocked: Bool,
  is_proceed_paid: Bool,
}

fn get_swap_test_tx(test_case: SwapTestCase) {
  let SwapTestCase {
    is_only_one_input_from_script,
    is_token_unlocked,
    is_proceed_paid,
  } = test_case

  mocktail_tx()
    |> tx_in(
        // The first order
        True,
        mock_tx_hash(1),
        1,
        from_lovelace(
          if is_token_unlocked {
            15_000_000
          } else {
            10_000_000
          },
        ),
        mock_script_address(1, None),
      )
    |> tx_in_inline_datum(True, swap_datum())
    |> tx_in(
        // The second order
        !is_only_one_input_from_script,
        mock_tx_hash(1),
        1,
        from_lovelace(10_000_000),
        mock_script_address(1, None),
      )
    |> tx_in_inline_datum(!is_only_one_input_from_script, swap_datum())
    |> tx_out(
        is_proceed_paid,
        mock_pub_key_address(1, None),
        from_asset("test", "test", 1_000),
      )
    |> complete()
}

fn swap_datum() -> SwapDatum {
  SwapDatum {
    initiator: mock_pub_key_address(1, None),
    to_provide: [Pair("", [Pair("", 15_000_000)])],
    to_receive: [Pair("test", [Pair("test", 1_000)])],
  }
}

test succeed_swapping_attempting_double_satisfaction() {
  let output_reference = mock_utxo_ref(1, 1)
  let test_case =
    SwapTestCase {
      is_only_one_input_from_script: False,
      is_token_unlocked: True,
      is_proceed_paid: True,
    }

  let tx = get_swap_test_tx(test_case)
  double_satisfaction_swap.spend(Some(swap_datum()), Swap, output_reference, tx)
}
