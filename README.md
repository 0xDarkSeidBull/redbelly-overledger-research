# Could Redbelly connect to Quant Overledger? (TASK-29)

Live site: https://overledger.test-hub.xyz

A feasibility report on whether Redbelly Network could connect to Quant's Overledger, what that would take, and what it could offer institutions. It uses public sources only. Redbelly and Quant have no announced partnership or talks, and the report does not suggest otherwise.

## Deliverables

| Deliverable | File |
|---|---|
| The report, as PDF and Word | `public/downloads/redbelly-overledger-feasibility-report.pdf`, `public/downloads/redbelly-overledger-feasibility-report.docx` |
| The report as a web page: key findings, 7 diagrams, the community summary with copy buttons | `public/index.html` |
| The source list as a web page: every source, the exact words relied on, and where each is used | `public/sources.html` |
| Short community summary: a few paragraphs and a 6 post X thread | `COMMUNITY-SUMMARY.md` (also in the report and on the site) |
| Source list, with a link and the exact quoted words for every factual claim | `SOURCES.md` (also at the end of the report and on the site) |

## Short answer

| Question | Answer | Status |
|---|---|---|
| Could the Overledger Gateway reach Redbelly, for reading data and sending signed transactions? | Possibly, but unconfirmed: Redbelly fits the technical self-serve tests, but Overledger describes self-serve as for public permissionless networks, and writing to Redbelly needs a credential. Untested | Analysis |
| Can Redbelly join the Fusion Rollup (deposits, unified balances, cross-chain messages)? | Not possible yet, as far as public sources show | Analysis |
| Do Receptor credentials and Tokeniser rules travel with an asset to another chain? | No, not by themselves | Analysis |
| Is there any agreement between Redbelly and Quant? | None announced | Confirmed |

## How the report keeps facts, analysis and unknowns apart

Every paragraph carries one label:

- **Confirmed**: stated in a public source, which is linked and quoted.
- **Tested**: we ran the call ourselves on 15 October 2026. The log is in `evidence/tests/`.
- **Analysis**: our reasoning from the confirmed facts it cites.
- **Unknown**: not answered by any public source we found.

## One source for everything

| Path | What it holds |
|---|---|
| `content/report.json` | Every word of the report and the community summary. Claims cite facts as `{fact-id}` |
| `content/facts.json` | 97 facts, each with its source and the exact words quoted from it |
| `content/sources.json` | 38 sources: publisher, title, link and snapshot file |
| `content/diagrams.json` | The 7 diagrams: title, caption with citations, and the exact wording each one may show |
| `public/diagrams/` | The diagrams as hand-written SVG, a wide version for desktop and print and a narrow one for phones |
| `evidence/snapshots/` | A text snapshot of every source page as it read on 15 October 2026 |
| `evidence/tests/` | Output of our own JSON-RPC calls to Redbelly and of the calls to the public Overledger API |
| `evidence/manifest.json` | Address, capture time (UTC) and SHA-256 of every evidence file |
| `scripts/build.py` | Builds both web pages, the PDF, the Word file, `SOURCES.md` and `COMMUNITY-SUMMARY.md` |
| `scripts/site.css`, `scripts/site.js`, `scripts/print.css` | Website style and behaviour, and the print style used for the PDF |
| `scripts/render_diagram.py` | Renders one diagram to PNG and measures it: smallest text size, overlapping text, text outside its box |
| `scripts/check.py` | The quality gate, below |
| `scripts/snap_sources.py` | Recaptures every source page and rewrites the manifest |

## Check it

```
python3 scripts/check.py            # must end with RESULT: PASS
python3 scripts/check.py --online   # also confirms every source link answers today
```

`check.py` fails if:

- a quote is not found word for word in its snapshot, or a snapshot changed after capture (SHA-256)
- a labelled paragraph cites no source, a citation points to an unknown fact, or a source is never cited
- any sentence about Redbelly or Quant suggests a partnership, talks, plans or an agreement
- the text uses investment language or hype words, an en dash, an em dash or an emoji
- any deliverable contains a personal name or handle listed in a local, git-ignored `.credit-names` file
- an X post is over 280 characters
- the PDF, the Word file or the web page does not contain the current text of every paragraph, or the source page misses a quote
- a diagram breaks the SVG rules (brand palette only, prefixed ids, title and description, no styles, images or outside links), or its words break the wording rules above
- the website loads anything from another domain

To repeat the RPC test, run `eth_chainId` and `net_version` against `https://governors.mainnet.redbelly.network` (see `evidence/tests/rpc-check.txt`).

## Rebuild

```
pip install playwright python-docx
python3 scripts/build.py
python3 scripts/check.py
```

Playwright needs Chromium. `pdftotext` (poppler) is used by the check.

## The website

- **Report** (`index.html`): opens on the key findings and a list of 11 chapters, each with its reading time. A chapter opens on its own, with "Chapter 3 of 11", a progress bar, and Previous and Next at the end, so the report is not one long scroll. The side menu jumps between chapters, and links to a figure open the right chapter. It has seven diagrams (each can open full screen) and the community summary with a copy button for the paragraphs, each X post and the whole thread. Without JavaScript the page shows every chapter in one scroll, so nothing is lost.
- The side menu has two entries, Key findings and Chapters. Chapters opens a sub list of all 11 chapters, and it stays open while a chapter is shown.
- A bar at the bottom of the screen gives Chapters (a pop-up list), the chapter position with Previous and Next, the source list and back to top.
- When a chapter opens, its title types in behind a red block cursor, which disappears when the title is complete.
- Status labels (Confirmed, Tested, Analysis, Unknown), on the site and inside the diagrams, use a small coloured dot, not icons.
- **Sources** (`sources.html`): every source in groups, with the exact quoted words, where each is used in the report, and a filter. A citation such as S5 in the report opens the source list at S5 and marks it with a red box. Hovering a citation shows the quoted words first.
- A red button at the bottom left switches between the two pages, and a button at the bottom right goes back to the top.

## Deploy

The site is static. `public/` is the web root, so nothing outside it is served. On a VPS with Caddy, use `deploy/Caddyfile`:

```
git clone <this repository> /var/www/redbelly-overledger-research
# add deploy/Caddyfile to /etc/caddy/Caddyfile, then
sudo systemctl reload caddy
```

To update: `cd /var/www/redbelly-overledger-research && git pull`.

## Licences

- Fonts: Be Vietnam Pro and JetBrains Mono, SIL Open Font License 1.1 (`licenses/`), self-hosted from `public/fonts/`.
- Snapshots in `evidence/` are verbatim copies of third-party pages, kept only so every quote can be checked. They keep the source's own punctuation. One exception: in the TASK-08 guide copy, two personal names were replaced with [name removed], because the Task Board does not allow personal credit inside a deliverable; the file header and `evidence/manifest.json` say so.
- Logo: the official Redbelly DAO logo on dark, from the Task Board brand kit (taskboard.redbellydao.network/brand), used in the site header.
- Diagrams and icons are drawn for this report in SVG. No third-party images or icons are used.
