# trgo extension: store listing

Text for the Chrome Web Store and Firefox AMO.

## Name

trgo

## Short summary (max 132 characters)

Optional helper for trgo. It reads marketplace pages in your own browser, so more sites work.

## Description

trgo is a shopping helper that searches online marketplaces. This
extension is optional. It lets the trgo page read some marketplace pages
directly in your own browser.

With the extension, trgo can search Njuškalo.hr. The site blocks
requests from servers, but it accepts a request from your browser.

The extension collects no data. It has no analytics and no remote code.
It reads a page only when the trgo page asks. It sends nothing to the
trgo developer.

After you install it, open the welcome page and click "Allow access".
Firefox needs this step to grant access to the sites.

## Category

Shopping

## Single purpose

The extension fetches marketplace pages for the trgo web page, directly
from the browser of the user, when the trgo page asks.

## Host permission justifications

Each permission lets the extension fetch search or listing pages for the
trgo page. The extension does nothing else with them.

- `https://api.olx.ba/*`: the OLX.ba search and listing API.
- `https://svex.ba/*`: the SVEX.ba site.
- `https://listing.api.svex.ba/*`: the SVEX.ba listing API.
- `https://search.api.svex.ba/*`: the SVEX.ba search API.
- `https://www.kupujemprodajem.com/*`: the KupujemProdajem search pages.
- `https://www.njuskalo.hr/*`: the Njuškalo search pages. The extension
  allows only paths under `/search/`. This is the one site that gets the
  cookies of the user, because the site needs them.

- `https://trgo.omarzunic.com/*` and `https://trgo.omznc.workers.dev/*`:
  the trgo pages. The content script runs only there. Firefox runs a
  content script only on hosts that the user allowed.

The extension has no other permission.

## Data use answers

- Personally identifiable information: not collected.
- Health information: not collected.
- Financial and payment information: not collected.
- Authentication information: not collected.
- Personal communications: not collected.
- Location: not collected.
- Web history: not collected.
- User activity: not collected.
- Website content: the extension does not keep it or send it to the
  developer. It passes each page to the trgo page in the same browser.
  The trgo page sends the listing text to the AI model (OpenRouter) to
  answer the user, as the privacy policy says. If the store form asks
  about the web page too, answer "website content: used for the core
  function, sent to the AI provider, not sold".
- Firefox `data_collection_permissions`: `none`.

Certifications: the data is not sold, not used for other purposes and
not used for credit decisions.

## Privacy policy URL

https://github.com/omznc/trgo/blob/main/docs/extension-privacy.md

## Source code note for AMO

The zip is built from the folder `apps/extension` of the repository.
The code is not minified. To build it:

```
bun install && bun run --cwd apps/extension build
```

The build writes `apps/extension/dist/firefox` and the zip
`apps/extension/dist/trgo-firefox-<version>.zip`.

## What the owner must do by hand

1. Create a Chrome Web Store developer account and pay the one-time fee.
2. Create a Firefox AMO developer account.
3. Upload `dist/trgo-chrome-<version>.zip` to the Chrome Web Store.
4. Upload `dist/trgo-firefox-<version>.zip` to AMO, with the source note.
5. Add screenshots of 1280x800 pixels to both listings.
6. Paste the text of this file and the privacy policy URL.
7. Submit both listings for review.
