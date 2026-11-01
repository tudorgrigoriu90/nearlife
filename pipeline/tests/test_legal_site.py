"""Publishing the privacy policy and the account-deletion page (T-095, T-097).

Google Play needs both at public URLs, and they must say what the docs in docs/legal say: the
pages are built from those files, never edited by hand on the site. A draft note, a review marker
or an unfilled placeholder reaching the public page would be a visible mistake on a legal text.
"""

from pathlib import Path

import pytest

from legal_site import DELETE_ACCOUNT, PRIVACY_POLICY, build, md_to_html, page

ROOT = Path(__file__).resolve().parents[2]


def test_headings_paragraphs_and_inline_marks():
    html = md_to_html("# Title\n\n## Who\nWe are **here**, see [the site](https://x.se/a).\nSecond line.")
    assert "<h1>Title</h1>" in html
    assert "<h2>Who</h2>" in html
    assert '<p>We are <strong>here</strong>, see <a href="https://x.se/a">the site</a>. Second line.</p>' in html


def test_lists_and_tables():
    html = md_to_html("- one\n  continued\n- two\n\n1. first\n2. second\n\n| A | B |\n|---|---|\n| x | **y** |")
    assert "<ul><li>one continued</li><li>two</li></ul>" in html
    assert "<ol><li>first</li><li>second</li></ol>" in html
    assert "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>x</td><td><strong>y</strong></td></tr></tbody></table>" in html


def test_escapes_html_and_links_bare_urls():
    html = md_to_html('Members show as "joined on <date>" & more: https://nytta-ai.se/nearby/x/.')
    assert "&lt;date&gt;" in html and "&amp; more" in html
    assert '<a href="https://nytta-ai.se/nearby/x/">https://nytta-ai.se/nearby/x/</a>.' in html


def test_links_email_addresses():
    assert '<a href="mailto:info@nytta-ai.se">info@nytta-ai.se</a>' in md_to_html("Mail **info@nytta-ai.se** today.")


def test_drops_internal_notes_and_review_markers():
    html = md_to_html("# T\n\n> **DRAFT** internal\n> note\n\n- 🆕 **New** thing")
    assert "DRAFT" not in html and "internal" not in html
    assert "🆕" not in html
    assert "<li><strong>New</strong> thing</li>" in html


def test_horizontal_rule_splits_languages():
    assert "<hr>" in md_to_html("one\n\n---\n\ntwo")


def test_page_is_a_complete_document():
    html = page("Nearby privacy", "<h1>x</h1>", "en")
    assert html.startswith("<!doctype html>")
    assert '<html lang="en">' in html
    assert '<meta name="viewport"' in html
    assert "<title>Nearby privacy</title>" in html


@pytest.mark.parametrize("source", [PRIVACY_POLICY, DELETE_ACCOUNT])
def test_published_sources_have_no_placeholders(source):
    html = md_to_html((ROOT / source).read_text(encoding="utf-8"))
    for leftover in ["[date", "[legal entity", "[privacy contact", "[postal address", "DRAFT", "🆕", "PUBLISHED (T-095)"]:
        assert leftover not in html


def test_build_writes_both_pages(tmp_path):
    written = build(tmp_path)
    assert sorted(p.relative_to(tmp_path).as_posix() for p in written) == [
        "nearby/delete-account/index.html",
        "nearby/privacy/index.html",
    ]
    privacy = (tmp_path / "nearby/privacy/index.html").read_text(encoding="utf-8")
    assert "Tudor Grigoriu" in privacy and "info@nytta-ai.se" in privacy
    # The personal identity number (an enskild firma's org.nr) is never published.
    assert "19900520" not in privacy
    deletion = (tmp_path / "nearby/delete-account/index.html").read_text(encoding="utf-8")
    assert "Delete account &amp; data" in deletion and "Radera konto och data" in deletion
