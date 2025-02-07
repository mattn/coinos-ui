<script>
  import { tick } from "svelte";
  import { t } from "$lib/translations";
  import { enhance } from "$app/forms";
  import Toggle from "$comp/Toggle.svelte";
  import Icon from "$comp/Icon.svelte";
  import Spinner from "$comp/Spinner.svelte";
  import WalletPass from "$comp/WalletPass.svelte";
  import { page } from "$app/stores";
  import {
    fiat as toFiat,
    f,
    focus,
    s,
    sat,
    closest,
    network,
  } from "$lib/utils";
  import { pin } from "$lib/store";
  import { goto, invalidate } from "$app/navigation";
  import { rate } from "$lib/store";
  import { applyAction } from "$app/forms";
  import { hex as hexUtil } from "@scure/base";
  import * as btc from "@scure/btc-signer";
  import { hash160 } from "@scure/btc-signer/utils";
  import { decrypt } from "nostr-tools/nip49";
  import { HDKey } from "@scure/bip32";
  import { entropyToMnemonic, mnemonicToSeed } from "@scure/bip39";
  import { wordlist } from "@scure/bip39/wordlists/english";

  export let data;
  export let form;

  let { encode, decode } = hexUtil;
  let passwordPrompt;
  let password;
  let cancel = () => (passwordPrompt = false);
  let signed;

  let togglePassword = () => (passwordPrompt = !passwordPrompt);
  let handler = ({ cancel }) => {
    if (account.seed && !signed) cancel(), togglePassword();
    return async ({ result }) => {
      if (result.type === "redirect") {
        goto(result.location);
      } else {
        await applyAction(result);
        invalidate("app:payments");
      }
    };
  };

  let signTx = async () => {
    let entropy = await decrypt(account.seed, password);
    let mnemonic = entropyToMnemonic(entropy, wordlist);
    let seed = await mnemonicToSeed(mnemonic, password);
    let master = HDKey.fromMasterSeed(seed, network);
    let child = master.derive("m/84'/0'/0'");

    let tx = btc.Transaction.fromRaw(decode(hex));

    for (let [i, input] of tx.inputs.entries()) {
      let { witnessUtxo, path } = inputs[i];
      witnessUtxo.amount = BigInt(witnessUtxo.amount);
      witnessUtxo.script = decode(witnessUtxo.script);
      let key = child.derive(path);
      tx.updateInput(i, { witnessUtxo });
      tx.signIdx(key.privateKey, i);
    }

    tx.finalize();
    hex = tx.hex;
    console.log("HEX", hex);
    signed = true;
    await tick();
    submit.click();
  };

  let toggle = () => (submitting = !submitting);

  let {
    account,
    amount,
    address,
    message,
    fee,
    fees,
    feeRate,
    ourfee,
    rates,
    hex,
    inputs,
  } = data;

  $: reload(data);
  let reload = () => {
    ({ amount, address, message, fee, fees, feeRate, ourfee, rates, hex } =
      data);
    if (!fees) return;
    delete fees.minimumFee;
    feeRate = feeRate ? closest(Object.values(fees), feeRate) : fees.halfHourFee;
    if (!$rate) $rate = rates[currency];
  };

  let { balance, currency } = data.user;
  let submitting, submit, showSettings;

  let feeNames = {
    fastestFee: $t("payments.fastest"),
    halfHourFee: $t("payments.fast"),
    hourFee: $t("payments.medium"),
  };

  let toggleSettings = () => (showSettings = !showSettings);

  $: update(form);
  let update = () => {
    submitting = false;
    if (form?.message?.includes("pin")) $pin = undefined;
  };

  let setFee = () => goto(`/send/bitcoin/${address}/${amount}/${feeRate}`);
  let goBack = () => goto(`/send/bitcoin/${address}`);
</script>

<div
  class="container px-4 max-w-xl mx-auto space-y-5 text-center no-transition"
>
  <h1 class="text-3xl md:text-4xl font-semibold mb-2">{$t("payments.send")}</h1>

  {#if form?.message || message}
    <div class="mb-5">
      <div class="text-red-600">{form?.message || message}</div>
    </div>
  {:else}
    <div class="text-xl text-secondary break-all">{address}</div>

    <div class="text-center">
      <h2 class="text-2xl md:text-3xl font-semibold">
        {f(toFiat(amount, $rate), currency)}
      </h2>
      <h3 class="text-secondary md:text-lg mb-6 mt-1">⚡️{s(amount)}</h3>
    </div>

    <div class="text-center">
      <h2 class="text-secondary text-lg">{$t("payments.networkFee")}</h2>

      <div class="flex flex-wrap gap-4 justify-center">
        <select
          bind:value={feeRate}
          on:change={setFee}
          class="border text-lg bg-white p-4 rounded-2xl text-center my-auto"
        >
          {#each Object.keys(feeNames) as feeName}
            <option value={fees[feeName]}
              >{feeNames[feeName]} &mdash; ⚡️{fees[feeName]}/vb</option
            >
          {/each}
        </select>
        <div class="my-auto">
          <h2 class="text-xl">
            {f(toFiat(fee, $rate), currency)}
          </h2>
          <h3 class="text-secondary">⚡️{s(fee)}</h3>
        </div>
      </div>
    </div>

    {#if ourfee}
      <div class="text-center">
        <h2 class="text-secondary text-lg">{$t("payments.platformFee")}</h2>

        <div class="flex flex-wrap gap-4 justify-center">
          <div class="my-auto">
            <h2 class="text-xl">
              {f(toFiat(ourfee, $rate), currency)}
            </h2>
            <h3 class="text-secondary">⚡️{s(ourfee)}</h3>
          </div>
        </div>
      </div>
    {/if}

    <form method="POST" use:enhance={handler}>
      <input name="pin" value={$pin} type="hidden" />
      <input name="hex" value={hex} type="hidden" />
      <input name="rate" value={$rate} type="hidden" />
      <input name="aid" value={account.id} type="hidden" />
      <input name="signed" value={signed} type="hidden" />

      <div class="flex justify-center gap-2">
        <button
          use:focus
          bind:this={submit}
          type="submit"
          class="opacity-100 hover:opacity-80 rounded-2xl border py-3 font-bold mt-2 bg-black text-white px-4 w-24"
          disabled={submitting}
        >
          {#if submitting}
            <Spinner />
          {:else}
            {$t("payments.send")}
          {/if}
        </button>
      </div>
    </form>
  {/if}
</div>

{#if passwordPrompt}
  <WalletPass bind:password bind:cancel submit={signTx} />
{/if}

<style>
  .no-transition {
    view-transition-name: fee;
  }
</style>
