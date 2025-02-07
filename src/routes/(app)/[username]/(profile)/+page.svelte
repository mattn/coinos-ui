<script>
  import { btc, f, sat } from "$lib/utils";
  import Icon from "$comp/Icon.svelte";
  import Account from "$comp/Account.svelte";
  import Balance from "$comp/Balance.svelte";
  import Items from "$comp/Items.svelte";
  import { t } from "$lib/translations";
  import { installPrompt } from "$lib/store";
  import { afterNavigate, preloadData } from "$app/navigation";

  export let data;

  afterNavigate(() => {
    preloadData(`/${user.username}/receive`);
    preloadData("/send");
  });

  let { accounts, subject, user, items, rates } = data;
  $: ({ currency } = subject);
  $: rate = rates[currency];
  $: total = items.reduce((a, b) => a + b.price * b.quantity, 0);

  let refresh = (d) => ({ accounts, items, subject, user, rates } = d);
  $: refresh(data);

  let install = async () => {
    if (!$installPrompt) return;
    await $installPrompt.prompt();
    $installPrompt = null;
  };

  if (user) user.savings = 0;
</script>

<div class="space-y-2">
  {#if user?.id === subject.id}
    <div class="space-y-5" data-sveltekit-preload-data="false">
      {#each accounts as account, i}
        <Account {user} {rate} {account} last={i === accounts.length - 1} />
      {/each}
    </div>

    <a href={`/account/savings`} class="contents">
      <button
        class="rounded-2xl py-5 px-6 hover:opacity-80 flex w-full justify-center bg-primary"
      >
        <div class="mx-auto flex gap-2">
          <Icon icon="plus" style="w-8 mx-auto" />
          <div class="my-auto text-xl whitespace-nowrap">
            {$t("accounts.addAccount")}
          </div>
        </div>
      </button>
    </a>

    {#if $installPrompt}
      <button
        class="rounded-2xl border py-5 px-6 font-bold hover:opacity-80 flex bg-black text-white xl:hidden w-full justify-center"
        on:click={install}
      >
        <div class="mx-auto flex gap-2">
          <Icon icon="save" style="w-8 mx-auto invert" />
          <div class="my-auto text-xl whitespace-nowrap">
            {$t("user.install")}
          </div>
        </div>
      </button>
    {/if}
  {/if}

  <Items {items} {subject} {user} {total} {currency} {rate} />

  <div
    class="fixed inset-x-0 mx-auto flex bottom-16"
    class:static={!items.length}
  >
    {#if total > 0}
      <button
        class="rounded-2xl py-5 px-6 font-bold hover:bg-neutral-700 flex bg-black text-white mx-auto"
        on:click={checkout}
      >
        <div class="mx-auto flex">
          <div class="my-auto text-2xl">
            {$t("user.dashboard.checkout")}
            {f(total, currency)}
            <span class="text-base">
              {sat(btc(total, rate), currency)}
            </span>
          </div>
        </div>
      </button>
    {:else if user?.username !== subject.username && (!subject.anon || subject.lud16)}
      <a
        href={subject.anon
          ? `/send/${encodeURIComponent(subject.lud16)}`
          : `/pay/${subject.username}`}
        class="contents"
      >
        <button
          class="rounded-2xl py-5 px-6 min-w-[200px] font-bold hover:bg-neutral-700 flex bg-black text-white mx-auto"
        >
          <div class="mx-auto flex gap-2">
            <div class="text-4xl my-auto">⚡️</div>
            <div class="my-auto text-2xl">
              {$t("user.pay")}
              {subject.username}
            </div>
          </div>
        </button>
      </a>
    {/if}
  </div>
</div>

<style>
  .custom-shadow-item {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    visibility: visible;
    background: #333;
    opacity: 0.5;
    margin: 0;
  }

  .bottom-half {
    @apply bottom-1/2;
  }
</style>
