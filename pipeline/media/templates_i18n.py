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


RU_TEMPLATES = {
    "bird": {
        "give": "Повесьте скворечник, подходящий для местных видов, летом держите поилку с чистой водой, а в период гнездования не выпускайте кошек на улицу.",
        "protect": "Не тревожьте гнёзда и места гнездования, держите собаку на поводке рядом с наземногнездящимися птицами, приглушите ночное освещение и защитите окна от столкновений.",
        "habitat": "в лесах, на болотах и в садах, где она кормится и гнездится",
    },
    "mammal": {
        "give": "Оставьте дикие уголки и живые изгороди, лаз в заборе для мелких зверей и нетронутые кучи валежника и листвы для укрытия.",
        "protect": "Ездите осторожно на рассвете и в сумерках, держите собаку под контролем в местах обитания зверей и никогда не подкармливайте диких животных и не подходите к ним.",
        "habitat": "на опушках, лугах и в тихих укрытиях",
    },
    "insect": {
        "give": "Дайте части газона зарасти, посадите разные растения для опылителей и оставьте листву и валежник для зимовки.",
        "protect": "Откажитесь от пестицидов и инсектицидов, сохраните участок дикой нетронутой земли и уменьшите лишнее наружное освещение.",
        "habitat": "на лугах, среди цветов и валежника",
    },
    "arachnid": {
        "give": "Оставьте нетронутые уголки, опад и валежник, где они охотятся и укрываются.",
        "protect": "Не применяйте пестициды, а тех, кого находите в доме, лучше вынесите, чем убивайте.",
        "habitat": "в нетронутой растительности, опаде и валежнике",
    },
    "fish": {
        "give": "Помогайте сохранять водоёмы чистыми и затенёнными прибрежной растительностью и поддерживайте снос преград на пути миграции рыбы.",
        "protect": "Не засоряйте и не загрязняйте водоёмы, соблюдайте правила рыбалки и принцип «поймал — отпусти», не тревожьте нерестилища.",
        "habitat": "в озёрах, реках и ручьях, где она живёт",
    },
    "amphibian": {
        "give": "Заведите пруд или влажный тенистый уголок, оставьте кучи камней и брёвен и сохраните безопасные переходы между водой и сушей.",
        "protect": "Весной следите за их переходами через дороги, не берите их в руки и не переносите, держите воду чистой от загрязнений и мусора.",
        "habitat": "у прудов, канав и на сырой земле",
    },
    "reptile": {
        "give": "Оставьте солнечные кучи камней и брёвен для обогрева и неровную нетронутую землю для укрытия.",
        "protect": "Не берите животных в руки и не переносите их, держите собаку на тропе в местах обитания рептилий и не тревожьте места, где они греются.",
        "habitat": "на солнечных склонах, пустошах и каменных кучах",
    },
    "mollusc": {
        "give": "Сохраните влажные тенистые укрытия вроде куч брёвен и оставьте часть опада.",
        "protect": "Откажитесь от средств от слизней и пестицидов и держите водоёмы чистыми для пресноводных видов.",
        "habitat": "во влажных тенистых местах и чистой пресной воде",
    },
    "plant": {
        "give": "Дайте местным растениям расти, косите реже и позже в сезоне, а семенные головки оставьте стоять на зиму.",
        "protect": "Не рвите и не выкапывайте дикие растения, держитесь троп в уязвимых местах и никогда не высаживайте чужеродные виды.",
        "habitat": "на лугах, в лесах и вдоль обочин, где оно растёт",
    },
    "fungus": {
        "give": "Оставляйте валежник и опад там, где плодоносят грибы, и ходите по лесу бережно.",
        "protect": "Берите только то, что разрешают местные правила, не топчите плодовые тела и никогда не полагайтесь на приложение, решая, съедобен ли гриб.",
        "habitat": "на лесной подстилке, валежнике и в опаде",
    },
}
# Three forms because the slot decides the case: "в мае", "с мая", "по сентябрь".
RU_MONTHS_IN = ("январе", "феврале", "марте", "апреле", "мае", "июне",
                "июле", "августе", "сентябре", "октябре", "ноябре", "декабре")
RU_MONTHS_FROM = ("января", "февраля", "марта", "апреля", "мая", "июня",
                  "июля", "августа", "сентября", "октября", "ноября", "декабря")
RU_MONTHS_TO = ("январь", "февраль", "март", "апрель", "май", "июнь",
                "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь")

