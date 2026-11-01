"""Build the public privacy-policy and account-deletion pages (T-095, T-097).

Google Play needs both at stable public URLs. They are published on the Director's own site
(nytta-ai.se, GitHub Pages) under /nearby/, built from docs/legal so the pages never drift from the
reviewed text:

    python pipeline/legal_site.py <nytta-ai checkout>

A small Markdown subset is converted here instead of adding a Markdown dependency: the two sources
use only headings, paragraphs, lists, one table, bold, links and rules. Blockquotes are internal
notes (draft status, review history) and are dropped, as are the 🆕 markers that flag passages for
the legal reviewer.
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVACY_POLICY = "docs/legal/PRIVACY-POLICY.md"
DELETE_ACCOUNT = "docs/legal/DELETE-ACCOUNT.md"

PAGES = [
    (PRIVACY_POLICY, "nearby/privacy/index.html", "Nearby – Privacy Policy", "en"),
    (DELETE_ACCOUNT, "nearby/delete-account/index.html", "Nearby – Delete your account", "en"),
]

_LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
_BARE_URL = re.compile(r'(?<!href=")(?<!">)(https://[^\s<]+?)(?=[.,;:)]?(?:\s|$|<))')
_BOLD = re.compile(r"\*\*(.+?)\*\*")
_EMAIL = re.compile(r"\b([\w.+-]+@[\w-]+\.[\w.]+\w)\b")


def _inline(text: str) -> str:
    text = html.escape(text.replace("🆕 ", "").replace("🆕", ""), quote=False)
    text = _BOLD.sub(r"<strong>\1</strong>", text)
    text = _LINK.sub(r'<a href="\2">\1</a>', text)
    text = _EMAIL.sub(r'<a href="mailto:\1">\1</a>', text)
    return _BARE_URL.sub(r'<a href="\1">\1</a>', text)


def _cells(row: str) -> list[str]:
    return [c.strip() for c in row.strip().strip("|").split("|")]


def md_to_html(md: str) -> str:
    out: list[str] = []
    blocks = re.split(r"\n\s*\n", md.strip())
    for block in blocks:
        lines = block.split("\n")
        first = lines[0]
        if first.startswith(">"):
            continue
        if first.strip() == "---":
            out.append("<hr>")
        elif first.startswith("|"):
            head, *rows = [ln for ln in lines if not re.match(r"^\|[\s\-|]+\|$", ln)]
            th = "".join(f"<th>{_inline(c)}</th>" for c in _cells(head))
            body = "".join("<tr>" + "".join(f"<td>{_inline(c)}</td>" for c in _cells(r)) + "</tr>" for r in rows)
            out.append(f"<table><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>")
        else:
            # A block can open with a heading line and continue with a paragraph or list.
            while lines and (m := re.match(r"^(#{1,3}) (.*)$", lines[0])):
                level = len(m.group(1))
                out.append(f"<h{level}>{_inline(m.group(2))}</h{level}>")
                lines = lines[1:]
            if not lines:
                continue
            if re.match(r"^(- |\d+\. )", lines[0]):
                tag = "ul" if lines[0].startswith("- ") else "ol"
                items: list[str] = []
                for ln in lines:
                    if re.match(r"^(- |\d+\. )", ln):
                        items.append(re.sub(r"^(- |\d+\. )", "", ln))
                    else:
                        items[-1] += " " + ln.strip()
                out.append(f"<{tag}>" + "".join(f"<li>{_inline(i)}</li>" for i in items) + f"</{tag}>")
            else:
                out.append("<p>" + _inline(" ".join(ln.strip() for ln in lines)) + "</p>")
    return "\n".join(out)


_STYLE = """
:root{--ink:#22331f;--muted:#4a5c4d;--paper:#f4f8f2;--card:#fff;--line:#d4e0d2;--accent:#2f7d4f}
@media (prefers-color-scheme:dark){:root{--ink:#e6efe4;--muted:#b3c2b4;--paper:#132018;--card:#1b2b21;--line:#2f4536;--accent:#8fe3a1}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 Inter,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:32px 16px 64px}h1{font-size:2rem;line-height:1.2;margin:.2em 0 .6em}
h2{font-size:1.3rem;margin:2em 0 .5em}a{color:var(--accent)}hr{border:0;border-top:1px solid var(--line);margin:48px 0}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;background:var(--card);font-size:.95rem}
th,td{border:1px solid var(--line);padding:10px;vertical-align:top;text-align:left}th{background:var(--paper)}
footer{color:var(--muted);font-size:.9rem;margin-top:48px}
"""


def page(title: str, body: str, lang: str) -> str:
    # A rule separates the English text from its Swedish translation (DELETE-ACCOUNT.md).
    if "<hr>" in body:
        body = body.replace("<hr>", '<hr>\n<div lang="sv">', 1) + "\n</div>"
    body = body.replace("<table>", '<div class="wrap"><table>').replace("</table>", "</table></div>")
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<style>{_STYLE}</style>
</head>
<body>
<main>
{body}
<footer>Nearby · Tudor Grigoriu (Nytta AI) · <a href="https://nytta-ai.se/">nytta-ai.se</a></footer>
</main>
</body>
</html>
"""


def build(out_dir: Path) -> list[Path]:
    written = []
    for source, target, title, lang in PAGES:
        body = md_to_html((ROOT / source).read_text(encoding="utf-8"))
        path = Path(out_dir) / target
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(page(title, body, lang), encoding="utf-8")
        written.append(path)
    return written


if __name__ == "__main__":
    for p in build(Path(sys.argv[1])):
        print(p)
