"""Localised give/protect/habitat templates and season phrasing (T-180).

`give`, `protect` and the habitat half of `whenAndHow` are taxon templates, not per-species text —
so roughly 46 strings translate all three fields for every one of the 6,824 shipped species. With
facts sourced per language rather than translated (T-179), this file *is* the translation job.

The season phrase deliberately is not a translated string. English composes it — "from May to
September" — and that breaks wherever a month inflects after a preposition. Each locale therefore
supplies two month lists: `months` for the bare list form and `months_range` for the form a month
takes inside the range pattern. In English they are identical; in Russian they are not.

Adding a language means adding one entry to LOCALES. Nothing else changes.
"""

from dataclasses import dataclass

from media.content_templates import TEMPLATES as EN_TEMPLATES

EN_MONTHS = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)


@dataclass(frozen=True)
class LocaleStrings:
    months: tuple[str, ...]
    months_range: tuple[str, ...]
    year_round: str
    range_pattern: str  # uses {first} and {last}
    list_pattern: str  # uses {months}
    list_separator: str
    unknown: str
    sentence: str  # uses {when} and {hint}
    templates: dict[str, dict[str, str]]


SV_TEMPLATES: dict[str, dict[str, str]] = {
    "bird": {
        "give": "Sätt upp en holk som passar traktens arter och håll rent vatten framme på sommaren; håll katten inne under häckningstiden.",
        "protect": "Stör inte bon och boplatser, koppla hunden nära markhäckande fåglar, och dämpa nattbelysning och fönsterkrockar.",
        "habitat": "i skogen, våtmarkerna och trädgårdarna där den söker föda och häckar",
    },
    "mammal": {
        "give": "Lämna vildvuxna hörn och buskridåer, en glugg i staketet för smådjur, och ostörda ved- och lövhögar som skydd.",
        "protect": "Kör försiktigt i gryning och skymning, ha hunden under uppsikt i viltrika marker, och mata eller närma dig aldrig vilda däggdjur.",
        "habitat": "i skogsbryn, ängsmark och lugna gömslen",
    },
    "insect": {
        "give": "Låt en del av gräsmattan växa, plantera blommor för pollinatörer, och lämna löv och död ved kvar för övervintring.",
        "protect": "Undvik bekämpningsmedel, låt en del mark vara vild och ostörd, och dämpa onödig utomhusbelysning.",
        "habitat": "kring ängar, blommor och död ved",
    },
    "arachnid": {
        "give": "Lämna ostörda hörn, lövförna och död ved där de jagar och söker skydd.",
        "protect": "Undvik bekämpningsmedel, och flytta hellre än skadar dem du hittar inomhus.",
        "habitat": "i ostörd växtlighet, lövförna och död ved",
    },
    "fish": {
        "give": "Håll vattendragen rena och skuggade med strandvegetation, och stöd att vandringshinder tas bort.",
        "protect": "Skräpa eller förorena inte i vattendrag, följ fiskereglerna och catch-and-release, och stör inte lekområden.",
        "habitat": "i sjöarna, åarna och bäckarna där den lever",
    },
    "amphibian": {
        "give": "Anlägg en damm eller ett fuktigt, skyddat hörn, lämna sten- och vedhögar, och håll trygga stråk mellan vatten och land.",
        "protect": "Se upp för vandringar över vägar på våren, flytta eller hantera inte djuren, och håll vattnet fritt från föroreningar och skräp.",
        "habitat": "nära dammar, diken och fuktig mark",
    },
    "reptile": {
        "give": "Lämna soliga sten- och vedhögar att sola på och skrovlig, ostörd mark som skydd.",
        "protect": "Hantera eller flytta inte djuren, håll hunden på stigen i kräldjursmarker, och lämna solplatser ifred.",
        "habitat": "på soliga slänter, hedar och stenhögar",
    },
    "mollusc": {
        "give": "Behåll fuktiga, skuggiga gömslen som vedhögar och lämna kvar en del lövförna.",
        "protect": "Undvik snigelmedel och bekämpningsmedel, och håll vattendragen rena för sötvattensarterna.",
        "habitat": "på fuktiga, skuggiga ställen och i rent sötvatten",
    },
    "plant": {
        "give": "Låt inhemska växter breda ut sig, klipp mer sällan och senare på året, och låt fröställningar stå kvar över vintern.",
        "protect": "Plocka eller gräv inte upp vilda växter, håll dig till stigarna i känsliga marker, och plantera aldrig in främmande arter.",
        "habitat": "på ängarna, i skogarna och längs vägkanterna där den växer",
    },
    "fungus": {
        "give": "Lämna kvar död ved och lövförna där svampar fruktar, och gå varsamt i skogen.",
        "protect": "Ta bara det lokala regler tillåter, trampa inte ner fruktkroppar, och lita aldrig på en app för att avgöra om en svamp är ätlig.",
        "habitat": "på skogsbotten, död ved och i lövförna",
    },
}

SV_MONTHS = (
    "januari", "februari", "mars", "april", "maj", "juni",
    "juli", "augusti", "september", "oktober", "november", "december",
)

LOCALES: dict[str, LocaleStrings] = {
    "en": LocaleStrings(
        months=EN_MONTHS,
        months_range=EN_MONTHS,
        year_round="year-round",
        range_pattern="from {first} to {last}",
        list_pattern="in {months}",
        list_separator=", ",
        unknown="at times through the year",
        sentence="Active in your region {when}. Look for it {hint}.",
        templates=EN_TEMPLATES,
    ),
    "sv": LocaleStrings(
        months=SV_MONTHS,
        months_range=SV_MONTHS,
        year_round="året runt",
        range_pattern="från {first} till {last}",
        list_pattern="i {months}",
        list_separator=", ",
        unknown="vid olika tider under året",
        sentence="Aktiv i din region {when}. Leta efter den {hint}.",
        templates=SV_TEMPLATES,
    ),
}


def strings_for(locale: str) -> LocaleStrings:
    """Raise rather than fall back: serving English to a Somali reader is a silent failure."""
    try:
        return LOCALES[locale]
    except KeyError as err:
        raise KeyError(f"no content templates registered for locale {locale!r}") from err


def months_phrase(active_months: list[int], locale: str = "en") -> str:
    """An honest season phrase from 1-indexed months (never 'here right now')."""
    st = strings_for(locale)
    m = sorted(set(active_months))
    if not m:
        return st.unknown
    if len(m) == 12:
        return st.year_round
    if m == list(range(m[0], m[-1] + 1)) and len(m) > 1:
        return st.range_pattern.format(first=st.months_range[m[0] - 1], last=st.months_range[m[-1] - 1])
    return st.list_pattern.format(months=st.list_separator.join(st.months[i - 1] for i in m))


def when_and_how(taxon: str, active_months: list[int], locale: str = "en") -> str:
    st = strings_for(locale)
    hint = st.templates.get(taxon, {}).get("habitat", st.templates["mammal"]["habitat"])
    return st.sentence.format(when=months_phrase(active_months, locale), hint=hint)