UK_TEMPLATES = {
    "bird": {
        "give": "Повісьте шпаківню, придатну для місцевих видів, улітку тримайте чисту воду, а в період гніздування не випускайте котів надвір.",
        "protect": "Не турбуйте гнізда та місця гніздування, тримайте собаку на повідку біля птахів, що гніздяться на землі, приглушіть нічне освітлення й убезпечте вікна.",
        "habitat": "у лісах, на болотах і в садах, де він живиться та гніздиться",
    },
    "mammal": {
        "give": "Залиште дикі закутки й живоплоти, отвір у паркані для дрібних звірів і незаймані купи хмизу та листя для схову.",
        "protect": "Їдьте обережно на світанку й у сутінках, тримайте собаку під контролем у місцях мешкання звірів і ніколи не годуйте диких тварин і не наближайтеся до них.",
        "habitat": "на узліссях, луках і в тихих схованках",
    },
    "insect": {
        "give": "Дайте частині газону зарости, посадіть різні квіти для запилювачів і залиште листя та мертву деревину для зимівлі.",
        "protect": "Не застосовуйте пестициди й інсектициди, збережіть ділянку дикої незайманої землі та зменшіть зайве зовнішнє освітлення.",
        "habitat": "на луках, серед квітів і мертвої деревини",
    },
    "arachnid": {
        "give": "Залиште незаймані закутки, опад і мертву деревину, де вони полюють і ховаються.",
        "protect": "Не застосовуйте пестициди, а тих, кого знаходите вдома, краще винесіть, ніж убивайте.",
        "habitat": "у незайманій рослинності, опаді та мертвій деревині",
    },
    "fish": {
        "give": "Допомагайте тримати водойми чистими й затіненими прибережною рослинністю та підтримуйте усунення перешкод на шляху міграції риби.",
        "protect": "Не смітьте й не забруднюйте водойми, дотримуйтесь правил риболовлі та принципу «злови й відпусти», не турбуйте нерестовища.",
        "habitat": "в озерах, річках і струмках, де вона живе",
    },
    "amphibian": {
        "give": "Облаштуйте ставок або вологий затінений закуток, залиште купи каміння й колод і збережіть безпечні переходи між водою та сушею.",
        "protect": "Навесні пильнуйте їхні переходи через дороги, не беріть їх до рук і не переносьте, тримайте воду чистою від забруднень і сміття.",
        "habitat": "біля ставків, канав і на вологій землі",
    },
    "reptile": {
        "give": "Залиште сонячні купи каміння й колод для обігріву та нерівну незайману землю для схову.",
        "protect": "Не беріть тварин до рук і не переносьте їх, тримайте собаку на стежці в місцях мешкання плазунів і не турбуйте місця, де вони гріються.",
        "habitat": "на сонячних схилах, пустищах і купах каміння",
    },
    "mollusc": {
        "give": "Збережіть вологі затінені схованки на кшталт куп колод і залиште частину опаду.",
        "protect": "Не застосовуйте засоби від слимаків і пестициди та тримайте водойми чистими для прісноводних видів.",
        "habitat": "у вологих затінених місцях і чистій прісній воді",
    },
    "plant": {
        "give": "Дайте місцевим рослинам рости, косіть рідше й пізніше в сезоні, а насінні голівки залиште стояти на зиму.",
        "protect": "Не рвіть і не викопуйте дикі рослини, тримайтеся стежок у вразливих місцях і ніколи не висаджуйте чужорідні види.",
        "habitat": "на луках, у лісах і вздовж узбіч, де вона росте",
    },
    "fungus": {
        "give": "Залишайте мертву деревину й опад там, де плодоносять гриби, і ходіть лісом обережно.",
        "protect": "Беріть лише те, що дозволяють місцеві правила, не топчіть плодові тіла й ніколи не покладайтеся на застосунок, вирішуючи, чи гриб їстівний.",
        "habitat": "на лісовій підстилці, мертвій деревині та в опаді",
    },
}
UK_MONTHS_IN = ("січні", "лютому", "березні", "квітні", "травні", "червні",
                "липні", "серпні", "вересні", "жовтні", "листопаді", "грудні")
UK_MONTHS_GEN = ("січня", "лютого", "березня", "квітня", "травня", "червня",
                 "липня", "серпня", "вересня", "жовтня", "листопада", "грудня")


