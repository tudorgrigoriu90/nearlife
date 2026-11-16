"""Rewrite the card's season sentence from the species' current active months (T-268 · review B-04).

`species_content.when_how` ("Active in your region year-round. Look for it …") was written from
active months that counted one stray record as a season, so the swift was "year-round". After the
presence reload stores thresholded months in `species.active_months`, this rewrites each
template-made sentence from them, in every locale, without fetching anything.

Only sentences the templates made are touched: the hint (taxon or water) is recognised from the
text after the season phrase, and a sentence that matches neither (hand-written, or an unknown
locale) is left as it is.

    SUPABASE_DB_URL=... python pipeline/rebuild_when_how.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from media.templates_i18n import LOCALES, strings_for, when_and_how  # noqa: E402

_MARK = "\x00"


def _tail(taxon: str, locale: str, aquatic: bool) -> str:
    """The sentence after its season phrase, for one hint."""
    st = strings_for(locale)
    hint = st.habitat_aquatic if aquatic and st.habitat_aquatic else st.templates.get(
        taxon, {}
    ).get("habitat", st.templates["mammal"]["habitat"])
    return st.sentence.format(when=_MARK, hint=hint).split(_MARK, 1)[1]


def rewritten(old: str, taxon: str, months: list[int], locale: str) -> str | None:
    """The new sentence, or None when `old` is not template-made or already says this."""
    if locale not in LOCALES:
        return None
    for aquatic in (True, False):
        if old.endswith(_tail(taxon, locale, aquatic)):
            new = when_and_how(taxon, months, locale, aquatic=aquatic)
            return None if new == old else new
    return None


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(
            "select c.species_id, c.locale, c.when_how, s.taxon_group, s.active_months "
            "from public.species_content c join public.species s on s.id = c.species_id "
            "where s.in_catalogue and s.taxon_group is not null"
        )
        updates = []
        for sid, locale, old, taxon, months in cur.fetchall():
            new = rewritten(old or "", taxon, sorted(months or []), locale)
            if new is not None:
                updates.append((new, sid, locale))
        cur.executemany(
            "update public.species_content set when_how = %s where species_id = %s and locale = %s",
            updates,
        )
        conn.commit()
        print(f"season sentences rewritten: {len(updates)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
