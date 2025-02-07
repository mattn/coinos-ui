<script>
  import { SvelteToast } from "@zerodevx/svelte-toast";
  import { onDestroy, onMount } from "svelte";
  import { close, connect, send } from "$lib/socket";
  import {
    last,
    invoice,
    request,
    ndef,
    passwordPrompt,
    password,
    pin,
  } from "$lib/store";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";
  import LoadingSplash from "$comp/LoadingSplash.svelte";
  import AppHeader from "$comp/AppHeader.svelte";
  import Invoice from "$comp/Invoice.svelte";
  import Password from "$comp/Password.svelte";
  import { getCookie, warning, protectedRoutes } from "$lib/utils";
  import { t, locale, loading } from "$lib/translations";
  import { goto, afterNavigate, preloadData } from "$app/navigation";

  export let data;

  let { generate, rate, user, subject, token, rates } = data;

  $: update(data);
  let update = (data) => {
    ({ rate, user, subject, token, rates } = data);
  };

  afterNavigate(() => {
    if (user) {
      preloadData(`/${user.username}`);
      preloadData(`/${user.username}/receive`);
      preloadData("/payments");
      preloadData("/send");
    }
  });

  onMount(async () => {
    if (browser) {
      checkSocket();
      $pin = getCookie("pin");

      if (window.NDEFReader && user.nfc) {
        try {
          $ndef = new NDEFReader();
          await $ndef.scan();

          $ndef.addEventListener("readingerror", (e) => {
            console.log("nfc error", e);
          });

          $ndef.addEventListener("reading", ({ message, serialNumber }) => {
            goto(`/send/${message}`);
          });
        } catch (error) {
          console.log("Argh! " + error);
        }
      }
    }
  });

  $: browser && connect(token);

  let lost,
    checkTimer,
    expireTimer,
    counter = 0;

  let checkSocket = () => {
    counter++;
    lost = Date.now() - $last > 30000;
    if (lost) connect(token);
    if (counter > 5) {
      send("heartbeat", token);
      counter = 0;
    }

    checkTimer = setTimeout(checkSocket, 1000);
  };

  onDestroy(() => {
    if (browser) {
      close();
      clearTimeout(checkTimer);
      clearTimeout(expireTimer);
    }
  });
</script>

{#if browser && user && $passwordPrompt}
  <Password {user} />
{/if}

<svelte:head>
  {#if subject}
    <title>coinos - {subject.username}</title>
    <meta name="lightning" content={`lnurlp:${subject.username}@coinos.io`} />
  {:else}
    <title>coinos</title>
  {/if}

  {#if subject?.profile}
    <meta name="og:image" content={`/api/public/${subject.profile}.webp`} />
  {:else}
    <meta property="og:image" content="/images/logo.webp" />
  {/if}
</svelte:head>

<SvelteToast options={{ reversed: true, intro: { y: 192 } }} />

<main class="pb-20">
  <AppHeader {user} {subject} />
  {#if !$loading}
    <slot />
  {/if}
</main>

{#if $invoice}
  <Invoice {user} />
{/if}