FA_TEMPLATES = {
    "bird": {
        "give": "لانهٔ مصنوعی مناسب گونه‌های محلی نصب کنید، در تابستان آب تمیز فراهم کنید و در فصل جوجه‌آوری گربه‌ها را داخل خانه نگه دارید.",
        "protect": "لانه‌ها و محل‌های لانه‌سازی را آشفته نکنید، نزدیک پرندگانی که روی زمین لانه می‌سازند سگ را ببندید و نور شبانه و برخورد با پنجره‌ها را کم کنید.",
        "habitat": "در جنگل‌ها، تالاب‌ها و باغ‌هایی که در آن‌ها غذا می‌خورد و لانه می‌سازد",
    },
    "mammal": {
        "give": "گوشه‌های وحشی و پرچین‌ها را رها کنید، شکافی در حصار برای عبور جانوران کوچک بگذارید و توده‌های چوب و برگ را دست‌نخورده نگه دارید.",
        "protect": "سپیده‌دم و غروب با احتیاط رانندگی کنید، در زیستگاه‌های حیات وحش سگ را کنترل کنید و هرگز به پستانداران وحشی غذا ندهید و به آن‌ها نزدیک نشوید.",
        "habitat": "در حاشیهٔ جنگل‌ها، مرغزارها و پناهگاه‌های آرام",
    },
    "insect": {
        "give": "بخشی از چمن را بگذارید رشد کند، گل‌های متنوع مناسب گرده‌افشان‌ها بکارید و برگ‌ها و چوب مرده را برای زمستان‌گذرانی رها کنید.",
        "protect": "از آفت‌کش‌ها و حشره‌کش‌ها پرهیز کنید، بخشی از زمین را وحشی و دست‌نخورده نگه دارید و روشنایی غیرضروری بیرون را کم کنید.",
        "habitat": "پیرامون مرغزارها، گل‌ها و چوب مرده",
    },
    "arachnid": {
        "give": "گوشه‌های دست‌نخورده، خاشاک برگ و چوب مرده را که در آن شکار می‌کنند و پناه می‌گیرند رها کنید.",
        "protect": "از آفت‌کش‌ها پرهیز کنید و آن‌هایی را که در خانه می‌یابید به‌جای آسیب‌رساندن جابه‌جا کنید.",
        "habitat": "در پوشش گیاهی دست‌نخورده، خاشاک برگ و چوب مرده",
    },
    "fish": {
        "give": "به پاکیزه و سایه‌دار ماندن آبراه‌ها با پوشش گیاهی کناره کمک کنید و از برداشتن موانع مهاجرت ماهی پشتیبانی کنید.",
        "protect": "آبراه‌ها را آلوده نکنید و در آن‌ها زباله نریزید، قوانین ماهیگیری و صید و رهاسازی را رعایت کنید و محل‌های تخم‌ریزی را آشفته نکنید.",
        "habitat": "در دریاچه‌ها، رودها و جویبارهایی که در آن‌ها زندگی می‌کند",
    },
    "amphibian": {
        "give": "برکه یا گوشه‌ای نمناک و سرپوشیده نگه دارید، توده‌های چوب و سنگ را رها کنید و مسیرهای امن میان آب و خشکی را حفظ کنید.",
        "protect": "در بهار مراقب عبورشان از جاده‌ها باشید، آن‌ها را جابه‌جا نکنید و در دست نگیرید و آب را از آلودگی و زباله دور نگه دارید.",
        "habitat": "نزدیک برکه‌ها، آبراه‌های کوچک و زمین نمناک",
    },
    "reptile": {
        "give": "توده‌های سنگ و چوب آفتاب‌گیر برای گرم‌شدن و زمین ناهموار دست‌نخورده برای پناه رها کنید.",
        "protect": "جانوران را در دست نگیرید و جابه‌جا نکنید، در زیستگاه خزندگان سگ را در مسیر نگه دارید و محل‌های آفتاب‌گرفتن را آشفته نکنید.",
        "habitat": "روی شیب‌های آفتاب‌گیر، بوته‌زارها و توده‌های سنگ",
    },
    "mollusc": {
        "give": "پناهگاه‌های نمناک و سایه‌دار مانند توده‌های چوب را نگه دارید و بخشی از خاشاک برگ را رها کنید.",
        "protect": "از سموم حلزون‌کش و آفت‌کش‌ها پرهیز کنید و آبراه‌ها را برای گونه‌های آب شیرین پاکیزه نگه دارید.",
        "habitat": "در جاهای نمناک و سایه‌دار و آب شیرین پاکیزه",
    },
    "plant": {
        "give": "بگذارید گیاهان بومی رشد کنند، کمتر و دیرتر در سال چمن بزنید و غوزه‌های بذر را در زمستان سرِ پا رها کنید.",
        "protect": "گیاهان وحشی را نچینید و از ریشه درنیاورید، در مناطق حساس از مسیرها خارج نشوید و هرگز گیاه غیربومی وارد نکنید.",
        "habitat": "در مرغزارها، جنگل‌ها و حاشیهٔ راه‌ها که در آن می‌روید",
    },
    "fungus": {
        "give": "چوب مرده و خاشاک برگ را در جایی که قارچ‌ها میوه می‌دهند رها کنید و در جنگل آرام گام بردارید.",
        "protect": "تنها آنچه قوانین محلی اجازه می‌دهد بردارید، اندام‌های زایشی را لگد نکنید و هرگز برای تشخیص خوراکی‌بودن قارچ به یک اپلیکیشن تکیه نکنید.",
        "habitat": "روی کف جنگل، چوب مرده و خاشاک برگ",
    },
}
FA_MONTHS = ("ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
             "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر")

