#!/usr/bin/env python3
"""Builds every output from content/report.json, content/facts.json and content/sources.json:
  public/index.html                      the report as a web page, with the community summary and source list
  public/downloads/*.pdf, *.docx         the report as PDF (Playwright print) and Word (python-docx)
  SOURCES.md, COMMUNITY-SUMMARY.md       the source list and the community summary as Markdown
  evidence/manifest.json                 URL, capture time (UTC) and SHA-256 of every evidence file
"""
import hashlib, html, json, re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://overledger.test-hub.xyz"
PDF_NAME = "redbelly-overledger-feasibility-report.pdf"
DOCX_NAME = "redbelly-overledger-feasibility-report.docx"
LABELS = {"confirmed": "Confirmed", "tested": "Tested", "analysis": "Analysis", "unknown": "Unknown"}

R = json.loads((ROOT / "content/report.json").read_text())
FACTS = {f["id"]: f for f in json.loads((ROOT / "content/facts.json").read_text())}
SOURCES = {s["id"]: s for s in json.loads((ROOT / "content/sources.json").read_text())}
CITE = re.compile(r"\{([a-z0-9 -]+)\}")

# Number sources in order of first citation.
order = []
def walk_text():
    yield R["status_note"]
    for k in R["key_findings"]:
        yield "{" + k["cite"] + "}"
    for s in R["sections"]:
        yield s.get("intro", "")
        for b in s["blocks"]:
            yield b.get("text", "")
            for li in b.get("list", []):
                yield li
            for row in b.get("rows", []):
                yield "{" + row[2] + "}"
for t in walk_text():
    for m in CITE.finditer(t):
        for fid in m.group(1).split():
            sid = FACTS[fid]["source"]
            if sid not in order:
                order.append(sid)
NUM = {sid: i + 1 for i, sid in enumerate(order)}

def src_href(s):
    return s["url"] if not s.get("local") else s["url"]

def cite_nums(ids):
    nums = sorted({NUM[FACTS[f]["source"]] for f in ids.split()})
    return nums

def render_html(t):
    out, last = [], 0
    for m in CITE.finditer(t):
        out.append(html.escape(t[last:m.start()]).rstrip())
        nums = cite_nums(m.group(1))
        out.append("<sup class='cite'>[" + ", ".join(f"<a href='#src-{n}'>{n}</a>" for n in nums) + "]</sup>")
        last = m.end()
    out.append(html.escape(t[last:]))
    return "".join(out).replace(" <sup", "<sup")

def render_plain(t):
    def rep(m):
        return " [" + ", ".join(str(n) for n in cite_nums(m.group(1))) + "]"
    return re.sub(r"\s*\{([a-z0-9 -]+)\}", rep, t)

def chip(label):
    return f"<span class='chip {label}'>{LABELS[label]}</span>" if label in LABELS else ""

