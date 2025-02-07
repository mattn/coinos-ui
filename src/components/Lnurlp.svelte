<script>
  import { t } from "$lib/translations";
  import { enhance } from "$app/forms";
  import Numpad from "$comp/Numpad.svelte";
  import Spinner from "$comp/Spinner.svelte";
  import { pin } from "$lib/store";

  export let data, form, send, comment;
  let { currency } = data.user;
  let { minSendable, maxSendable, commentAllowed, callback, metadata, rates } =
    data;

  $: rate = rates[currency];

  let amount = Math.round(minSendable / 1000),
    loading;
  let submit = () => (loading = true);
</script>

<div class="container px-4 mt-20 max-w-xl mx-auto space-y-2">
  <div class="text-center mb-8">
    {#each JSON.parse(metadata) as m}
      <div>
        {#if m[0] === "text/plain"}
          <h1 class="text-3xl md:text-4xl font-semibold mb-2">{m[1]}</h1>
        {/if}
        {#if m[0].includes("image")}
          <img src={`data:image/png;base64,${m[1]}`} alt="Recipient" />
        {/if}
      </div>
    {/each}
  </div>

  {#if form?.error}
    <div class="text-red-600 text-center mb-5">
      {form.error}
    </div>
  {/if}

  <Numpad bind:amount bind:rate {currency} bind:submit={send} />

  <form action="?/pay" method="POST" use:enhance on:submit={submit}>
    <input name="amount" value={amount} type="hidden" />
    <input name="minSendable" value={minSendable} type="hidden" />
    <input name="maxSendable" value={maxSendable} type="hidden" />
    <input name="callback" value={callback} type="hidden" />
    <input name="pin" value={$pin} type="hidden" />

    {#if commentAllowed}
      <textarea
        name="comment"
        placeholder={$t("payments.message")}
        class="w-full p-4 border rounded-xl h-32 text-xl"
        bind:value={comment}
        autocapitalize="none"
      />
    {/if}

    <div class="flex w-full">
      <button
        bind:this={send}
        type="submit"
        class="opacity-100 hover:opacity-80'} rounded-2xl border py-3 font-bold mx-auto mt-2 bg-black text-white px-4 w-24"
      >
        {#if loading}
          <Spinner />
        {:else}
          {$t("payments.send")}
        {/if}
      </button>
    </div>
  </form>
</div>
