"""Romanian names from the first sentence of a Romanian Wikipedia fact (T-393). The sentences are
real ones from species_content (ro, fact_origin = 'wikipedia')."""

import pytest

from names_from_facts import name_from_ro_fact

FOUND = [
    ("Sorbus aucuparia", "Sorbus aucuparia, numită în mod obișnuit scoruș de munte, scoruș păsăresc sau sorb păsăresc, este o specie de arbori din familia Rosaceae.", "scoruș de munte"),
    ("Dolomedes fimbriatus", "Dolomedes fimbriatus, numit și păianjen plută, este o specie europeană de păianjeni semiacvatici din familia Pisauridae.", "păianjen plută"),
    ("Equisetum pratense", "Equisetum pratense, cunoscută sub numele de coada-calului de pajiște sau coada-calului umbrită, este o specie de plante", "coada-calului de pajiște"),
    ("Artemisia vulgaris", "Artemisia vulgaris (denumirile populare pelinariță și pelin negru) este o specie de plantă din genul Artemisia", "pelinariță"),
    ("Lamium galeobdolon", "Lamium galeobdolon L, cunoscută și sub denumirea populară de urzică moartă-galbenă, este o plantă regăsită", "urzică moartă-galbenă"),
    ("Rumex obtusifolius", "Rumex obtusifolius, cunoscută în mod obișnuit sub numele de măcrișul calului, este o plantă perenă", "măcrișul calului"),
    ("Prunus serotina", "Prunus serotina, denumit comun și cireș negru (american), este un arbore sau uneori arbust din genul Prunus.", "cireș negru"),
    ("Formica aquilonia", "Formica aquilonia, denumită și „furnică scoțiană de lemn”, este o specie din genul furnică de lemn", "furnică scoțiană de lemn"),
    ("Macroglossum stellatarum", "Macroglossum stellatarum (cunoscută și ca molia colibri sau fluturele coadă de porumbel) este o specie de molie", "molia colibri"),
    ("Vanessa atalanta", "Vanessa atalanta, cunoscută sub numele comun de amiral sau amiral roșu, este o specie de fluture", "amiral"),
    ("Salticus scenicus", "Salticus scenicus (supranumit Păianjen zebră) sau păianjenul saltimbanc, este o specie de păianjen săritor", "Păianjen zebră"),
    ("Schoenoplectus lacustris", "Schoenoplectus lacustris, denumită popular țipirig, este o specie de papură", "țipirig"),
    ("Elymus repens", "Pirul târâtor (Elymus repens) este o specie de plantă perenă, cu rizomi lungi", "Pirul târâtor"),
    ("Dreissena polymorpha", "Midia zebră (Dreissena polymorpha), numită și scoica zebră, aparține familiei Autolamellibranchiata", "Midia zebră"),
]

NOT_FOUND = [
    # The name is said later, or about another country, or the parenthesis is another species.
    ("Myrmarachne formicaria", "Myrmarachne formicaria este un păianjen săritor din familia Salticidae. Face parte din genul Myrmarachne, cunoscut pentru imitarea furnicilor."),
    ("Cynegetis impunctata", "Cynegetis impunctata este o specie de buburuză originară din Europa continentală. În Germania este cunoscută ca „Buburuza de iarbă”."),
    ("Stellaria aquatica", "Pleșcaița (Myosoton aquaticum) numită și pleșcaiță acvatică este o plantă erbacee perenă"),
    ("Ranunculus acris", "Ranunculus acris este o specie de plantă cu flori din familia Ranunculaceae"),
    ("Drosophila melanogaster", "Drosophila melanogaster (grecescul pentru „Iubitorul de rouă cu burtă neagră” δρόσος = rouă) este o specie"),
]


@pytest.mark.parametrize(("scientific", "fact", "name"), FOUND)
def test_the_first_popular_name_is_found(scientific, fact, name):
    assert name_from_ro_fact(fact, scientific) == name


@pytest.mark.parametrize(("scientific", "fact"), NOT_FOUND)
def test_nothing_is_guessed(scientific, fact):
    assert name_from_ro_fact(fact, scientific) is None


def test_no_fact_no_name():
    assert name_from_ro_fact(None, "Sorbus aucuparia") is None
    assert name_from_ro_fact("", "Sorbus aucuparia") is None
