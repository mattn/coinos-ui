<script>
  import { enhance } from "$app/forms";
  import { send } from "$lib/socket";
  import { btc, post, copy, f, get, types, sat, s, sats } from "$lib/utils";
  import { tick, onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { last, showQr, amountPrompt } from "$lib/store";
  import Avatar from "$comp/Avatar.svelte";
  import Icon from "$comp/Icon.svelte";
  import Numpad from "$comp/Numpad.svelte";
  import { t } from "$lib/translations";
  import { goto, invalidate } from "$app/navigation";
  import Toggle from "$comp/Toggle.svelte";

  export let data;

  let showOptions;

  let reading = async ({ message, serialNumber }) => {
    let name = serialNumber.replace(/:/g, "-");
    let result = await post(`/fund/${name}/withdraw`, { amount, hash, name });
  };

  let readingerror = (e) => console.log("nfc error", e);

  $: refresh(data);
  let { invoice, id, subject, user, src } = data;
  let {
    aid,
    amount,
    hash,
    type,
    rate,
    text,
    tip,
    user: { username, currency },
  } = invoice;

  let qr;
  let tipPercent = 0;

  let refresh = async (data) => {
    ({ invoice, id, user, src } = data);
    ({
      aid,
      amount,
      hash,
      type,
      rate,
      text,
      tip,
      user: { username, currency },
    } = invoice);

    if (browser && !subbed[id])
      send("subscribe", invoice)
        .then(() => (subbed[id] = true))
        .catch((e) => {
          console.log("failed to subscribe to invoice notifications", invoice);
          console.log(e);
        });

    tipPercent = (tip / amount) * 100;
  };

  $: amountFiat = parseFloat(((amount * rate) / sats).toFixed(2));
  $: tipAmount = ((tip * rate) / sats).toFixed(2);

  let subbed = {};

  onMount(async () => {
    if (browser) {
      last.subscribe((v) => {
        if (!v || subbed) return;
        subbed = true;
        send("subscribe", invoice);
      });

      if ($amountPrompt && !amount) toggleAmount();
    }
  });

  $: link = [types.bitcoin, types.liquid].includes(type)
    ? text
    : `lightning:${text}`;
  $: txt = [types.bitcoin, types.liquid].includes(type) ? hash : text;

  let setType = async (type) => {
    invoice.type = type;
    ({ id } = await post(`/invoice`, {
      invoice,
      user: { username, currency },
    }));

    goto(`./${id}?options=true`, { invalidateAll: true, noScroll: true });
  };

  let setAmount = async () => {
    if (typeof $amountPrompt === "undefined") $amountPrompt = true;
    settingAmount = false;
    amount = newAmount;
    invoice.amount = newAmount;
    invoice.tip = 0;
    ({ id } = await post(`/invoice`, {
      invoice,
      user: { username, currency },
    }));

    let url = `./${id}`;
    if (subject?.prompt) url += "/tip";
    else url += "?options=true";

    goto(url, { invalidateAll: true, noScroll: true });
  };

  let newAmount;
  let settingAmount;
  let toggleAmount = () => (settingAmount = !settingAmount);
  let fiat;
  let submit;
</script>

<div class="invoice container mx-auto max-w-xl px-4 space-y-2">
  {#if $showQr}
    <div>
      <a
        href={[types.bitcoin, types.liquid].includes(invoice.type)
          ? invoice.text
          : "lightning:" + invoice.text}
      >
        <img
          {src}
          class="mx-auto z-10 max-w-[360px]"
          bind:this={qr}
          alt={txt}
        />
      </a>
    </div>
  {/if}

  {#if type !== types.lightning || !$showQr}
    <div class="break-all text-center text-xl text-secondary flex">
      <div class="m-auto">{txt}</div>
    </div>
  {/if}

  {#each invoice.items as i}
    <div class="grid grid-cols-12 text-xl">
      <div class="col-span-1 my-auto">{i.quantity}</div>
      <div class="mr-auto grow col-span-7 my-auto">
        {i.name}
      </div>
      <div class="col-span-2 font-semibold text-right my-auto">
        {f(i.price * i.quantity, currency)}
      </div>
      <div class="col-span-2 text-secondary text-right text-lg my-auto">
        {sat(btc(i.price * i.quantity, rate))}
      </div>
    </div>
  {/each}

  {#if amount > 0}
    <div class="text-center font-bold text-2xl">
      <div>
        {f(amountFiat, currency)}

        {#if tip}
          <span class="text-sm">
            +{f(tip * (rate / sats), currency)}
          </span>
        {/if}
      </div>
      <div>
        <span class="text-secondary font-normal text-xl"
          >⚡️{`${s(amount)}`}</span
        >

        {#if tip}
          <span class="text-sm text-secondary font-normal">
            +⚡️{s(tip)}
          </span>
        {/if}
      </div>
    </div>
  {/if}

  <div class="text-secondary space-y-2 text-xl pt-2">
    <button
      type="button"
      class="flex gap-2 text-center break-all rounded-2xl hover:opacity-80 py-5 px-6 w-full mx-auto justify-center border whitespace-nowrap mb-2"
      on:click={() => copy(txt)}
    >
      <Icon icon="copy" style="w-8 my-auto" />
      <div class="my-auto">
        {$t("payments.copy")}
      </div>
    </button>

    {#if user?.id === invoice?.user?.id}
      <button
        class="w-full flex justify-center rounded-2xl border py-5 px-6 hover:opacity-80"
        on:click={toggleAmount}
      >
        <Icon icon="edit" style="mr-1 w-8" />
        <div class="my-auto">{$t("payments.setAmount")}</div>
      </button>
    {:else}
      <a href={link} class="w-full">
        <button
          class="w-full flex justify-center rounded-2xl border py-5 px-6 hover:opacity-80"
        >
          <Icon icon="mobile" style="mr-1 w-8" />
          <div class="my-auto">{$t("payments.openLink")}</div>
        </button>
      </a>
    {/if}

    {#if type === types.lightning}
      <div class="w-full flex justify-center gap-2 flex-wrap">
        <button
          class="w-full flex justify-center rounded-2xl border py-5 px-6 hover:opacity-80"
          on:click={() => ($showQr = !$showQr)}
        >
          {#if $showQr}
            <Icon icon="text" style="w-6 mr-2 my-auto" />
          {:else}
            <Icon icon="qr" style="w-8 mr-1 invert my-auto" />
          {/if}
          <div class="my-auto">
            {$showQr ? $t("payments.showText") : $t("payments.showQr")}
          </div></button
        >
      </div>
    {/if}
  </div>

  {#if aid === user?.id}
    <div class="grid grid-cols-2 justify-around text-secondary">
      <button
        class="hover:bg-primary my-auto flex gap-1 sm:gap-2 py-3 px-2 sm:px-5 justify-center"
        class:bg-primary={type === types.bitcoin}
        class:text-black={type === types.bitcoin}
        on:click={() => setType(types.bitcoin)}
      >
        <img src="/images/bitcoin.svg" class="w-8" alt="Bitcoin" />
        <div class="my-auto text-lg">Bitcoin</div>
      </button>

      <button
        class="hover:bg-primary my-auto flex gap-1 sm:gap-2 py-3 px-2 sm:px-5 justify-center"
        class:bg-primary={type === types.liquid}
        class:text-black={type === types.liquid}
        on:click={() => setType(types.liquid)}
      >
        <img src="/images/liquid.svg" class="w-8" alt="Liquid" />
        <div class="my-auto text-lg">Liquid</div>
      </button>

      <button
        class="hover:bg-primary flex gap-1 sm:gap-2 py-3 px-2 sm:px-5 justify-center"
        class:bg-primary={type === types.lightning}
        class:text-black={type === types.lightning}
        on:click={() => setType(types.lightning)}
      >
        <div class="bg-white rounded-full w-8 h-8 text-center flex">
          <div class="m-auto">⚡️</div>
        </div>
        <div class="my-auto text-lg">Lightning</div>
      </button>

      <a href={`/receive`} class="block contents">
        <button
          class="hover:bg-primary flex gap-1 sm:gap-2 py-3 px-2 sm:px-5 justify-center"
        >
          <img src="/images/cash.png" class="w-8 my-auto" />
          <div class="my-auto text-lg">Ecash</div>
        </button>
      </a>
    </div>

    {#if type === types.liquid}
      <div class="flex justify-center">
        <div class="my-auto text-xl text-center text-secondary">
          {$t("payments.onlyLbtc")}
          <span class="text-teal-500 font-bold">L-BTC</span>,
          {$t("payments.dontDeposit")}
        </div>
      </div>
    {/if}
  {/if}
</div>

{#if settingAmount}
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
  >
    <div
      class="relative mx-auto p-12 border max-w-xl shadow-lg rounded-md bg-white space-y-5 top-5"
    >
      <form on:submit|preventDefault={setAmount} class="space-y-5">
        <Numpad
          bind:amount={newAmount}
          bind:currency
          bind:rate
          bind:fiat
          bind:submit
        />
        <div class="w-full flex flex-wrap gap-2">
          <button
            bind:this={submit}
            type="submit"
            on:click={setAmount}
            class="border-2 border-black rounded-xl font-semibold mx-auto py-3 w-40 hover:opacity-80 mx-auto bg-black text-white w-full"
          >
            <div class="my-auto">{$t("payments.ok")}</div>
          </button>
          <button
            type="button"
            class="border-2 border-black rounded-xl font-semibold mx-auto py-3 w-40 hover:opacity-80 mx-auto w-full"
            on:click={toggleAmount}
            on:keydown={toggleAmount}
          >
            <div class="my-auto">{$t("payments.cancel")}</div>
          </button>
        </div>
      </form>

      <div class="flex justify-center gap-3">
        <div class="text-secondary">{$t("payments.amountPrompt")}</div>
        <Toggle id="notify" bind:value={$amountPrompt} />
      </div>
    </div>
  </div>
{/if}