# ---------- HTML ----------
def body_html(print_mode=False):
    h = []
    h.append(f"<header class='top'><p class='kicker'>Feasibility report · {html.escape(R['date'])}</p><h1>{html.escape(R['title'])}</h1>"
             f"<p class='sub'>{html.escape(R['subtitle'])}</p><p class='status'>{render_html(R['status_note'])}</p></header>")
    h.append("<section id='labels'><h2>How to read this report</h2><dl class='legend'>" +
             "".join(f"<dt>{chip(k)}</dt><dd>{html.escape(v)}</dd>" for k, v in R["labels"].items()) + "</dl></section>")
    h.append("<section id='findings'><h2>Key findings</h2><table class='findings'><thead><tr><th>Question</th><th>Answer</th><th>Status</th></tr></thead><tbody>")
    for k in R["key_findings"]:
        h.append(f"<tr><td>{html.escape(k['q'])}</td><td>{render_html(k['a'] + ' {' + k['cite'] + '}')}</td><td>{chip(k['label'])}</td></tr>")
    h.append("</tbody></table></section>")
    for s in R["sections"]:
        h.append(f"<section id='{s['id']}'><h2>{html.escape(s['title'])}</h2>")
        if s.get("intro"):
            h.append(f"<p class='intro'>{render_html(s['intro'])}</p>")
        for b in s["blocks"]:
            lab = b["label"]
            if lab == "summary_table":
                h.append("<table class='open'><thead><tr><th>Question</th><th>Answer today</th></tr></thead><tbody>" +
                         "".join(f"<tr><td>{html.escape(r[0])}</td><td>{render_html(r[1] + ' {' + r[2] + '}')}</td></tr>" for r in b["rows"]) +
                         "</tbody></table>")
                continue
            h.append(f"<div class='block {lab}'>")
            if lab in LABELS:
                h.append(chip(lab))
            if b.get("heading"):
                h.append(f"<h3>{html.escape(b['heading'])}</h3>")
            if b.get("text"):
                h.append(f"<p>{render_html(b['text'])}</p>")
            if b.get("list"):
                h.append("<ul>" + "".join(f"<li>{render_html(li)}</li>" for li in b["list"]) + "</ul>")
            h.append("</div>")
        h.append("</section>")
    cs = R["community_summary"]
    h.append("<section id='summary'><h2>Community summary</h2><p class='intro'>Plain language, ready to share. The same text is in COMMUNITY-SUMMARY.md.</p>")
    h.append("<div class='summary'>" + "".join(f"<p>{html.escape(p)}</p>" for p in cs["paragraphs"]) + "</div>")
    h.append("<h3>As an X thread</h3><ol class='thread'>" + "".join(f"<li>{html.escape(t.replace('{site}', SITE))}</li>" for t in cs["thread"]) + "</ol></section>")
    h.append("<section id='sources'><h2>Source list</h2><p class='intro'>Every factual claim links to one of these sources. Under each source are the exact words the report relies on. "
             "Text snapshots of every page, with SHA-256 hashes, are in evidence/ in the project repository.</p><ol class='sources'>")
    for sid in order:
        s = SOURCES[sid]; n = NUM[sid]
        quotes = [f for f in FACTS.values() if f["source"] == sid and used(f["id"])]
        link = (f"<a href='{html.escape(s['url'])}'>{html.escape(s['url'])}</a>" if not s.get("local")
                else f"<span class='mono'>{html.escape(s['url'])}</span> in the project repository")
        h.append(f"<li id='src-{n}'><p><strong>{html.escape(s['publisher'])}</strong>: {html.escape(s['title'])}<br>{link}</p><ul class='quotes'>" +
                 "".join(f"<li>“{html.escape(q['quote'])}”</li>" for q in quotes) + "</ul></li>")
    h.append("</ol></section>")
    return "\n".join(h)

USED = set()
for t in walk_text():
    for m in CITE.finditer(t):
        USED.update(m.group(1).split())
for b in (b for s in R["sections"] for b in s["blocks"]):
    for row in b.get("rows", []):
        USED.update(row[2].split())
def used(fid):
    return fid in USED

CSS = (ROOT / "scripts/report.css").read_text()

def page(print_mode):
    nav = "" if print_mode else (
        "<nav class='bar'><a class='brand' href='#'>Overledger and Redbelly</a><span class='links'>"
        "<a href='#findings'>Findings</a><a href='#summary'>Community summary</a><a href='#sources'>Sources</a>"
        f"<a class='dl' href='downloads/{PDF_NAME}'>PDF</a><a class='dl' href='downloads/{DOCX_NAME}'>Word</a></span></nav>")
    return (f"<!doctype html><html lang='en-AU'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>"
            f"<title>{html.escape(R['title'])}</title><meta name='description' content='{html.escape(R['subtitle'])}'>"
            f"<style>{CSS if not print_mode else CSS.replace('url(fonts/', 'url(' + (ROOT / 'public/fonts').as_uri() + '/')}</style></head><body class='{'print' if print_mode else 'web'}'>{nav}<main>{body_html(print_mode)}</main></body></html>")

