import type { NavTarget } from "../core";
import { openUrls } from "../shared/open";

export async function navigate(urls: readonly string[], target: NavTarget): Promise<void> {
  await openUrls(urls, target);
  window.close();
}
