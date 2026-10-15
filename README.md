# Could Redbelly connect to Quant Overledger? (TASK-29)

Live site: https://overledger.test-hub.xyz

A feasibility report on whether Redbelly Network could connect to Quant's Overledger, what that would take, and what it could offer institutions. It uses public sources only. Redbelly and Quant have no announced partnership or talks, and the report does not suggest otherwise.

## Deliverables

| Deliverable | File |
|---|---|
| The report, as PDF and Word | `public/downloads/redbelly-overledger-feasibility-report.pdf`, `public/downloads/redbelly-overledger-feasibility-report.docx` |
| The report as a web page, with the community summary and source list | `public/index.html` |
| Short community summary: a few paragraphs and a 6 post X thread | `COMMUNITY-SUMMARY.md` (also in the report and on the site) |
| Source list, with a link and the exact quoted words for every factual claim | `SOURCES.md` (also at the end of the report and on the site) |

## Short answer

| Question | Answer | Status |
|---|---|---|
| Can Redbelly reach the Overledger Gateway, for reading data and sending signed transactions? | Possibly yes, as a self-serve EVM network, but untested | Analysis |
| Can Redbelly join the Fusion Rollup (deposits, unified balances, cross-chain messages)? | Not possible yet | Confirmed |
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
| `content/facts.json` | 82 facts, each with its source and the exact words quoted from it |
| `content/sources.json` | 38 sources: publisher, title, link and snapshot file |
| `evidence/snapshots/` | A text snapshot of every source page as it read on 15 October 2026 |
| `evidence/tests/` | Output of our own JSON-RPC calls to Redbelly and of the calls to the public Overledger API |
| `evidence/manifest.json` | Address, capture time (UTC) and SHA-256 of every evidence file |
| `scripts/build.py` | Builds the web page, PDF, Word file, `SOURCES.md` and `COMMUNITY-SUMMARY.md` |
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
- the PDF, the Word file or the web page does not contain the current text of every paragraph

To repeat the RPC test, run `eth_chainId` and `net_version` against `https://governors.mainnet.redbelly.network` (see `evidence/tests/rpc-check.txt`).

## Rebuild

```
pip install playwright python-docx
python3 scripts/build.py
python3 scripts/check.py
```

Playwright needs Chromium. `pdftotext` (poppler) is used by the check.

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
- Snapshots in `evidence/` are verbatim copies of third-party pages, kept only so every quote can be checked. They keep the source's own punctuation and names.
- No third-party images, icons or logos are used.