# ---------- DOCX ----------
def build_docx(path):
    from docx import Document
    from docx.shared import Pt, RGBColor
    d = Document()
    st = d.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(10.5)
    d.add_heading(R["title"], 0)
    d.add_paragraph(R["subtitle"]).runs[0].italic = True
    d.add_paragraph(f"Feasibility report, {R['date']}")
    d.add_paragraph(render_plain(R["status_note"]))
    d.add_heading("How to read this report", 1)
    for k, v in R["labels"].items():
        p = d.add_paragraph(style="List Bullet"); r = p.add_run(LABELS[k] + ": "); r.bold = True; p.add_run(v)
    d.add_heading("Key findings", 1)
    t = d.add_table(rows=1, cols=3); t.style = "Light Grid Accent 2"
    for i, x in enumerate(("Question", "Answer", "Status")):
        t.rows[0].cells[i].text = x
    for k in R["key_findings"]:
        c = t.add_row().cells; c[0].text = k["q"]; c[1].text = render_plain(k["a"] + " {" + k["cite"] + "}"); c[2].text = LABELS[k["label"]]
    for s in R["sections"]:
        d.add_heading(s["title"], 1)
        if s.get("intro"):
            d.add_paragraph(render_plain(s["intro"]))
        for b in s["blocks"]:
            if b["label"] == "summary_table":
                t = d.add_table(rows=1, cols=2); t.style = "Light Grid Accent 2"
                t.rows[0].cells[0].text = "Question"; t.rows[0].cells[1].text = "Answer today"
                for r in b["rows"]:
                    c = t.add_row().cells; c[0].text = r[0]; c[1].text = render_plain(r[1] + " {" + r[2] + "}")
                continue
            if b.get("heading"):
                d.add_heading(b["heading"], 2)
            if b.get("text"):
                p = d.add_paragraph()
                if b["label"] in LABELS:
                    r = p.add_run(f"[{LABELS[b['label']]}] "); r.bold = True; r.font.color.rgb = RGBColor(0xC6, 0x28, 0x28)
                p.add_run(render_plain(b["text"]))
            if b.get("list"):
                if b["label"] in LABELS and not b.get("text"):
                    r = d.add_paragraph().add_run(f"[{LABELS[b['label']]}]"); r.bold = True; r.font.color.rgb = RGBColor(0xC6, 0x28, 0x28)
                for li in b["list"]:
                    d.add_paragraph(render_plain(li), style="List Bullet")
    cs = R["community_summary"]
    d.add_heading("Community summary", 1)
    for p in cs["paragraphs"]:
        d.add_paragraph(p)
    d.add_heading("As an X thread", 2)
    for x in cs["thread"]:
        d.add_paragraph(x.replace("{site}", SITE), style="List Number")
    d.add_heading("Source list", 1)
    d.add_paragraph("Every factual claim links to one of these sources. Under each source are the exact words the report relies on.")
    for sid in order:
        s = SOURCES[sid]
        p = d.add_paragraph(); r = p.add_run(f"[{NUM[sid]}] {s['publisher']}: {s['title']}"); r.bold = True
        d.add_paragraph(s["url"] + (" (in the project repository)" if s.get("local") else ""))
        for f in FACTS.values():
            if f["source"] == sid and used(f["id"]):
                d.add_paragraph("“" + f["quote"] + "”", style="List Bullet")
    d.save(path)

# ---------- Markdown ----------
def sources_md():
    L = ["# Source list", "", f"Every factual claim in the report cites one of these sources. Under each source are the exact words the report relies on. "
         "Text snapshots of every page, with capture time and SHA-256, are in `evidence/` (see `evidence/manifest.json`).", ""]
    for sid in order:
        s = SOURCES[sid]
        L.append(f"{NUM[sid]}. **{s['publisher']}**: {s['title']}  ")
        L.append(f"   {s['url']}" + (" (in this repository)" if s.get("local") else ""))
        for f in FACTS.values():
            if f["source"] == sid and used(f["id"]):
                L.append(f"   - \"{f['quote']}\"")
        L.append("")
    return "\n".join(L)

def summary_md():
    cs = R["community_summary"]
    L = ["# Community summary", "", "Plain language summary of the report, ready to share.", ""] + [p + "\n" for p in cs["paragraphs"]]
    L += ["## As an X thread", ""] + [t.replace("{site}", SITE) + "\n" for t in cs["thread"]]
    return "\n".join(L)

def manifest():
    out = []
    for p in sorted((ROOT / "evidence").rglob("*.txt")):
        head = p.read_text(encoding="utf-8", errors="ignore").splitlines()[:1]
        url = head[0][5:] if head and head[0].startswith("URL: ") else None
        out.append({"file": str(p.relative_to(ROOT)), "url": url,
                    "captured_utc": datetime.fromtimestamp(p.stat().st_mtime, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "sha256": hashlib.sha256(p.read_bytes()).hexdigest()})
    return out

def main():
    pub = ROOT / "public"; (pub / "downloads").mkdir(parents=True, exist_ok=True)
    (pub / "index.html").write_text(page(False))
    pr = ROOT / "build"; pr.mkdir(exist_ok=True); (pr / "print.html").write_text(page(True))
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        pg.goto((pr / "print.html").as_uri()); pg.wait_for_timeout(300)
        pg.pdf(path=str(pub / "downloads" / PDF_NAME), format="A4", print_background=True,
               margin={"top": "16mm", "bottom": "16mm", "left": "15mm", "right": "15mm"},
               display_header_footer=True, header_template="<span></span>",
               footer_template="<div style='font-size:8px;width:100%;text-align:center;color:#8fa1ad'><span class='pageNumber'></span> / <span class='totalPages'></span></div>")
        b.close()
    build_docx(pub / "downloads" / DOCX_NAME)
    (ROOT / "SOURCES.md").write_text(sources_md())
    (ROOT / "COMMUNITY-SUMMARY.md").write_text(summary_md())
    man = ROOT / "evidence/manifest.json"
    if not man.exists():
        man.write_text(json.dumps(manifest(), indent=1))
    print(f"built: {len(order)} sources cited, {len(USED)} facts used")

if __name__ == "__main__":
    main()
