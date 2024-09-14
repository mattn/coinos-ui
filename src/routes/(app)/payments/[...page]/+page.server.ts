import { get, auth } from "$lib/utils";

let limit = 25;

export async function load({ cookies, depends, params }) {
  depends("app:payments");

  let account = cookies.get("account");
  let parts = params.page.split("/");

  let start, end, page;
  if (parts.length === 1) [page] = parts;
  if (parts.length === 2) [start, page] = parts;
  if (parts.length === 3) [start, end, page] = parts;
  if (!parseInt(page)) page = 1;

  let offset = (page - 1) * limit;
  if (!start) start = Date.now() / 1000 - 24 * 60 * 60;

  let url = `/payments?account=${account}&start=${
    start * 1000
  }&limit=${limit}&offset=${offset}`;
  if (end) url += `&end=${end * 1000}`;

  let { count, payments, incoming, outgoing } = await get(url, auth(cookies));
  let pages = new Array(Math.ceil(count / limit));

  return { payments, page, pages, start, end, incoming, outgoing };
}