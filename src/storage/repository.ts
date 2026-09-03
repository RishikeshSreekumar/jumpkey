import type { Usage } from "../core";
import type { Store } from "./schema";

export interface StoreRepository {
  load(): Promise<Store>;
  save(store: Store): Promise<void>;
  /** Fires when another context (popup/options) writes. Returns unsubscribe. */
  subscribe(listener: (store: Store) => void): () => void;

  /**
   * Usage lives under its own key so the Launcher can record an invocation
   * without racing the options page on the whole Store blob.
   */
  loadUsage(): Promise<Usage>;
  touchUsage(commandId: string): Promise<void>;
}
