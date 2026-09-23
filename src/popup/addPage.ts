import { validateUrl } from "../core";

export type AddPageResult = { ok: true } | { ok: false; error: string };

export async function addCurrentPage(): Promise<AddPageResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url;
  if (!url) return { ok: false, error: "Can't read this page's URL." };
  const valid = validateUrl(url);
  if (!valid.ok) return { ok: false, error: "Only http(s) pages can become commands." };

  const target = new URL(chrome.runtime.getURL("src/options/index.html"));
  target.searchParams.set("from", valid.url);
  if (tab.title) target.searchParams.set("title", tab.title);
  await chrome.tabs.create({ url: target.href, active: true });
  window.close();
  return { ok: true };
}
