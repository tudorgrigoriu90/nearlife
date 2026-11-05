"""Bird song from iNaturalist (T-245).

A coverage check (2026-11-05) found commercial-safe recordings (CC0 / CC BY / CC BY-SA) on
iNaturalist for 412 of the 515 catalogue birds, every common Swedish bird among them. xeno-canto
holds more, but nearly all of it is CC BY-NC-SA, and its API now needs a key; it stays out.

Flow: scientific name → the taxon (exact name or synonym, as for photos) → research-grade
observations of it that carry a sound under a safe licence, most-faved first → the first sound with
a file. The recording is cut to a short mono AAC clip (ffmpeg) and re-hosted, so the app never
plays a 20 MB wav. The source page is the observation, which shows the recordist and licence.

iNaturalist asks for at most ~1 request per second; the photo client's pacing is reused.
"""

from media.inaturalist import INaturalistClient, taxon_match
from media.licenses import inat_license

# The licence filter is asked of the API and checked again here: the API's filter is a
# convenience, the allow-list is the guarantee (invariant #8).
API_LICENCES = "cc0,cc-by,cc-by-sa"

CLIP_SECONDS = 20
FADE_SECONDS = 1.5
BITRATE = "64k"


def pick_sound(observations: list[dict], taxon_id: int) -> dict | None:
    """{fileUrl, license, author, sourceUrl} for the first safe sound of this taxon, or None.

    `taxon_id` guards against an observation filed under another taxon (the API matches
    descendants, so a subspecies is fine: its ancestry contains the species)."""
    for obs in observations:
        taxon = obs.get("taxon") or {}
        if taxon.get("id") != taxon_id and taxon_id not in (taxon.get("ancestor_ids") or []):
            continue
        for sound in obs.get("sounds") or []:
            licence = inat_license(sound.get("license_code"))
            if not (licence and sound.get("file_url")):
                continue
            user = obs.get("user") or {}
            return {
                "fileUrl": sound["file_url"],
                "license": licence,
                "author": user.get("name") or user.get("login") or "Unknown",
                "sourceUrl": f"https://www.inaturalist.org/observations/{obs['id']}",
            }
    return None


def clip_args(src: str, dst: str) -> list[str]:
    """ffmpeg arguments: the first 20 s, mono, 64 kbit/s AAC, faded out so it never ends mid-note
    with a click. ~160 KB a clip keeps all 400+ birds near 70 MB of Storage."""
    fade_start = CLIP_SECONDS - FADE_SECONDS
    return [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", src,
        "-t", str(CLIP_SECONDS),
        "-af", f"afade=t=out:st={fade_start}:d={FADE_SECONDS}",
        "-ac", "1", "-c:a", "aac", "-b:a", BITRATE,
        "-movflags", "+faststart",
        dst,
    ]


def fetch_sound(client: INaturalistClient, scientific_name: str) -> dict | None:
    found = client._get("/taxa", {"q": scientific_name, "rank": "species", "is_active": "true", "per_page": 10})
    taxon = taxon_match(found.get("results", []), scientific_name)
    if taxon is None:
        return None
    obs = client._get(
        "/observations",
        {
            "taxon_id": taxon["id"],
            "sounds": "true",
            "sound_license": API_LICENCES,
            "quality_grade": "research",
            "order_by": "votes",
            "per_page": 10,
        },
    )
    return pick_sound(obs.get("results", []), taxon["id"])
