"""Thin GBIF API client for the presence pipeline (network I/O).

Only CC0 / CC-BY records are requested, per docs/DATA-SOURCING-LICENSING.md §1 (commercial use
requires excluding NC/ND). Kept separate from the pure aggregation so the logic stays testable.
"""

import time

import requests

API = "https://api.gbif.org/v1"

# License filter — only these may be used commercially (with attribution). NC/ND excluded.
ALLOWED_LICENSES = ["CC0_1_0", "CC_BY_4_0"]


class GbifClient:
    def __init__(self, pause: float = 0.34, timeout: int = 60, max_retries: int = 6):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "nearby-nearlife-pipeline/0.1 (GBIF ingest)"})
        self.pause = pause
        self.timeout = timeout
        self.max_retries = max_retries
        self._name_cache: dict = {}

    def _get(self, path: str, params) -> dict:
        # Polite pacing + exponential backoff on GBIF rate limiting (429) and transient 5xx.
        delay = 1.0
        for attempt in range(self.max_retries):
            resp = self.session.get(f"{API}{path}", params=params, timeout=self.timeout)
            if resp.status_code in (429, 500, 502, 503, 504):
                retry_after = resp.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else delay
                time.sleep(wait)
                delay = min(delay * 2, 30.0)
                continue
            resp.raise_for_status()
            if self.pause:
                time.sleep(self.pause)
            return resp.json()
        resp.raise_for_status()  # retries exhausted → surface the last error
        return resp.json()

    def resolve_taxon_key(self, scientific_name: str) -> int:
        # Only an EXACT backbone match is accepted. A HIGHERRANK fallback (e.g. "Reptilia" →
        # Chordata) or a fuzzy/none match is rejected with an error — never silently used, which
        # is what produced a garbage "reptiles = all vertebrates" dataset before this guard.
        data = self._get("/species/match", {"name": scientific_name, "strict": "true"})
        match_type = data.get("matchType")
        key = data.get("usageKey")
        got = (data.get("canonicalName") or data.get("scientificName") or "").lower()
        if match_type != "EXACT" or not key or scientific_name.lower() not in got:
            raise ValueError(
                f"GBIF did not exactly match {scientific_name!r} "
                f"(matchType={match_type}, got={got or None})"
            )
        return int(key)

    def species_facet(
        self, gadm_gid: str, taxon_key: int, month: int, facet_limit: int = 300
    ) -> tuple[list[tuple[int, int]], bool]:
        """Species recorded in a county in a given month → [(speciesKey, count)], truncated?"""
        params = [
            ("country", "SE"),
            ("gadmGid", gadm_gid),
            ("taxonKey", taxon_key),
            ("month", month),
            ("limit", 0),
            ("facet", "speciesKey"),
            ("facetLimit", facet_limit),
        ]
        for lic in ALLOWED_LICENSES:
            params.append(("license", lic))
        data = self._get("/occurrence/search", params)
        facets = data.get("facets") or []
        counts = facets[0]["counts"] if facets else []
        pairs = [(int(c["name"]), int(c["count"])) for c in counts]
        truncated = len(counts) >= facet_limit  # hit the cap → some rarer species dropped
        return pairs, truncated

    def scientific_name(self, species_key: int) -> str:
        if species_key not in self._name_cache:
            data = self._get(f"/species/{species_key}", {})
            self._name_cache[species_key] = (
                data.get("canonicalName") or data.get("scientificName") or str(species_key)
            )
        return self._name_cache[species_key]
