"""Encounterability filter for GBIF species lists (T-136 / T-167).

GBIF records what was *recorded*, not what a person can reasonably meet. Raw output carries zoo
animals, garden escapees, one-off vagrants and misidentifications. Showing those as "active in your
region this season" would break invariant #1 as surely as an invented fact would.

Two design points worth stating, because both are easy to get wrong:

**Rarity is not noise.** The osprey has 372,495 records across all 21 Swedish counties and the app
still tags it `rare` — that tag is an encounter-frequency *flavour*, not scarcity. A plain "drop
the uncommon" threshold would discard real species while keeping well-recorded escapees. So the
test is breadth **or** abundance, not a single number.

**The statistics are a stand-in, not the answer.** The authoritative source is each country's
national checklist (Dyntaxa/Artdatabanken SE, Artsdatabanken NO, Allearter DK, FinBIF FI,
Náttúrufræðistofnun IS — see DATA-SOURCING-LICENSING.md). When a status is known it wins outright,
in both directions. The heuristics only cover species the checklist has not spoken about.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Policy:
    """Thresholds, kept as data so they can be tuned and argued about rather than buried."""

    min_occurrences: int = 25
    min_counties: int = 3
    # A species can be genuinely local and still perfectly encounterable where it lives, so heavy
    # local recording rescues it from the breadth rule.
    abundant_occurrences: int = 1_000
    # T-194 option B (Director, 2026-10-31): 100+ records in fewer than `min_counties` counties is
    # well recorded locally too. Presence is per county, so such a species is offered only where it
    # is recorded. Below this, a one- or two-county species stays out as likely noise.
    local_occurrences: int = 100


DEFAULT_POLICY = Policy()

# Checklist verdicts that settle the question on their own.
INCLUDE_STATUSES = {"native", "established", "breeding", "resident"}
EXCLUDE_STATUSES = {"alien", "invasive", "escapee", "vagrant", "domestic", "not-established"}


@dataclass(frozen=True)
class SpeciesSignals:
    scientific_name: str
    occurrences: int
    counties: int
    months: int


@dataclass(frozen=True)
class Verdict:
    included: bool
    reason: str


def classify(
    signals: SpeciesSignals,
    status: str | None = None,
    policy: Policy = DEFAULT_POLICY,
) -> Verdict:
    """Decide whether a species is plausibly encounterable, with the reason recorded.

    Every verdict carries a reason: a species dropped silently cannot be argued with later, and at
    Nordic scale these lists are far too large to re-derive by eye.
    """
    normalised = (status or "").strip().lower()
    if normalised in EXCLUDE_STATUSES:
        return Verdict(False, f"checklist status '{normalised}'")
    if normalised in INCLUDE_STATUSES:
        return Verdict(True, f"checklist status '{normalised}'")

    if signals.occurrences >= policy.abundant_occurrences:
        return Verdict(True, f"abundant locally ({signals.occurrences} records)")
    if signals.occurrences < policy.min_occurrences:
        return Verdict(False, f"only {signals.occurrences} records (< {policy.min_occurrences})")
    if signals.counties < policy.min_counties and signals.occurrences >= policy.local_occurrences:
        return Verdict(
            True,
            f"well recorded locally ({signals.occurrences} records in {signals.counties} county/counties)",
        )
    if signals.counties < policy.min_counties:
        return Verdict(
            False,
            f"recorded in {signals.counties} county/counties (< {policy.min_counties}) "
            f"on {signals.occurrences} records",
        )
    return Verdict(True, f"{signals.occurrences} records across {signals.counties} counties")


def filter_species(
    rows: list, statuses: dict | None = None, policy: Policy = DEFAULT_POLICY
) -> tuple[list, list]:
    """Partition into (kept, dropped). Input order is preserved so diffs stay readable.

    `dropped` is returned rather than discarded — it is the audit trail for T-136, and the only way
    to notice the filter is eating something it should not.
    """
    statuses = statuses or {}
    kept, dropped = [], []
    for row in rows:
        verdict = classify(row, statuses.get(row.scientific_name), policy)
        (kept if verdict.included else dropped).append(row)
    return kept, dropped
