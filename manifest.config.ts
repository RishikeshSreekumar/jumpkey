import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "JumpKey",
  description: "A command palette for parameterized URLs.",
  version: "0.0.1",
  permissions: ["storage", "activeTab"],
  icons: {
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  },
  action: {
    default_popup: "src/popup/index.html",
    default_title: "JumpKey",
    default_icon: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
    },
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  omnibox: { keyword: "jk" },
  commands: {
    _execute_action: {
      suggested_key: { default: "Ctrl+Shift+K", mac: "Command+Shift+K" },
      description: "Open JumpKey launcher",
    },
    "open-options": {
      suggested_key: { default: "Ctrl+Shift+O", mac: "Command+Shift+O" },
      description: "Manage JumpKey commands",
    },
  },
});
