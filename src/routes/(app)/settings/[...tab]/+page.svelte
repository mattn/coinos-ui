<script>
  import { browser } from "$app/environment";
  import { onMount, tick } from "svelte";
  import { fly } from "svelte/transition";
  import { applyAction, deserialize } from "$app/forms";

  import Icon from "$comp/Icon.svelte";
  import Spinner from "$comp/Spinner.svelte";
  import Pin from "$comp/Pin.svelte";
  import { loading, t } from "$lib/translations";
  import { fail, auth, post, sleep, warning, success } from "$lib/utils";
  import { avatar, banner, password, pin } from "$lib/store";
  import { upload } from "$lib/upload";
  import { page } from "$app/stores";
  import { sign, send, reEncryptEntropy, setNsec } from "$lib/nostr";
  import { invalidateAll } from "$app/navigation";

  import Account from "./_account.svelte";
  import Pos from "./_pos.svelte";
  import Security from "./_security.svelte";
  import Shopify from "./_shopify.svelte";

  import { PUBLIC_COINOS_URL } from "$env/static/public";

  export let data;
  export let form;

  let submit;
  let formElement;

  let { user, token, rates, tab, cookies, subscriptions } = data;
  let prev;

  $: update(data);
  let update = () => {
    ({ user, token, rates, tab, subscriptions } = data);
    prev = { ...user };
  };

  $: form?.user && ({ user } = form);

  $: form?.success && throttledSuccess();

  let justUpdated;
  let throttledSuccess = () => {
    if (!justUpdated) {
      justUpdated = true;
      success($t("user.settings.saved"), false);
      setTimeout(() => (justUpdated = false), 5000);
    }
  };

  $: form?.message && fail(form.message);

  $: if (form?.message?.startsWith("Pin")) {
    fail("Wrong pin, try again");
    $pin = "";
  }

  let tabs = [
    { name: "account", key: "ACCOUNT", comp: Account },
    { name: "pos", key: "POINT_OF_SALE", comp: Pos },
    { name: "security", key: "SECURITY", comp: Security },
    { name: "shopify", key: "SHOPIFY", comp: Shopify },
  ];

  $: ({ comp } = tabs.find((t) => t.name === tab));

  let { address, id, username } = user;
  let submitting;

  $: if (!$loading && $page.url.searchParams.get("verified"))
    success($t("user.settings.verified"));

  async function handleSubmit() {
    try {
      submitting = true;
      let data = new FormData(formElement);

      if (data.get("newNsec")) {
        await setNsec(user, data.get("newNsec"));
        data.set("nsec", user.nsec);
        data.set("pubkey", user.pubkey);
      }

      if (data.get("password")) {
        try {
          data.set(
            "cipher",
            await reEncryptEntropy(user, data.get("password")),
          );
        } catch (e) {
          console.log("Failed to encrypt keys with new password");
          throw e;
        }
      }

      if ($avatar) {
        try {
          let { hash } = JSON.parse(
            await upload($avatar.file, $avatar.type, $avatar.progress, token),
          );

          data.set("profile", hash);

          await fetch(`/api/public/${hash}.webp`, {
            cache: "reload",
            mode: "no-cors",
          });
        } catch (e) {
          console.log("problem upsubmitting avatar", e);
        }
      }

      if ($banner) {
        try {
          let { hash } = JSON.parse(
            await upload($banner.file, $banner.type, $banner.progress, token),
          );

          data.set("banner", hash);

          await fetch(`/api/public/${hash}.webp`, {
            cache: "reload",
            mode: "no-cors",
          });
        } catch (e) {
          console.log("problem upsubmitting banner", e);
        }
      }

      if (["username", "address", "profile"].some((a) => user[a] !== prev[a])) {
        let event = {
          pubkey: user.pubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          content: JSON.stringify({
            name: user.username,
            about: user.address,
            picture: `${$page.url.origin}/public/${user.profile}.webp`,
          }),
          tags: [],
        };

        try {
          await sign({ event, user });
          await send(event);
        } catch (e) {
          warning("Nostr profile could not be updated");
        }
      }

      if (user.email !== prev.email) {
        try {
          cookies.get = function (n) {
            return this.find((c) => c.name === n).value;
          };

          user.verified = false;

          await post(
            "/api/request",
            { id: user.id, email: user.email },
            auth(cookies),
          );

          warning($t("user.settings.verifying"), false);
        } catch (e) {
          fail(e.message);
          console.log(e);
        }
      }

      const response = await fetch(formElement.action, {
        method: "POST",
        body: data,
      });

      const result = deserialize(await response.text());

      if (result.type === "success") {
        await invalidateAll();
        if (data.get("password")) $password = data.get("password");
      }

      applyAction(result);
    } catch (e) {
      console.log(e);
      fail("Something went wrong");
    }

    submitting = false;
  }
</script>

{#if user.haspin && $pin?.length !== 6}
  <Pin />
{/if}

<form
  method="POST"
  class="mb-[154px] settings"
  on:submit|preventDefault={handleSubmit}
  bind:this={formElement}
>
  <input type="hidden" name="pin" value={$pin} />
  <input type="hidden" name="tab" value={tab} />

  <div class="mt-24 mb-20 px-3 md:px-0 w-full md:max-w-lg mx-auto space-y-8">
    <div class="header">
      <h1 class="text-center text-3xl md:text-4xl font-semibold mb-10">
        {$t("user.settings.header")}
      </h1>

      <div
        class="font-bold flex justify-around items-center border-b pb-3 text-secondary"
      >
        {#each tabs.filter((t) => t.name !== "shopify") as { name, key }}
          <a href={`/settings/${name}`}>
            <button
              type="button"
              class="hover:opacity-80"
              class:text-black={tab === name ||
                (tab === "shopify" && name === "pos")}
              >{$t(`user.settings.${key}`)}</button
            >
          </a>
        {/each}
      </div>
    </div>

    <svelte:component this={comp} {user} {rates} {submit} {subscriptions} />
  </div>

  <div
    class="z-10 fixed bottom-0 bg-white shadow border-t w-full flex justify-center items-center py-3"
  >
    <button
      bind:this={submit}
      type="submit"
      class="border-2 border-black rounded-xl font-semibold mx-auto py-3 w-40 hover:opacity-80"
      class:bg-black={submitting}
    >
      {#if submitting}
        <Spinner />
      {:else}
        <div class="my-auto">{$t("user.settings.saveSettings")}</div>
      {/if}
    </button>
  </div>
</form>
