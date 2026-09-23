import { ChromeLocalRepository, asPreferences } from "../storage/chrome-local";
import { ORDER_KEY, SYNC_STATUS_KEY, fromSyncItems, mergeCommands, sameCommands, syncDiff, toSyncItems, type SyncStatus } from "../storage/sync";

const STORE_KEY = "store";
const PREFS_KEY = "prefs";

const repo = new ChromeLocalRepository();

const enabled = async () => (await repo.loadPreferences()).sync;

const setStatus = (status: SyncStatus) => chrome.storage.local.set({ [SYNC_STATUS_KEY]: status });

async function push(): Promise<void> {
  if (!(await enabled())) return;
  const [store, current] = await Promise.all([repo.load(), chrome.storage.sync.get(null)]);
  const { set, remove } = syncDiff(current, toSyncItems(store.commands));
  // remove before set so a pull in between never brings a deleted command back
  if (remove.length > 0) await chrome.storage.sync.remove(remove);
  if (Object.keys(set).length > 0) await chrome.storage.sync.set(set);
  await setStatus({ ok: true, at: Date.now() });
}

async function pull(): Promise<void> {
  if (!(await enabled())) return;
  const items = await chrome.storage.sync.get(null);
  if (!(ORDER_KEY in items)) return;
  const remote = fromSyncItems(items);
  const store = await repo.load();
  if (!sameCommands(remote, store.commands)) await repo.save({ ...store, commands: remote });
  await setStatus({ ok: true, at: Date.now() });
}

async function start(): Promise<void> {
  const [items, store] = await Promise.all([chrome.storage.sync.get(null), repo.load()]);
  const merged = ORDER_KEY in items ? mergeCommands(store.commands, fromSyncItems(items)) : store.commands;
  if (!sameCommands(merged, store.commands)) await repo.save({ ...store, commands: merged });
  await push();
}

let chain: Promise<void> = Promise.resolve();
const schedule = (step: () => Promise<void>) => {
  chain = chain.then(step).catch(async (e: unknown) => {
    console.warn("JumpKey sync:", e);
    await setStatus({ ok: false, at: Date.now(), error: e instanceof Error ? e.message : String(e) });
  });
};

export function registerSync() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      schedule(pull);
      return;
    }
    if (area !== "local") return;
    if (changes[STORE_KEY]) schedule(push);
    const prefs = changes[PREFS_KEY];
    if (prefs && asPreferences(prefs.newValue).sync && !asPreferences(prefs.oldValue).sync) schedule(start);
  });
  chrome.runtime.onStartup.addListener(() => schedule(pull));
}
