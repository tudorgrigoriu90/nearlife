"""The Species Protection Ordinance parser (T-337): annex 1 N/n entries, annex 2 levels and county
limits, family entries, and the precedence when a species is listed more than once. Fixtures are
excerpts of SFS 2007:845 as amended to SFS 2026:1504 (legislation is not under copyright,
upphovsrättslagen 9 §), with the layout riksdagen serves: CRLF line ends, tabs, wrapped names."""

import pytest

from build_protected import (
    LEVEL_ORDER,
    annex_texts,
    county_names,
    parse_annex1,
    parse_annex2,
    strongest,
)

ANNEX1 = """Bilaga 1

Förteckning över vissa djur- och växtarter

DJUR

Ryggradsdjur

Fåglar

S B - - Gavia stellata                  smålom

Däggdjur

          Vespertilionidae

S - - N - Eptesicus nilssonii           nordisk fladdermus

S - - N - Myotis daubentonii (inkl. M.
          nathalinae)                   vattenfladdermus

S B P N - Alopex lagopus (Vulpes lagopus) fjällräv

S - - N - Canis lupus (finska populationer utanför
          renskötselområden; alla populationer i övriga
          medlemsstater utom Estland)

S B P n - Gulo gulo                     järv

S B - - F Lampetra fluviatilis (ej
          svenska och finska
          populationer)                 flodnejonöga

- - - N - Coregonus oxyrhynchus
          (ej finska populationer)      nordsjösik

- - - N - Lynx pardinus (endast spanska populationer) pardellodjur

Groddjur

S - - N - Bufo calamita                 stinkpadda

VÄXTER

Blomväxter (angiospermer)

S B - N - - Artemisia campestris L. subsp. bottnica A.N.
            Lundström ex Kindb.         bottenviksmalört

S B - N - - Cypripedium calceolus L.    guckusko

S B - - - - Bryhnia novae-angliae
            (Sull & Lesq.) Grout        brynia
"""

ANNEX2 = """Bilaga 2

Fridlysning enligt 5 a, 6, 8 och 9 §§

Däggdjur

Art\t                        Fridlysning\tSkyddskategori

Igelkott (Erinaceus europaeus)\t5 a § \t        Förstärkt skydd

Grod- och kräldjur

Art\t                        Fridlysning\tSkyddskategori

Gotlandssnok (Natrix natrix
gotlandica)\t                5 a § \t        Förstärkt skydd

Vanlig padda (Bufo bufo)\t6 § \t        Grundläggande skydd

Fiskar

Ål (Anguilla anguilla)\t        5 a § \t        Strikt skydd

Kärlväxter

Art\t                        Fridlysning\tSkyddskategori\tGeografiskt
                                                                område

Lummerväxter: Samtliga arter
av familjen Lycopodiaceae utom
de som enligt bilaga 2 omfattas
av ett strikt skydd, ett
förstärkt skydd eller ett
grundläggande skydd\t        9 §     \tBegränsat skydd\t

Mellanlummer (Lycopodium
zeilleri)\t                8 §     \tGrundläggande skydd\t

Orkidéer: Samtliga arter i
familjerna Orchidaceae och
Cypripediaceae utom de som
anges i bilaga 1 eller de som
enligt bilaga 2 omfattas av
ett strikt skydd eller ett
förstärkt skydd\t                8 § \t        Grundläggande skydd\t

Ramslök (Allium ursinum)\t9 § \t        Begränsat skydd\tFridlysningen
                                                                gäller i Kalmar
                                                                och Stockholms län

Ädelmynta (Mentha × gracilis)\t8 §     \tGrundläggande skydd\t

Lavar

Cetrelia cetrarioides\t        8 § \t        Strikt skydd
Förordning (2026:1504).
"""

ORDINANCE = (
    "Artskyddsförordning (2007:845)\n\n7 § I fråga om ...\n\n"
    + ANNEX1
    + "\n"
    + ANNEX2
    + "\nBilaga 3 /Upphör att gälla U:2027-04-01 genom förordning (2026:354)./\nKommuner\n"
).replace("\n", "\r\n")