TR_TEMPLATES = {
    "bird": {
        "give": "Yöredeki türlere uygun bir kuş yuvası asın, yazın temiz su bulundurun ve kuluçka döneminde kedileri içeride tutun.",
        "protect": "Yuvaları ve yuvalama alanlarını rahatsız etmeyin, yerde kuluçkaya yatan kuşların yakınında köpeğinizi tasmalı gezdirin, gece aydınlatmasını ve cam çarpmalarını azaltın.",
        "habitat": "beslendiği ve yuva yaptığı ormanlarda, sulak alanlarda ve bahçelerde",
    },
    "mammal": {
        "give": "Yabani köşeler ve çalı çitleri bırakın, küçük memelilerin geçebileceği bir aralık açın ve odun ile yaprak yığınlarını el değmemiş bırakın.",
        "protect": "Şafakta ve alacakaranlıkta dikkatli sürün, yaban hayatı alanlarında köpeğinizi kontrol altında tutun, yabani memelileri asla beslemeyin ve onlara yaklaşmayın.",
        "habitat": "orman kenarlarında, çayırlarda ve sessiz sığınaklarda",
    },
    "insect": {
        "give": "Çimin bir bölümünü uzamaya bırakın, tozlayıcılara uygun çeşitli çiçekler ekin ve kışlamaları için yaprak ve ölü odun bırakın.",
        "protect": "Böcek ilaçlarından kaçının, bir miktar yeri yabani ve el değmemiş bırakın ve gereksiz dış aydınlatmayı azaltın.",
        "habitat": "çayırların, çiçeklerin ve ölü odunun çevresinde",
    },
    "arachnid": {
        "give": "Avlandıkları ve barındıkları el değmemiş köşeleri, yaprak döküntüsünü ve ölü odunu bırakın.",
        "protect": "Böcek ilaçlarından kaçının ve evde bulduklarınıza zarar vermek yerine onları dışarı taşıyın.",
        "habitat": "el değmemiş bitki örtüsünde, yaprak döküntüsünde ve ölü odunda",
    },
    "fish": {
        "give": "Su yollarının temiz kalmasına ve kıyı bitkileriyle gölgelenmesine yardım edin, balıkların göç edebilmesi için engellerin kaldırılmasını destekleyin.",
        "protect": "Su yollarını kirletmeyin ve çöp atmayın, balıkçılık kurallarına ve yakala-bırak ilkesine uyun, yumurtlama alanlarını rahatsız etmeyin.",
        "habitat": "yaşadığı göllerde, nehirlerde ve derelerde",
    },
    "amphibian": {
        "give": "Bir gölet ya da nemli, korunaklı bir köşe bulundurun, kütük ve taş yığınları bırakın, su ile kara arasında güvenli geçitler koruyun.",
        "protect": "İlkbaharda yol geçişlerine dikkat edin, hayvanları taşımayın ve elinizle tutmayın, suyu kirlilikten ve çöpten uzak tutun.",
        "habitat": "göletlerin, hendeklerin ve nemli toprağın yakınında",
    },
    "reptile": {
        "give": "Güneşlenecekleri güneşli taş ve kütük yığınları ile barınacakları engebeli, el değmemiş zemin bırakın.",
        "protect": "Hayvanları elinizle tutmayın ve taşımayın, sürüngen alanlarında köpeğinizi patikada tutun ve güneşlenme yerlerini rahatsız etmeyin.",
        "habitat": "güneşli yamaçlarda, fundalıklarda ve taş yığınlarında",
    },
    "mollusc": {
        "give": "Kütük yığınları gibi nemli, gölgeli sığınakları koruyun ve bir miktar yaprak döküntüsü bırakın.",
        "protect": "Sümüklüböcek ilaçlarından ve pestisitlerden kaçının, tatlı su türleri için su yollarını temiz tutun.",
        "habitat": "nemli, gölgeli yerlerde ve temiz tatlı suda",
    },
    "plant": {
        "give": "Yerli bitkilerin büyümesine izin verin, daha seyrek ve yılın daha geç bir döneminde biçin, tohum başlarını kış boyunca ayakta bırakın.",
        "protect": "Yabani bitkileri koparmayın ve sökmeyin, hassas alanlarda patikalardan ayrılmayın ve asla yabancı tür dikmeyin.",
        "habitat": "yetiştiği çayırlarda, ormanlarda ve yol kenarlarında",
    },
    "fungus": {
        "give": "Mantarların ürediği yerlerde ölü odunu ve yaprak döküntüsünü bırakın ve ormanda hafif adımlarla yürüyün.",
        "protect": "Yalnızca yerel kuralların izin verdiği kadarını alın, şapkalara basmayın ve bir mantarın yenebilir olup olmadığına karar vermek için asla bir uygulamaya güvenmeyin.",
        "habitat": "orman tabanında, ölü odunda ve yaprak döküntüsünde",
    },
}
# Turkish suffixes are vowel-harmonised, so each slot carries its own written-out form.
TR_MONTHS_LOC = ("Ocak'ta", "Şubat'ta", "Mart'ta", "Nisan'da", "Mayıs'ta", "Haziran'da",
                 "Temmuz'da", "Ağustos'ta", "Eylül'de", "Ekim'de", "Kasım'da", "Aralık'ta")
