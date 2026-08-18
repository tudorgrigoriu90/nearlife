"""Refuse a load that looks like a broken ingest rather than a refresh (T-192).

The annual refresh runs unattended (T-172, Director): a pipeline that needs someone present in
February is a pipeline that silently stops the first February nobody is. That removes the person
who would have spotted a bad ingest before it overwrote good data — but not the need to spot it.

So the check becomes automatic. A refresh arriving with far less data than the database already
holds is refused, because the likeliest explanations — a half-finished ingest, a GBIF outage, a
taxon that failed mid-run — are indistinguishable from "Sweden lost 60% of its species this year".

Growth is never suspicious; that is the entire point of a refresh.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class LoadPolicy:
    """`min_ratio`: the smallest fraction of the existing count a refresh may carry and still load.

    0.75 tolerates ordinary year-to-year churn — GBIF lumps species every backbone release, and a
    few percent down is normal — while catching the order-of-magnitude drops that mean something
    broke.
    """

    min_ratio: float = 0.75


@dataclass(frozen=True)
class Verdict:
    ok: bool
    reason: str = ""


def check_load_sanity(
    existing: dict[str, int],
    incoming: dict[str, int],
    policy: LoadPolicy = LoadPolicy(),
) -> Verdict:
    """Compare a pending load against what the database already holds.

    An empty database passes anything: that is a new project, not evidence of a bad ingest. An empty
    *incoming* dataset never passes, even against an empty database — it is the most dangerous case,
    since it would record success while loading nothing and leave the next run comparing against a
    hollow baseline.
    """
    for field in ("species", "presence"):
        have = existing.get(field, 0)
        arriving = incoming.get(field, 0)
        if arriving == 0 and have == 0:
            return Verdict(False, f"refusing an empty load: incoming {field}=0")
        if have == 0:
            continue  # first load of this table
        if arriving < have * policy.min_ratio:
            return Verdict(
                False,
                f"refusing load: {field} fell from {have} to {arriving} "
                f"(below {policy.min_ratio:.0%} of current). Likely a partial ingest, not a real "
                f"decline — re-run the ingest before loading.",
            )
    return Verdict(True)
