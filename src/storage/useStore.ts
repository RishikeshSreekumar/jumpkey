import { useCallback, useEffect, useMemo, useState } from "react";
import type { Usage } from "../core";
import { ChromeLocalRepository } from "./chrome-local";
import type { Store } from "./schema";
import { devSeed, shouldSeed } from "./seed";

/** Shared hook: loads the Store and Usage once, tracks cross-context writes, exposes save/touch. */
export function useStore() {
  const repo = useMemo(() => new ChromeLocalRepository(), []);
  const [store, setStore] = useState<Store | null>(null);
  const [usage, setUsage] = useState<Usage>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [loaded, u] = await Promise.all([repo.load(), repo.loadUsage()]);
      if (cancelled) return;
      let s = loaded;
      if (s.commands.length === 0 && (await shouldSeed())) {
        s = { ...s, commands: devSeed() };
        await repo.save(s);
      }
      setStore(s);
      setUsage(u);
    })();
    const unsub = repo.subscribe((s) => setStore(s));
    return () => {
      cancelled = true;
      unsub();
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

  return { store, usage, save, touch };
}