TR_MONTHS_ABL = ("Ocak'tan", "Şubat'tan", "Mart'tan", "Nisan'dan", "Mayıs'tan", "Haziran'dan",
                 "Temmuz'dan", "Ağustos'tan", "Eylül'den", "Ekim'den", "Kasım'dan", "Aralık'tan")
TR_MONTHS_DAT = ("Ocak'a", "Şubat'a", "Mart'a", "Nisan'a", "Mayıs'a", "Haziran'a",
                 "Temmuz'a", "Ağustos'a", "Eylül'e", "Ekim'e", "Kasım'a", "Aralık'a")


BS_TEMPLATES = {
    "bird": {
        "give": "Postavite kućicu za ptice prilagođenu lokalnim vrstama, ljeti držite čistu vodu, a u sezoni gniježđenja mačke držite u kući.",
        "protect": "Ne uznemiravajte gnijezda i gnjezdilišta, držite psa na povodcu blizu ptica koje se gnijezde na tlu, smanjite noćno osvjetljenje i sudare sa staklima.",
        "habitat": "u šumama, močvarama i vrtovima gdje se hrani i gnijezdi",
    },
    "mammal": {
        "give": "Ostavite divlje kutke i živice, otvor u ogradi kuda prolaze male životinje i netaknute hrpe drva i lišća za sklonište.",
        "protect": "Vozite oprezno u zoru i suton, držite psa pod kontrolom u staništima divljači i nikada ne hranite divlje sisare niti im prilazite.",
        "habitat": "na rubovima šuma, livadama i u mirnim zaklonima",
    },
    "insect": {
        "give": "Pustite dio travnjaka da naraste, posadite raznovrsno cvijeće za oprašivače i ostavite lišće i mrtvo drvo za prezimljavanje.",
        "protect": "Izbjegavajte pesticide i insekticide, ostavite dio zemljišta divljim i netaknutim i smanjite nepotrebno vanjsko osvjetljenje.",
        "habitat": "oko livada, cvijeća i mrtvog drva",
    },
    "arachnid": {
        "give": "Ostavite netaknute kutke, listinac i mrtvo drvo gdje love i sklanjaju se.",
        "protect": "Izbjegavajte pesticide, a one koje nađete u kući radije premjestite nego da im naudite.",
        "habitat": "u netaknutom raslinju, listincu i mrtvom drvu",
    },
    "fish": {
        "give": "Pomozite da vodotoci ostanu čisti i zasjenjeni obalnim raslinjem i podržite uklanjanje prepreka kako bi ribe mogle migrirati.",
        "protect": "Ne zagađujte vodotoke i ne bacajte otpad u njih, poštujte pravila ribolova i načelo uhvati-pa-pusti i ne uznemiravajte mrijestilišta.",
        "habitat": "u jezerima, rijekama i potocima u kojima živi",
    },
    "amphibian": {
        "give": "Održavajte baru ili vlažan, zaklonjen kutak, ostavite hrpe trupaca i kamenja i čuvajte sigurne prolaze između vode i kopna.",
        "protect": "U proljeće pazite na njihove prelaske preko cesta, ne premještajte ih i ne uzimajte u ruke, a vodu čuvajte od zagađenja i otpada.",
        "habitat": "blizu bara, jaraka i vlažnog tla",
    },
    "reptile": {
        "give": "Ostavite sunčane hrpe kamenja i trupaca za grijanje i neravno, netaknuto tlo za sklonište.",
        "protect": "Ne uzimajte životinje u ruke i ne premještajte ih, držite psa na stazi u područjima gmizavaca i ne uznemiravajte mjesta za sunčanje.",
        "habitat": "na sunčanim padinama, vrištinama i hrpama kamenja",
    },
    "mollusc": {
        "give": "Zadržite vlažna, sjenovita skloništa poput hrpa trupaca i ostavite dio listinca.",
        "protect": "Izbjegavajte sredstva protiv puževa i pesticide i držite vodotoke čistima za slatkovodne vrste.",
        "habitat": "na vlažnim, sjenovitim mjestima i u čistoj slatkoj vodi",
    },
    "plant": {
        "give": "Pustite samonikle biljke da rastu, kosite rjeđe i kasnije u godini i ostavite sjemenke da stoje preko zime.",
        "protect": "Ne berite i ne iskopavajte divlje biljke, držite se staza u osjetljivim područjima i nikada ne unosite strane vrste.",
        "habitat": "na livadama, u šumama i uz rubove puteva gdje raste",
    },
    "fungus": {
        "give": "Ostavljajte mrtvo drvo i listinac ondje gdje gljive plodonose i hodajte šumom obazrivo.",
        "protect": "Uzmite samo ono što lokalna pravila dopuštaju, ne gazite plodišta i nikada se ne oslanjajte na aplikaciju da procijenite je li gljiva jestiva.",
        "habitat": "na šumskom tlu, mrtvom drvu i u listincu",
    },
}
BS_MONTHS = ("januaru", "februaru", "martu", "aprilu", "maju", "junu",
             "julu", "avgustu", "septembru", "oktobru", "novembru", "decembru")
