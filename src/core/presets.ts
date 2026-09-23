import type { CommandDraft } from "./types";

export type SetupField = { key: string; label: string; placeholder: string; kind: "subdomain" | "path"; segments?: number };

export type Preset = {
  id: string;
  group: string;
  name: string;
  keyword: string;
  template: string;
  pattern?: string;
  example: string;
  setup?: SetupField[];
};

const JIRA_KEY = "[A-Z][A-Z0-9]+-\\d+";

export const PRESETS: readonly Preset[] = [
  // tickets
  { id: "jira", group: "Tickets", name: "Jira ticket", keyword: "jira", template: "https://[[site]].atlassian.net/browse/{ticket}", pattern: JIRA_KEY, example: "ENG-482",
    setup: [{ key: "site", label: "Jira site", placeholder: "yourcompany", kind: "subdomain" }] },
  { id: "confluence", group: "Tickets", name: "Confluence search", keyword: "conf", template: "https://[[site]].atlassian.net/wiki/search?text={query*}", example: "onboarding checklist",
    setup: [{ key: "site", label: "Atlassian site", placeholder: "yourcompany", kind: "subdomain" }] },
  { id: "linear", group: "Tickets", name: "Linear issue", keyword: "lin", template: "https://linear.app/[[workspace]]/issue/{issue}", pattern: JIRA_KEY, example: "ENG-482",
    setup: [{ key: "workspace", label: "Linear workspace", placeholder: "yourcompany", kind: "path", segments: 1 }] },
  { id: "zendesk", group: "Tickets", name: "Zendesk ticket", keyword: "zd", template: "https://[[subdomain]].zendesk.com/agent/tickets/{ticket}", example: "88410",
    setup: [{ key: "subdomain", label: "Zendesk subdomain", placeholder: "yourcompany", kind: "subdomain" }] },

  // code
  { id: "gh-pr", group: "Code", name: "GitHub pull request", keyword: "pr", template: "https://github.com/{repo=[[repo]]}/pull/{number}", pattern: "\\d+", example: "1297",
    setup: [{ key: "repo", label: "Default repository", placeholder: "owner/repo", kind: "path", segments: 2 }] },
  { id: "gh-issue", group: "Code", name: "GitHub issue", keyword: "issue", template: "https://github.com/{repo=[[repo]]}/issues/{number}", pattern: "\\d+", example: "42",
    setup: [{ key: "repo", label: "Default repository", placeholder: "owner/repo", kind: "path", segments: 2 }] },
  { id: "gh-repo", group: "Code", name: "GitHub repository", keyword: "gh", template: "https://github.com/{repo}", example: "facebook/react" },
  { id: "npm", group: "Code", name: "npm package", keyword: "npm", template: "https://www.npmjs.com/package/{package}", example: "react" },
  { id: "mdn", group: "Code", name: "MDN search", keyword: "mdn", template: "https://developer.mozilla.org/en-US/search?q={query*}", example: "array flat" },

  // customers and orders
  { id: "stripe-customer", group: "Customers and orders", name: "Stripe customer", keyword: "cus", template: "https://dashboard.stripe.com/customers/{customer}", pattern: "cus_[A-Za-z0-9]+", example: "cus_Pq2x9" },
  { id: "stripe-payment", group: "Customers and orders", name: "Stripe payment", keyword: "pay", template: "https://dashboard.stripe.com/payments/{payment}", pattern: "(pi|ch|py)_[A-Za-z0-9]+", example: "pi_3Nk2" },
  { id: "stripe-invoice", group: "Customers and orders", name: "Stripe invoice", keyword: "inv", template: "https://dashboard.stripe.com/invoices/{invoice}", pattern: "in_[A-Za-z0-9]+", example: "in_1Ab4" },
  { id: "shopify-order", group: "Customers and orders", name: "Shopify order", keyword: "order", template: "https://admin.shopify.com/store/[[store]]/orders/{order}", example: "5531",
    setup: [{ key: "store", label: "Shopify store handle", placeholder: "your-store", kind: "path" }] },
  { id: "hubspot-contact", group: "Customers and orders", name: "HubSpot contact", keyword: "contact", template: "https://app.hubspot.com/contacts/[[portal]]/record/0-1/{id}", example: "20931",
    setup: [{ key: "portal", label: "HubSpot account ID", placeholder: "1234567", kind: "path" }] },
  { id: "ups", group: "Customers and orders", name: "UPS tracking", keyword: "ups", template: "https://www.ups.com/track?tracknum={tracking}", pattern: "1Z[0-9A-Z]{16}", example: "1Z999AA10123456784" },

  // everyday
  { id: "google", group: "Everyday", name: "Google", keyword: "g", template: "https://www.google.com/search?q={query*}", example: "weather tomorrow" },
  { id: "drive", group: "Everyday", name: "Google Drive search", keyword: "drive", template: "https://drive.google.com/drive/search?q={query*}", example: "q3 budget" },
  { id: "gmail", group: "Everyday", name: "Gmail search", keyword: "mail", template: "https://mail.google.com/mail/u/0/#search/{query*}", example: "from:alex invoice" },
  { id: "maps", group: "Everyday", name: "Google Maps", keyword: "map", template: "https://www.google.com/maps/search/{place*}", example: "coffee near me" },
  { id: "youtube", group: "Everyday", name: "YouTube", keyword: "yt", template: "https://www.youtube.com/results?search_query={query*}", example: "sourdough starter" },
  { id: "wikipedia", group: "Everyday", name: "Wikipedia", keyword: "wiki", template: "https://en.wikipedia.org/w/index.php?search={query*}", example: "Ada Lovelace" },
  { id: "translate", group: "Everyday", name: "Google Translate", keyword: "tr", template: "https://translate.google.com/?sl=auto&tl=en&text={text*}", example: "bonjour tout le monde" },
];

function cleanSetup(field: SetupField, raw: string): string {
  let v = raw.trim();
  const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? safeUrl(v) : null;
  if (field.kind === "subdomain") {
    const host = url ? url.hostname : v.split("/")[0]!;
    return host.split(".")[0]!;
  }
  if (url) v = url.pathname;
  v = v.replace(/^\/+|\/+$/g, "");
  return field.segments ? v.split("/").slice(0, field.segments).join("/") : v;
}

function safeUrl(v: string): URL | null {
  try {
    return new URL(v);
  } catch {
    return null;
  }
}

export function missingSetup(preset: Preset, values: Readonly<Record<string, string>>): SetupField[] {
  return (preset.setup ?? []).filter((f) => cleanSetup(f, values[f.key] ?? "") === "");
}

export function presetDraft(preset: Preset, values: Readonly<Record<string, string>> = {}): CommandDraft {
  let template = preset.template;
  for (const f of preset.setup ?? []) template = template.split(`[[${f.key}]]`).join(cleanSetup(f, values[f.key] ?? ""));
  return {
    keyword: preset.keyword,
    name: preset.name,
    template,
    openMode: "foreground-tab",
    ...(preset.pattern ? { pattern: preset.pattern } : {}),
  };
}
