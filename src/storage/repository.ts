import type { Preferences, Usage } from "../core";
import type { Store } from "./schema";

export interface StoreRepository {
  load(): Promise<Store>;
  save(store: Store): Promise<void>;
  subscribe(listener: (store: Store) => void): () => void;

  loadUsage(): Promise<Usage>;
  touchUsage(commandId: string): Promise<void>;

  loadPreferences(): Promise<Preferences>;
  savePreferences(prefs: Preferences): Promise<void>;
  subscribePreferences(listener: (prefs: Preferences) => void): () => void;
}