BS_MONTHS_GEN = ("januara", "februara", "marta", "aprila", "maja", "juna",
                 "jula", "avgusta", "septembra", "oktobra", "novembra", "decembra")

SQ_TEMPLATES = {
    "bird": {
        "give": "Vendosni një fole artificiale të përshtatshme për llojet vendase, mbani ujë të pastër në verë dhe mbajini macet brenda gjatë sezonit të folezimit.",
        "protect": "Mos shqetësoni foletë dhe vendfolezimet, mbajeni qenin me rrip pranë zogjve që folezojnë në tokë, zvogëloni ndriçimin e natës dhe përplasjet me xhamat.",
        "habitat": "në pyje, ligatina dhe kopshte ku ushqehet dhe folezon",
    },
    "mammal": {
        "give": "Lini cepa të egra dhe gardhe të gjalla, një hapësirë në gardh që kafshët e vogla të kalojnë dhe grumbuj druri e gjethesh të paprekur për strehë.",
        "protect": "Ngisni me kujdes në agim dhe muzg, mbajeni qenin nën kontroll në zonat e faunës dhe kurrë mos ushqeni e mos u afroni gjitarëve të egër.",
        "habitat": "në buzë pyjesh, livadhe dhe strehë të qeta",
    },
    "insect": {
        "give": "Lëreni një pjesë të lëndinës të rritet, mbillni lule të larmishme për pluhurizuesit dhe lini gjethe e dru të vdekur për dimërim.",
        "protect": "Shmangni pesticidet dhe insekticidet, lini një pjesë toke të egër e të paprekur dhe zvogëloni ndriçimin e panevojshëm të jashtëm.",
        "habitat": "rreth livadheve, luleve dhe drurit të vdekur",
    },
    "arachnid": {
        "give": "Lini cepa të paprekur, shtresë gjethesh dhe dru të vdekur ku gjuajnë e strehohen.",
        "protect": "Shmangni pesticidet dhe ato që gjeni brenda shtëpisë zhvendosini në vend që t'i dëmtoni.",
        "habitat": "në bimësi të paprekur, shtresë gjethesh dhe dru të vdekur",
    },
    "fish": {
        "give": "Ndihmoni që rrjedhat ujore të mbeten të pastra e të hijezuara nga bimësia bregore dhe mbështetni heqjen e pengesave që peshqit të migrojnë.",
        "protect": "Mos ndotni dhe mos hidhni mbeturina në rrjedhat ujore, respektoni rregullat e peshkimit dhe parimin kap-e-lësho dhe mos shqetësoni vendet e shumimit.",
        "habitat": "në liqene, lumenj dhe përrenj ku jeton",
    },
    "amphibian": {
        "give": "Mbani një pellg ose një cep të lagësht e të strehuar, lini grumbuj trungjesh e gurësh dhe ruani kalime të sigurta midis ujit dhe tokës.",
        "protect": "Në pranverë kini kujdes kalimet e tyre nëpër rrugë, mos i zhvendosni dhe mos i merrni në dorë, mbajeni ujin pa ndotje e mbeturina.",
        "habitat": "pranë pellgjeve, kanaleve dhe tokës së lagësht",
    },
    "reptile": {
        "give": "Lini grumbuj gurësh e trungjesh me diell për t'u ngrohur dhe tokë të ashpër e të paprekur për strehë.",
        "protect": "Mos i merrni kafshët në dorë dhe mos i zhvendosni, mbajeni qenin në shteg në zonat e zvarranikëve dhe mos shqetësoni vendet ku ngrohen.",
        "habitat": "në shpate me diell, shkurreta dhe grumbuj gurësh",
    },
    "mollusc": {
        "give": "Ruani strehë të lagështa e me hije si grumbujt e trungjeve dhe lini një pjesë të shtresës së gjetheve.",
        "protect": "Shmangni granulat kundër kërmijve dhe pesticidet dhe mbajini rrjedhat ujore të pastra për llojet e ujërave të ëmbla.",
        "habitat": "në vende të lagështa e me hije dhe në ujë të ëmbël të pastër",
    },
    "plant": {
        "give": "Lëreni bimësinë vendase të rritet, kositni më rrallë e më vonë gjatë vitit dhe lini kokrrat e farës në këmbë gjatë dimrit.",
        "protect": "Mos këputni dhe mos shkulni bimët e egra, qëndroni në shtigje në zonat e ndjeshme dhe kurrë mos futni bimë jovendase.",
        "habitat": "në livadhe, pyje dhe buzë rrugësh ku rritet",
    },
    "fungus": {
        "give": "Lini dru të vdekur dhe shtresë gjethesh aty ku kërpudhat frytëzojnë dhe ecni butë nëpër pyll.",
        "protect": "Merrni vetëm sa lejojnë rregullat vendase, mos shkelni trupat frytëzues dhe kurrë mos u mbështetni te një aplikacion për të gjykuar nëse një kërpudhë është e ngrënshme.",
        "habitat": "në dyshemenë e pyllit, drurin e vdekur dhe shtresën e gjetheve",
    },
}
SQ_MONTHS = ("janar", "shkurt", "mars", "prill", "maj", "qershor",
             "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor")

