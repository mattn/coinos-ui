<script>
  import { fiat, f, focus, s, sat, sats } from "$lib/utils";
  import { scale } from "svelte/transition";
  import Icon from "$comp/Icon.svelte";
  import { toast } from "@zerodevx/svelte-toast";
  import { t } from "$lib/translations";

  export let data;
  let { amount, rate, tip, user } = data;
  let { currency, username } = user;
  amount = Math.abs(amount);

  toast.pop(0);
</script>

<div class="text-center mt-20 md:mt-0">
  <div class="flex w-full max-w-[200px] mx-auto py-4" in:scale={{ start: 0.5 }}>
    <Icon icon="check" style="mx-auto" />
  </div>
  <h1 class="text-3xl md:text-4xl font-bold mb-6">{$t("payments.sent")}!</h1>
  <h2 class="text-2xl md:text-3xl font-semibold">
    {f(fiat(amount, rate), currency)}
    {#if tip}
      <span class="text-lg">
        + {f(fiat(tip, rate), currency)}
      </span>
    {/if}
  </h2>
  <h3 class="text-secondary md:text-lg mb-6 mt-1">
    ⚡️{s(amount)}

    {#if tip}
      <span class="text-lg">
        + ⚡️{s(tip)}
      </span>
    {/if}
  </h3>
</div>

<a href={`/${username}`} use:focus>
  <div class="opacity-0 w-screen h-screen fixed top-0 left-0 z-50" />
</a>

<div class="fixed bottom-10 w-full text-center">
  {$t("payments.tapAnywhere")}
</div>
