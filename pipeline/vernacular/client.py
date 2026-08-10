"""Network I/O for vernacular-name sourcing (T-159).

Kept apart from sources.py so the naming rules stay testable offline, mirroring
gbif/client.py vs gbif/aggregate.py.

Both hosts here are currently refused by this repo's CI/sandbox egress policy (403 at the proxy
CONNECT). That is why this module exists as a runnable generator rather than a set of committed
name files: run it from an environment that can reach Wikimedia, and commit the output.
"""

import time

import requests

SPARQL = "https://query.wikidata.org/sparql"
USER_AGENT = "nearby-nearlife-pipeline/0.1 (vernacular names; T-159)"

# P225 = taxon name (the binomial), P1843 = taxon common name (the vernacular one).
_QUERY = """
SELECT ?sci ?name WHERE {
  VALUES ?sci { %s }
  ?item wdt:P225 ?sci .
  ?item wdt:P1843 ?name .
  FILTER(lang(?name) = "%s")
}
ORDER BY ?sci ?name
"""


class VernacularClient:
    def __init__(self, timeout: int = 60, max_retries: int = 5, pause: float = 1.0):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
        self.timeout = timeout
        self.max_retries = max_retries
        self.pause = pause

    def _get(self, url: str, params: dict) -> dict:
        delay = 1.0
        for _ in range(self.max_retries):
            resp = self.session.get(url, params=params, timeout=self.timeout)
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(delay)
                delay = min(delay * 2, 30.0)
                continue
            resp.raise_for_status()
            if self.pause:
                time.sleep(self.pause)
            return resp.json()
        raise RuntimeError(f"giving up on {url} after {self.max_retries} attempts")

    def common_names(self, scientific_names: list, locale: str) -> dict:
        """Raw SPARQL payload of P1843 values in `locale`, for sources.names_from_sparql."""
        values = " ".join(f'"{name}"' for name in scientific_names)
        return self._get(SPARQL, {"format": "json", "query": _QUERY % (values, locale)})

    def article_titles(self, scientific_names: list, locale: str) -> dict:
        """{scientific name: article title} from the locale's Wikipedia, via langlinks.

        Asking the *English* wiki for its `locale` langlink is deliberate: the English article is
        reliably titled with the binomial or a name we can map back, whereas searching the small
        wiki directly would need a name we do not yet have.
        """
        api = "https://en.wikipedia.org/w/api.php"
        out: dict = {}
        for chunk in _chunked(scientific_names, 50):
            payload = self._get(api, {
                "action": "query",
                "format": "json",
                "prop": "langlinks",
                "lllang": locale,
                "lllimit": "500",
                "redirects": "1",
                "titles": "|".join(chunk),
            })
            query = payload.get("query", {})
            # Follow the redirects the API resolved, so a page found under a synonym still maps
            # back to the binomial we asked about.
            resolved = {r["to"]: r["from"] for r in query.get("redirects", [])}
            resolved.update({n["to"]: n["from"] for n in query.get("normalized", [])})
            for page in query.get("pages", {}).values():
                title = page.get("title", "")
                asked = resolved.get(title, title)
                links = page.get("langlinks") or []
                if links:
                    out[asked] = links[0].get("*", "")
        return out


def _chunked(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]