VI_TEMPLATES = {
    "bird": {
        "give": "Treo tổ nhân tạo phù hợp với các loài bản địa, giữ nguồn nước sạch vào mùa hè và nhốt mèo trong nhà suốt mùa làm tổ.",
        "protect": "Đừng quấy nhiễu tổ và nơi làm tổ, xích chó khi ở gần những loài làm tổ dưới đất, giảm ánh sáng ban đêm và va chạm vào cửa kính.",
        "habitat": "ở rừng, vùng đất ngập nước và vườn nơi nó kiếm ăn và làm tổ",
    },
    "mammal": {
        "give": "Chừa lại những góc hoang và hàng rào cây, một khe hở dưới hàng rào cho thú nhỏ đi qua, cùng đống củi và lá khô không bị xáo trộn để làm nơi trú.",
        "protect": "Lái xe cẩn thận lúc bình minh và hoàng hôn, kiểm soát chó ở khu vực có thú hoang, và đừng bao giờ cho ăn hay lại gần thú hoang.",
        "habitat": "ở bìa rừng, đồng cỏ và những nơi trú ẩn yên tĩnh",
    },
    "insect": {
        "give": "Để một phần bãi cỏ mọc tự nhiên, trồng nhiều loại hoa cho loài thụ phấn, và giữ lại lá rụng cùng gỗ mục cho chúng qua đông.",
        "protect": "Tránh thuốc trừ sâu, giữ lại một khoảng đất hoang không bị xáo trộn, và giảm ánh sáng ngoài trời không cần thiết.",
        "habitat": "quanh đồng cỏ, hoa và gỗ mục",
    },
    "arachnid": {
        "give": "Chừa lại những góc yên tĩnh, lớp lá rụng và gỗ mục nơi chúng săn mồi và trú ẩn.",
        "protect": "Tránh thuốc trừ sâu, và hãy đưa những con bạn gặp trong nhà ra ngoài thay vì làm hại chúng.",
        "habitat": "trong thảm thực vật yên tĩnh, lá rụng và gỗ mục",
    },
    "fish": {
        "give": "Giúp giữ dòng nước sạch và có bóng mát nhờ thảm thực vật ven bờ, và ủng hộ việc dỡ bỏ vật cản để cá di cư.",
        "protect": "Đừng gây ô nhiễm hay xả rác xuống dòng nước, tuân thủ quy định câu cá và nguyên tắc bắt rồi thả, và đừng quấy nhiễu bãi đẻ.",
        "habitat": "ở hồ, sông và suối nơi nó sinh sống",
    },
    "amphibian": {
        "give": "Giữ một ao nhỏ hoặc góc ẩm có che chắn, chừa lại đống gỗ và đá, và duy trì lối đi an toàn giữa nước và cạn.",
        "protect": "Mùa xuân hãy để ý chúng băng qua đường, đừng di dời hay cầm nắm chúng, và giữ nước sạch khỏi ô nhiễm và rác.",
        "habitat": "gần ao, mương và vùng đất ẩm",
    },
    "reptile": {
        "give": "Chừa lại đống đá và gỗ có nắng để chúng sưởi, cùng nền đất gồ ghề không bị xáo trộn để trú ẩn.",
        "protect": "Đừng cầm nắm hay di dời chúng, giữ chó trên lối đi ở khu vực có bò sát, và đừng quấy nhiễu nơi chúng sưởi nắng.",
        "habitat": "trên sườn dốc nhiều nắng, vùng cây bụi và đống đá",
    },
    "mollusc": {
        "give": "Giữ lại những nơi trú ẩm và râm mát như đống gỗ, và chừa lại một phần lá rụng.",
        "protect": "Tránh thuốc diệt sên và thuốc trừ sâu, và giữ dòng nước sạch cho các loài nước ngọt.",
        "habitat": "ở nơi ẩm ướt, râm mát và trong nước ngọt sạch",
    },
    "plant": {
        "give": "Để cây bản địa mọc tự nhiên, cắt cỏ thưa hơn và muộn hơn trong năm, và giữ lại phần đầu hạt đứng qua mùa đông.",
        "protect": "Đừng hái hay đào cây hoang dã, đi đúng lối mòn ở khu vực nhạy cảm, và đừng bao giờ đưa cây ngoại lai vào.",
        "habitat": "ở đồng cỏ, rừng và ven đường nơi nó mọc",
    },
    "fungus": {
        "give": "Chừa lại gỗ mục và lá rụng nơi nấm mọc, và bước nhẹ khi đi trong rừng.",
        "protect": "Chỉ lấy phần quy định địa phương cho phép, đừng giẫm lên thể quả, và đừng bao giờ dựa vào một ứng dụng để phán đoán nấm có ăn được hay không.",
        "habitat": "trên nền rừng, gỗ mục và lá rụng",
    },
}
VI_MONTHS = ("tháng Một", "tháng Hai", "tháng Ba", "tháng Tư", "tháng Năm", "tháng Sáu",
             "tháng Bảy", "tháng Tám", "tháng Chín", "tháng Mười", "tháng Mười Một", "tháng Mười Hai")


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
    "ru": LocaleStrings(
        months=RU_MONTHS_IN,
        months_from=RU_MONTHS_FROM,
        months_to=RU_MONTHS_TO,
        year_round="круглый год",
        range_pattern="с {first} по {last}",
        list_pattern="в {months}",
        list_separator=", ",
        unknown="в разное время года",
        sentence="Активен в вашем регионе {when}. Ищите его {hint}.",
        templates=RU_TEMPLATES,
    ),
    "uk": LocaleStrings(
        months=UK_MONTHS_IN,
        months_from=UK_MONTHS_GEN,
        months_to=UK_MONTHS_GEN,  # both slots take the genitive after з/до
        year_round="цілий рік",
        range_pattern="з {first} до {last}",
        list_pattern="у {months}",
        list_separator=", ",
        unknown="у різні пори року",
        sentence="Активний у вашому регіоні {when}. Шукайте його {hint}.",
        templates=UK_TEMPLATES,
    ),
    "fa": LocaleStrings(
        months=FA_MONTHS,
        months_from=FA_MONTHS,
        months_to=FA_MONTHS,
        year_round="در تمام طول سال",
        range_pattern="از {first} تا {last}",
        list_pattern="در {months}",
        list_separator="، ",
        unknown="در زمان‌های گوناگون سال",
        sentence="در منطقهٔ شما {when} فعال است. آن را {hint} بجویید.",
        templates=FA_TEMPLATES,
    ),
    "tr": LocaleStrings(
        months=TR_MONTHS_LOC,
        months_from=TR_MONTHS_ABL,
        months_to=TR_MONTHS_DAT,
        year_round="yıl boyunca",
        range_pattern="{first} {last}",
        list_pattern="{months}",
        list_separator=", ",
        unknown="yılın farklı zamanlarında",
        sentence="Bölgenizde {when} etkindir. Onu {hint} arayın.",
        templates=TR_TEMPLATES,
    ),
    "bs": LocaleStrings(
        months=BS_MONTHS,  # locative, after "u"
        months_from=BS_MONTHS_GEN,
        months_to=BS_MONTHS_GEN,  # both slots take the genitive after od/do
        year_round="tokom cijele godine",
        range_pattern="od {first} do {last}",
        list_pattern="u {months}",
        list_separator=", ",
        unknown="u različito doba godine",
        sentence="Aktivan je u vašoj regiji {when}. Tražite ga {hint}.",
        templates=BS_TEMPLATES,
    ),
    "sq": LocaleStrings(
        months=SQ_MONTHS,
        months_from=SQ_MONTHS,
        months_to=SQ_MONTHS,
        year_round="gjatë gjithë vitit",
        range_pattern="nga {first} deri në {last}",
        list_pattern="në {months}",
        list_separator=", ",
        unknown="në kohë të ndryshme të vitit",
        sentence="Është aktiv në rajonin tuaj {when}. Kërkojeni {hint}.",
        templates=SQ_TEMPLATES,
    ),
    "vi": LocaleStrings(
        months=VI_MONTHS,
        months_from=VI_MONTHS,
        months_to=VI_MONTHS,
        year_round="quanh năm",
        range_pattern="từ {first} đến {last}",
        list_pattern="vào {months}",
        list_separator=", ",
        unknown="vào những thời điểm khác nhau trong năm",
        sentence="Hoạt động ở khu vực của bạn {when}. Hãy tìm nó {hint}.",
        templates=VI_TEMPLATES,
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