def test_the_annexes_are_cut_from_the_ordinance():
    one, two = annex_texts(ORDINANCE)
    assert "Gulo gulo" in one and "Igelkott" not in one
    assert "Igelkott" in two and "Kommuner" not in two and "\r" not in two


def test_annex1_keeps_n_and_n_lowercase_animals_and_n_plants():
    names = {e["name"]: e for e in parse_annex1(annex_texts(ORDINANCE)[0])}
    assert names["Eptesicus nilssonii"]["kind"] == "animal"
    assert names["Gulo gulo"]["kind"] == "animal"  # n: national strict protection
    assert names["Cypripedium calceolus"]["kind"] == "plant"
    assert names["Bufo calamita"]["kind"] == "animal"


def test_annex1_skips_birds_unmarked_species_and_subspecies():
    names = {e["name"] for e in parse_annex1(annex_texts(ORDINANCE)[0])}
    assert "Gavia stellata" not in names  # every wild bird is covered by 4 §, not the annex
    assert "Bryhnia novae-angliae" not in names  # B only
    # A subspecies must not mark the whole species: field wormwood is common.
    assert "Artemisia campestris" not in names


def test_annex1_keeps_swedish_populations_and_drops_the_others():
    names = {e["name"] for e in parse_annex1(annex_texts(ORDINANCE)[0])}
    assert "Canis lupus" in names  # "all populations in the other member states"
    assert "Lampetra fluviatilis" not in names  # "ej svenska"; also only F
    assert "Coregonus oxyrhynchus" not in names  # "ej finska" names no Swedish population
    assert "Lynx pardinus" not in names  # "endast spanska"


def test_annex1_keeps_a_listed_synonym():
    entry = next(e for e in parse_annex1(annex_texts(ORDINANCE)[0]) if e["name"] == "Alopex lagopus")
    assert entry["synonyms"] == ["Vulpes lagopus"]
    # "(inkl. M. nathalinae)" is not a synonym.
    bat = next(e for e in parse_annex1(annex_texts(ORDINANCE)[0]) if e["name"] == "Myotis daubentonii")
    assert bat["synonyms"] == []


def test_annex2_reads_levels_names_and_wrapped_rows():
    rows = {r.get("name") or r["family"]: r for r in parse_annex2(annex_texts(ORDINANCE)[1])}
    assert rows["Erinaceus europaeus"]["level"] == "reinforced"
    assert rows["Bufo bufo"]["level"] == "basic"
    assert rows["Anguilla anguilla"]["level"] == "strict"
    assert rows["Lycopodium zeilleri"]["level"] == "basic"
    assert rows["Mentha × gracilis"]["level"] == "basic"
    assert rows["Cetrelia cetrarioides"]["level"] == "strict"  # no Swedish name
    assert "Natrix natrix" not in rows  # only the Gotland subspecies


def test_annex2_reads_family_entries():
    rows = parse_annex2(annex_texts(ORDINANCE)[1])
    families = {r["family"]: r["level"] for r in rows if "family" in r}
    assert families == {"Lycopodiaceae": "limited", "Orchidaceae": "basic", "Cypripediaceae": "basic"}


def test_annex2_reads_a_county_limit():
    rows = {r.get("name"): r for r in parse_annex2(annex_texts(ORDINANCE)[1])}
    assert rows["Allium ursinum"]["level"] == "limited"
    assert rows["Allium ursinum"]["counties"] == ["Kalmar", "Stockholm"]
    assert rows["Erinaceus europaeus"]["counties"] is None


@pytest.mark.parametrize(
    ("text", "names"),
    [
        ("Fridlysningen gäller i Kalmar och Stockholms län", ["Kalmar", "Stockholm"]),
        ("Fridlysningen gäller i Skåne län", ["Skåne"]),
        ("Fridlysningen gäller i Gotlands, Kalmar och Västra Götalands län", ["Gotland", "Kalmar", "Västra Götaland"]),
    ],
)
def test_county_names(text, names):
    assert county_names(text) == names


def test_the_strongest_listing_wins():
    assert strongest(["limited", "basic"]) == "basic"
    assert strongest(["basic", "annex"]) == "annex"
    assert strongest(["annex", "strict"]) == "strict"
    assert LEVEL_ORDER[0] == "strict"
