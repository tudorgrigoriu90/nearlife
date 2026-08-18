"""Localised give/protect/habitat templates and season phrasing (T-180).

`give`, `protect` and the habitat half of `whenAndHow` are taxon templates, not per-species text —
so roughly 46 strings translate all three fields for every one of the 6,824 shipped species. With
facts sourced per language rather than translated (T-179), this file *is* the translation job.

The season phrase deliberately is not a translated string. English composes it — "from May to
September" — and that breaks wherever a month inflects after a preposition. Each locale therefore
supplies three month lists, because a month can take a different case in each slot. Russian is the
proof: "в мае" (prepositional, list), "с мая" (genitive, from), "по сентябрь" (accusative, to). In
English and Swedish all three coincide, which is exactly why a two-list model looked sufficient
until a Slavic language was written out.

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
    months: tuple[str, ...]  # bare list form
    months_from: tuple[str, ...]  # the form after the range pattern's opening preposition
    months_to: tuple[str, ...]  # the form after its closing preposition
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

# --- Immigrant-language roster (T-178: free, v1 scope) -----------------------------------------
# These are conservation and access instructions, not nomenclature: general-purpose prose, which is
# why they are written here rather than sourced. Species *names* remain a sourcing problem (T-159).

AR_TEMPLATES = {
    "bird": {
        "give": "ضَعْ صندوق تعشيش يناسب أنواع المنطقة، ووفّر ماءً نظيفًا في الصيف، وأبقِ القطط داخل المنزل في موسم التعشيش.",
        "protect": "لا تُزعج الأعشاش وأماكنها، وقُد الكلب مربوطًا قرب الطيور التي تعشش على الأرض، وقلّل الإضاءة الليلية واصطدام الطيور بالنوافذ.",
        "habitat": "في الغابات والأراضي الرطبة والحدائق حيث تتغذّى وتُعشِّش",
    },
    "mammal": {
        "give": "اترك زوايا برّية وأسيجة نباتية، وفتحة في السياج تمرّ منها الحيوانات الصغيرة، وأكوام حطب وأوراق غير مُزعَجة للإيواء.",
        "protect": "قُد بحذر عند الفجر والغسق، وأبقِ الكلب تحت السيطرة في مناطق الحياة البرية، ولا تُطعم الثدييات البرية ولا تقترب منها.",
        "habitat": "عند أطراف الغابات والمروج والمخابئ الهادئة",
    },
    "insect": {
        "give": "اترك جزءًا من العشب ينمو، وازرع أزهارًا متنوعة تناسب الملقِّحات، واترك أوراق الشجر والخشب الميت لتقضي فيها الشتاء.",
        "protect": "تجنّب المبيدات الحشرية، واترك أرضًا برّية غير مُزعَجة، وقلّل الإضاءة الخارجية غير الضرورية.",
        "habitat": "حول المروج والأزهار والخشب الميت",
    },
    "arachnid": {
        "give": "اترك زوايا هادئة وأوراقًا متساقطة وخشبًا ميتًا حيث تصطاد وتحتمي.",
        "protect": "تجنّب المبيدات، وانقل ما تجده منها داخل البيت بدل أن تؤذيه.",
        "habitat": "في النباتات غير المُزعَجة والأوراق المتساقطة والخشب الميت",
    },
    "fish": {
        "give": "ساعد على إبقاء المجاري المائية نظيفة ومظلّلة بنباتات الضفاف، وادعم إزالة الحواجز ليتمكّن السمك من الهجرة.",
        "protect": "لا تلوّث المجاري المائية ولا تُلقِ فيها النفايات، والتزم بقواعد الصيد والإعادة إلى الماء، ولا تُزعج أماكن التكاثر.",
        "habitat": "في البحيرات والأنهار والجداول التي يعيش فيها",
    },
    "amphibian": {
        "give": "احتفظ ببركة أو ركن رطب مظلَّل، واترك أكوام الحطب والحجارة، وأبقِ ممرات آمنة بين الماء واليابسة.",
        "protect": "انتبه لعبورها الطرق في الربيع، ولا تنقلها ولا تمسكها، وأبقِ الماء خاليًا من التلوث والنفايات.",
        "habitat": "قرب البِرَك والخنادق والأرض الرطبة",
    },
    "reptile": {
        "give": "اترك أكوام حجارة وحطب مشمسة تتشمّس عليها وأرضًا خشنة غير مُزعَجة للاحتماء.",
        "protect": "لا تمسك الحيوانات ولا تنقلها، وأبقِ الكلب على المسار في مناطق الزواحف، واترك أماكن التشمّس دون إزعاج.",
        "habitat": "على المنحدرات المشمسة والأراضي المفتوحة وأكوام الحجارة",
    },
    "mollusc": {
        "give": "أبقِ ملاجئ رطبة مظلَّلة مثل أكوام الحطب، واترك بعض الأوراق المتساقطة.",
        "protect": "تجنّب حبيبات قتل البزاق والمبيدات، وأبقِ المجاري المائية نظيفة لأنواع المياه العذبة.",
        "habitat": "في الأماكن الرطبة المظلَّلة والمياه العذبة النظيفة",
    },
    "plant": {
        "give": "دَعِ النباتات المحلية تنمو، وقلّل القص وأخّره في السنة، واترك رؤوس البذور قائمة طوال الشتاء.",
        "protect": "لا تقطف النباتات البرية ولا تقتلعها، والتزم بالمسارات في المناطق الحساسة، ولا تُدخل نباتات غير محلية أبدًا.",
        "habitat": "في المروج والغابات وحواف الطرق حيث ينمو",
    },
    "fungus": {
        "give": "اترك الخشب الميت والأوراق المتساقطة حيث تُثمر الفطريات، وامشِ برفق في الغابة.",
        "protect": "خذ فقط ما تسمح به القواعد المحلية، ولا تدُس الأجسام الثمرية، ولا تعتمد أبدًا على تطبيق لتقرّر إن كان الفطر صالحًا للأكل.",
        "habitat": "على أرض الغابة والخشب الميت والأوراق المتساقطة",
    },
}
AR_MONTHS = ("يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
             "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر")

SO_TEMPLATES = {
    "bird": {
        "give": "Dhig sanduuq buul oo ku habboon noocyada deegaanka, biyo nadiif ah xagaaga joogtee, oo bisadaha guriga ku hay xilliga buulaynta.",
        "protect": "Ha carqaladayn buulasha iyo meelaha ay ku buulaystaan, eeyaha xidho meelaha ay shimbiruhu dhulka ku buulaystaan, oo yaree iftiinka habeenkii iyo ku dhicidda daaqadaha.",
        "habitat": "kaymaha, meelaha qoyan iyo beeraha ay wax ka cunto oo ay ku buulaysato",
    },
    "mammal": {
        "give": "U dhaaf geeso duurjoog ah iyo xayndaab dhir ah, dalool xayndaabka ah oo xayawaanka yaryari ka gudbaan, iyo tuulmooyin qoryo iyo caleemo ah oo aan la dhaqaajin.",
        "protect": "Si taxaddar leh u wad waaberiga iyo fiidkii, eeyga ku hay ilaalo meelaha duurjoogta, oo weligaa ha quudin ama ha u dhowaan naasleyda duurjoogta ah.",
        "habitat": "cidhifyada kaymaha, doogga iyo meelaha xasilloon ee qarsoon",
    },
    "insect": {
        "give": "Qayb ka mid ah cawska u daa inuu koro, beero ubaxyo kala duwan oo ku habboon wax-shubta, oo u daa caleemaha iyo qoryaha dhintay si ay jiilaalka ugu noolaadaan.",
        "protect": "Ka fogow sunta cayayaanka, qayb dhul ah u daa inay duurjoog ahaato oo aan la taaban, oo yaree iftiinka banaanka ee aan loo baahnayn.",
        "habitat": "agagaarka doogga, ubaxyada iyo qoryaha dhintay",
    },
    "arachnid": {
        "give": "U daa geeso aan la dhaqaajin, caleemo dhacay iyo qoryo dhintay oo ay ku ugaadhsadaan kuna hoydaan.",
        "protect": "Ka fogow sunta, oo kuwa guriga ka helo u raro halkii aad wax u yeeli lahayd.",
        "habitat": "dhirta aan la taaban, caleemaha dhacay iyo qoryaha dhintay",
    },
    "fish": {
        "give": "Caawi in webiyaasha la nadiifiyo lagana hadhiyo dhirta xeebaha, oo taageer in caqabadaha la qaado si kalluunku u socdaalo.",
        "protect": "Ha wasakhayn hana qashin ku tuurin webiyaasha, raac xeerarka kalluumaysiga iyo qabo-oo-sii-daa, oo ha carqaladayn meelaha ay ku tarmaan.",
        "habitat": "harooyinka, webiyaasha iyo durdurrada uu ku noolyahay",
    },
    "amphibian": {
        "give": "Hay balli ama geeso qoyan oo hadh leh, u daa tuulmo qoryo iyo dhagax ah, oo ilaali waddooyin ammaan ah oo u dhexeeya biyaha iyo dhulka.",
        "protect": "Fiiri gudubka waddooyinka gu'ga, ha dhaqaajin hana qaban xayawaanka, oo biyaha ka ilaali wasakhda iyo qashinka.",
        "habitat": "agagaarka baliyada, wabiyada yaryar iyo dhulka qoyan",
    },
    "reptile": {
        "give": "U daa tuulmo dhagax iyo qoryo qorraxeed oo ay ku qorraxdaan iyo dhul qallafsan oo aan la dhaqaajin oo ay ku hoydaan.",
        "protect": "Ha qaban hana dhaqaajin xayawaanka, eeyga waddada ku hay meelaha xamaaratada, oo u daa meelaha qorraxda dhaafsan.",
        "habitat": "jiirarka qorraxda leh, banaanka iyo tuulmooyinka dhagaxa",
    },
    "mollusc": {
        "give": "Hay meelo qoyan oo hadh leh sida tuulmooyinka qoryaha, oo qayb caleemo ah u daa.",
        "protect": "Ka fogow sunta shabeelyada iyo cayayaanka, oo webiyaasha u nadiifi noocyada biyaha macaan.",
        "habitat": "meelaha qoyan ee hadhka leh iyo biyaha macaan ee nadiifka ah",
    },
    "plant": {
        "give": "U daa dhirta asalka ah inay korto, jar mar yar oo sanadka dib u dhig, oo madaxyada abuurka u daa inay jiilaalka taagnaadaan.",
        "protect": "Ha goyn hana rujin dhirta duurjoogta ah, waddooyinka ku raac meelaha nugul, oo weligaa ha keenin dhir shisheeye.",
        "habitat": "doogga, kaymaha iyo cidhifyada waddooyinka ee ay ka baxdo",
    },
    "fungus": {
        "give": "U daa qoryaha dhintay iyo caleemaha dhacay meesha ay boqoshaadu ka soo baxdo, oo si tartiib ah ugu dhaqaaq kaynta.",
        "protect": "Qaado oo keliya waxa xeerarka deegaanku ogolyihiin, ha ku tuman midhaha, oo weligaa ha ku tiirsanaan app go'aaminaya in boqoshaadu la cuni karo.",
        "habitat": "dhulka kaynta, qoryaha dhintay iyo caleemaha dhacay",
    },
}
SO_MONTHS = ("Jannaayo", "Febraayo", "Maarso", "Abriil", "Maajo", "Juun",
             "Luulyo", "Agoosto", "Sebtembar", "Oktoobar", "Nofembar", "Diseembar")


LOCALES: dict[str, LocaleStrings] = {
    "en": LocaleStrings(
        months=EN_MONTHS,
        months_from=EN_MONTHS,
        months_to=EN_MONTHS,
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
        months_from=SV_MONTHS,
        months_to=SV_MONTHS,
        year_round="året runt",
        range_pattern="från {first} till {last}",
        list_pattern="i {months}",
        list_separator=", ",
        unknown="vid olika tider under året",
        sentence="Aktiv i din region {when}. Leta efter den {hint}.",
        templates=SV_TEMPLATES,
    ),
    "ar": LocaleStrings(
        months=AR_MONTHS,
        months_from=AR_MONTHS,
        months_to=AR_MONTHS,
        year_round="طوال العام",
        range_pattern="من {first} إلى {last}",
        list_pattern="في {months}",
        list_separator="، ",
        unknown="في أوقات مختلفة من العام",
        sentence="نشِط في منطقتك {when}. ابحث عنه {hint}.",
        templates=AR_TEMPLATES,
    ),
    "so": LocaleStrings(
        months=SO_MONTHS,
        months_from=SO_MONTHS,
        months_to=SO_MONTHS,
        year_round="sanadka oo dhan",
        range_pattern="laga bilaabo {first} ilaa {last}",
        list_pattern="bisha {months}",
        list_separator=", ",
        unknown="waqtiyo kala duwan oo sanadka ah",
        sentence="Wuxuu ku firfircoon yahay gobolkaaga {when}. Ka raadi {hint}.",
        templates=SO_TEMPLATES,
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
        return st.range_pattern.format(first=st.months_from[m[0] - 1], last=st.months_to[m[-1] - 1])
    return st.list_pattern.format(months=st.list_separator.join(st.months[i - 1] for i in m))


def when_and_how(taxon: str, active_months: list[int], locale: str = "en") -> str:
    st = strings_for(locale)
    hint = st.templates.get(taxon, {}).get("habitat", st.templates["mammal"]["habitat"])
    return st.sentence.format(when=months_phrase(active_months, locale), hint=hint)
