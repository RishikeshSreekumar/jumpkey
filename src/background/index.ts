import { registerOmnibox } from "./omnibox";

registerOmnibox();

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-options") void chrome.runtime.openOptionsPage();
});

// First install: the popup would be empty and the shortcut unknown, so land on the manage page.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") void chrome.runtime.openOptionsPage();
});
