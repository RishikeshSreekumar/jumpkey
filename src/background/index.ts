import { registerOmnibox } from "./omnibox";
import { registerContextMenu } from "./contextMenu";
import { registerSync } from "./sync";

registerOmnibox();
registerContextMenu();
registerSync();

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-options") void chrome.runtime.openOptionsPage();
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") void chrome.runtime.openOptionsPage();
});
