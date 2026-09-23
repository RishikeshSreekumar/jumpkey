import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PREFERENCES, type Preferences, type Usage } from "../core";
import { ChromeLocalRepository } from "./chrome-local";
import type { Store } from "./schema";
import { devSeed, shouldSeed } from "./seed";

export function useStore() {
  const repo = useMemo(() => new ChromeLocalRepository(), []);
  const [store, setStore] = useState<Store | null>(null);
  const [usage, setUsage] = useState<Usage>({});
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [loaded, u, p] = await Promise.all([repo.load(), repo.loadUsage(), repo.loadPreferences()]);
      if (cancelled) return;
      let s = loaded;
      if (s.commands.length === 0 && (await shouldSeed())) {
        s = { ...s, commands: devSeed() };
        await repo.save(s);
      }
      setStore(s);
      setUsage(u);
      setPrefs(p);
    })();
    const unsub = repo.subscribe((s) => setStore(s));
    const unsubPrefs = repo.subscribePreferences((p) => setPrefs(p));
    return () => {
      cancelled = true;
      unsub();
      unsubPrefs();
    };
  }, [repo]);

  const save = useCallback(
    async (next: Store) => {
      setStore(next);
      await repo.save(next);
    },
    [repo],
  );

  const touch = useCallback(
    async (commandId: string) => {
      setUsage((u) => ({ ...u, [commandId]: Date.now() }));
      await repo.touchUsage(commandId);
    },
    [repo],
  );

  const savePrefs = useCallback(
    async (next: Preferences) => {
      setPrefs(next);
      await repo.savePreferences(next);
    },
    [repo],
  );

  return { store, usage, prefs, save, touch, savePrefs };
}
