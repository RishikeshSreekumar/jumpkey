import type { NavTarget } from "../core";

export async function navigate(url: string, target: NavTarget): Promise<void> {
  if (target === "current-tab") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) await chrome.tabs.update(tab.id, { url });
    else await chrome.tabs.create({ url, active: true });
  } else {
    await chrome.tabs.create({ url, active: target !== "background-tab" });
  }
  window.close();
}
