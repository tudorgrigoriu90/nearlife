import { KRONOBERG_SPECIES } from './kronoberg';

// Card content for the Kronoberg prototype (T-020): the always-free Tier-1 layer —
// fact, "when & how to see it" trivia, and give/protect mission actions.
//
// Content rules (GDD §3, §5; ECONOMY):
//  - Honesty: describe the season/behaviour, never claim real-time presence ("here right now").
//  - Mission is always free and light: one useful give + one useful protect per species.
//  - Give/protect default to universally SAFE actions (water, nest boxes, leaving things be,
//    avoiding disturbance). We never tell people to plant or release a specific species
//    (invasive risk) — that stays generic. Every help card also shows FOLLOW_LOCAL_LAW.

/** Standing line shown on every help card — local rules decide, the app only informs (GDD §5). */
export const FOLLOW_LOCAL_LAW =
  'Always follow local rules — access rights, protected species, and feeding differ by place.';

export interface SpeciesContent {
  /** Matches Species.id in kronoberg.ts. */
  speciesId: string;
  /** Tier-1 fact (always free). */
  fact: string;
  /** "When & how to see it" trivia (always free) — seasonal/behavioural, never "right now". */
  whenAndHow: string;
  /** GIVE action — a universally safe way to help it thrive (always free). */
  give: string;
  /** PROTECT action — a universally safe restraint that avoids harm (always free). */
  protect: string;
}

export const KRONOBERG_CONTENT: Record<string, SpeciesContent> = {
  // ── Birds ────────────────────────────────────────────────────────────────
  'common-swift': {
    speciesId: 'common-swift',
    fact: 'Swifts can stay airborne for months at a time, even sleeping on the wing.',
    whenAndHow: 'On warm summer evenings, watch high over rooftops and listen for screaming parties.',
    give: 'Put up a swift box under your eaves before the birds return in spring.',
    protect: 'When renovating, keep the small gaps under eaves where swifts nest.',
  },
  'barn-swallow': {
    speciesId: 'barn-swallow',
    fact: 'Barn swallows migrate all the way to southern Africa and back each year.',
    whenAndHow: 'From spring to early autumn, look for them skimming low over open fields and water.',
    give: 'Leave a barn or shed door ajar so they can reach their nest ledges.',
    protect: 'Avoid knocking down old mud nests — swallows reuse them year after year.',
  },
  'common-cuckoo': {
    speciesId: 'common-cuckoo',
    fact: 'Cuckoos lay their eggs in other birds’ nests and never raise their own young.',
    whenAndHow: 'In late spring, listen for the far-carrying "cuck-oo" call from woodland edges.',
    give: 'Support insect-rich meadows and hedgerows that feed the birds cuckoos rely on.',
    protect: 'Keep to paths near scrub and reedbeds so host birds are not disturbed.',
  },
  'european-robin': {
    speciesId: 'european-robin',
    fact: 'Robins are fiercely territorial and will sing through the night near streetlights.',
    whenAndHow: 'Year-round in gardens and woodland; they often follow diggers hoping for worms.',
    give: 'Leave a corner of the garden with leaf litter where robins can forage.',
    protect: 'Delay heavy hedge-cutting until nesting is over in late summer.',
  },
  'common-blackbird': {
    speciesId: 'common-blackbird',
    fact: 'The male’s rich, fluting song is one of the most recognisable in Europe.',
    whenAndHow: 'Year-round; listen for males singing from rooftops and treetops at dawn and dusk.',
    give: 'Put out fresh water for drinking and bathing, especially in dry spells.',
    protect: 'Keep cats indoors at dawn during the nesting season.',
  },
  fieldfare: {
    speciesId: 'fieldfare',
    fact: 'Fieldfares are social thrushes that roam in noisy, chattering winter flocks.',
    whenAndHow: 'In autumn and winter, watch flocks stripping berries from hedges and rowan trees.',
    give: 'Leave berry-bearing shrubs like rowan and hawthorn unpruned over winter.',
    protect: 'Let windfall apples lie in winter — they are vital cold-weather food.',
  },
  'great-tit': {
    speciesId: 'great-tit',
    fact: 'Great tits have a huge vocabulary and learn new calls from their neighbours.',
    whenAndHow: 'Year-round; listen for the ringing "teacher-teacher" song from late winter.',
    give: 'Hang a nest box with a 32 mm hole in a quiet, shaded spot.',
    protect: 'Avoid garden pesticides so there are enough caterpillars to feed the chicks.',
  },
  'blue-tit': {
    speciesId: 'blue-tit',
    fact: 'A single brood of blue tits can eat over a thousand caterpillars.',
    whenAndHow: 'Year-round in gardens and woods, often hanging upside-down on thin twigs.',
    give: 'Put up a small nest box with a 25 mm hole away from prevailing wind.',
    protect: 'Skip insecticides in spring so caterpillars are available for the chicks.',
  },
  'common-chaffinch': {
    speciesId: 'common-chaffinch',
    fact: 'Chaffinch songs vary by region, almost like local dialects.',
    whenAndHow: 'Spring to autumn; males sing a bright, descending phrase from open perches.',
    give: 'Leave some seed heads and weedy patches standing over the season.',
    protect: 'Keep feeders clean to prevent disease spreading among finches.',
  },
  'eurasian-jay': {
    speciesId: 'eurasian-jay',
    fact: 'Jays bury thousands of acorns each autumn and plant whole oak woods by forgetting some.',
    whenAndHow: 'Year-round in oak woodland; watch for flashes of pink and blue in autumn.',
    give: 'Leave fallen acorns and leaf litter under oaks undisturbed.',
    protect: 'Keep dogs on paths in woodland so ground-feeding birds are not flushed.',
  },
  'great-spotted-woodpecker': {
    speciesId: 'great-spotted-woodpecker',
    fact: 'Its spring "drumming" is not feeding but a fast tattoo to claim territory.',
    whenAndHow: 'Year-round; in late winter listen for drumming echoing through the woods.',
    give: 'Leave standing dead wood, which holds the insects woodpeckers feed on.',
    protect: 'Do not fell dead or dying trees that may hold nest holes.',
  },
  'white-wagtail': {
    speciesId: 'white-wagtail',
    fact: 'The wagtail’s constant tail-bobbing may signal alertness to predators.',
    whenAndHow: 'Spring to autumn near water and open ground, running and pausing to snatch insects.',
    give: 'Keep a patch of short grass or gravel near water where they can forage.',
    protect: 'Avoid disturbing shingle and shoreline where wagtails feed and nest.',
  },
  'common-crane': {
    speciesId: 'common-crane',
    fact: 'Cranes perform leaping, bowing courtship dances in early spring.',
    whenAndHow: 'From spring to autumn around wetlands; listen for bugling calls carrying for miles.',
    give: 'Support the protection of undrained bogs and wet meadows where cranes breed.',
    protect: 'Watch nesting wetlands from a distance — cranes abandon disturbed nests.',
  },
  'whooper-swan': {
    speciesId: 'whooper-swan',
    fact: 'Whooper swans mate for life and announce arrivals with loud, trumpeting calls.',
    whenAndHow: 'In spring and autumn on lakes and flooded fields, often in family groups.',
    give: 'Support keeping shallow lake margins and wet fields free of drainage.',
    protect: 'Never feed bread to swans — it harms them; keep your distance on the ice.',
  },
  mallard: {
    speciesId: 'mallard',
    fact: 'Ducklings can swim and feed themselves within hours of hatching.',
    whenAndHow: 'Year-round on almost any pond, lake, or slow river.',
    give: 'If you feed ducks, use oats, peas, or seeds rather than bread.',
    protect: 'Keep dogs out of the water where ducks are nesting in spring.',
  },
  'common-buzzard': {
    speciesId: 'common-buzzard',
    fact: 'Buzzards soar on broad wings and often call with a cat-like "peee-yow".',
    whenAndHow: 'Spring to autumn; scan for them circling high over fields and forest edges.',
    give: 'Support rough grassland and field margins that hold voles and small prey.',
    protect: 'Never use rodent poisons, which move up the food chain into birds of prey.',
  },
  osprey: {
    speciesId: 'osprey',
    fact: 'Ospreys plunge feet-first to catch fish and can carry prey half their own weight.',
    whenAndHow: 'Spring to autumn near large lakes; watch for hovering then a dramatic dive.',
    give: 'Support artificial nest platforms on tall poles near fish-rich lakes.',
    protect: 'Give nesting platforms a wide berth so pairs are not scared off their eggs.',
  },

  // ── Mammals ──────────────────────────────────────────────────────────────
  'red-fox': {
    speciesId: 'red-fox',
    fact: 'Foxes use the Earth’s magnetic field to help judge pounces on hidden prey.',
    whenAndHow: 'Year-round, most active at dawn and dusk along woodland and field edges.',
    give: 'Leave a wild, undisturbed corner where foxes can rest and den.',
    protect: 'Secure bins and never leave harmful food scraps out for foxes.',
  },
  'european-hedgehog': {
    speciesId: 'european-hedgehog',
    fact: 'A hedgehog can travel a couple of kilometres in a single night’s foraging.',
    whenAndHow: 'From spring to autumn after dark; in winter they hibernate under leaf and log piles.',
    give: 'Cut a 13 cm gap in fences so hedgehogs can roam between gardens.',
    protect: 'Check long grass before strimming and leave leaf piles for hibernation.',
  },
  'roe-deer': {
    speciesId: 'roe-deer',
    fact: 'Roe deer delay their pregnancy so fawns are always born in early summer.',
    whenAndHow: 'Year-round at woodland edges, most visible grazing at dawn and dusk.',
    give: 'Support unmown field margins and scrub that give deer cover and food.',
    protect: 'Keep dogs leashed near woodland in early summer when fawns lie hidden.',
  },
  moose: {
    speciesId: 'moose',
    fact: 'The moose is the largest deer on Earth; a big bull can weigh over half a tonne.',
    whenAndHow: 'Year-round in forests and wetlands, most active at dawn and dusk.',
    give: 'Support connected forests and wetland corridors that moose need to roam.',
    protect: 'Drive carefully at dawn and dusk on forest roads and never approach a calf.',
  },
  'red-squirrel': {
    speciesId: 'red-squirrel',
    fact: 'Red squirrels build several nests, called dreys, and move between them.',
    whenAndHow: 'Year-round in conifer and mixed woods, busiest in the early morning.',
    give: 'Leave cones, nuts, and standing trees that squirrels feed and nest in.',
    protect: 'Keep dogs on paths and avoid disturbing trees that may hold a drey.',
  },
  'european-beaver': {
    speciesId: 'european-beaver',
    fact: 'Beaver dams create wetlands that boost fish, birds, and insects for miles.',
    whenAndHow: 'From spring to late autumn around slow rivers, most active at dusk.',
    give: 'Support leaving beaver dams and waterside trees in place where safe.',
    protect: 'Keep back from lodges and dams, especially when kits are young.',
  },
  'mountain-hare': {
    speciesId: 'mountain-hare',
    fact: 'Mountain hares turn white in winter for camouflage against the snow.',
    whenAndHow: 'Year-round on open ground and forest clearings, mainly at dawn and dusk.',
    give: 'Support a mix of open ground and cover that hares need through the year.',
    protect: 'Keep dogs leashed on open ground so resting hares are not chased.',
  },
  'european-badger': {
    speciesId: 'european-badger',
    fact: 'Badgers live in family groups in underground setts used for generations.',
    whenAndHow: 'From spring to autumn after dark near woodland; they sleep away the winter.',
    give: 'Leave undisturbed banks and hedgerows where badgers can dig setts.',
    protect: 'Never block or dig near an active sett — it is their long-term home.',
  },
  'common-pipistrelle': {
    speciesId: 'common-pipistrelle',
    fact: 'This tiny bat can eat up to 3,000 midges and mosquitoes in one night.',
    whenAndHow: 'On summer evenings, watch for fast, jinking flight around dusk over gardens.',
    give: 'Put up a bat box high on a wall or tree that catches the evening sun.',
    protect: 'Avoid bright lights on roost entrances and keep the night sky dark for bats.',
  },

  // ── Insects ──────────────────────────────────────────────────────────────
  'small-tortoiseshell': {
    speciesId: 'small-tortoiseshell',
    fact: 'This butterfly hibernates as an adult, often in sheds and lofts.',
    whenAndHow: 'From early spring to autumn on sunny flowers, especially nettles and buddleia.',
    give: 'Leave a patch of nettles in a sunny corner — its caterpillars need them.',
    protect: 'Leave hibernating butterflies undisturbed in sheds over winter.',
  },
  'european-peacock': {
    speciesId: 'european-peacock',
    fact: 'Its eyespots flash to startle birds, and its wings can hiss when opened.',
    whenAndHow: 'Spring to autumn on sunny days, feeding on thistles, buddleia, and windfall fruit.',
    give: 'Let a sunny nettle patch grow for its caterpillars.',
    protect: 'Do not disturb adults sheltering in sheds and log piles over winter.',
  },
  'brimstone-butterfly': {
    speciesId: 'brimstone-butterfly',
    fact: 'The word "butterfly" may come from the male brimstone’s butter-yellow colour.',
    whenAndHow: 'One of the first butterflies of spring; look along woodland edges on warm days.',
    give: 'Support buckthorn shrubs in hedges, the only plants its caterpillars eat.',
    protect: 'Avoid clearing scrubby hedgerows that shelter overwintering adults.',
  },
  'orange-tip': {
    speciesId: 'orange-tip',
    fact: 'Only the males have the bright orange wingtips; females are white.',
    whenAndHow: 'In spring along damp meadows and lanes where cuckoo flower grows.',
    give: 'Let cuckoo flower and garlic mustard grow in damp, unmown corners.',
    protect: 'Delay cutting verges until its caterpillars have finished feeding.',
  },
  'common-blue': {
    speciesId: 'common-blue',
    fact: 'The common blue’s caterpillars are sometimes tended by ants for their sweet secretions.',
    whenAndHow: 'From late spring on sunny grassland rich in clover and bird’s-foot trefoil.',
    give: 'Leave grassland unmown so trefoils and clovers can flower.',
    protect: 'Avoid spraying wildflower-rich grassland with weedkiller.',
  },
  'green-veined-white': {
    speciesId: 'green-veined-white',
    fact: 'Despite looking like a cabbage white, it prefers wild plants, not garden crops.',
    whenAndHow: 'Spring to late summer in damp meadows, ditches, and woodland rides.',
    give: 'Let damp corners grow wild with native crucifers like cuckoo flower.',
    protect: 'Avoid draining and spraying damp meadows where it breeds.',
  },
  'seven-spot-ladybird': {
    speciesId: 'seven-spot-ladybird',
    fact: 'A single ladybird can eat thousands of aphids in its lifetime.',
    whenAndHow: 'From spring to autumn on plants with aphids; they cluster to hibernate in winter.',
    give: 'Tolerate some aphids and skip sprays so ladybirds have food.',
    protect: 'Leave hollow stems and leaf litter where ladybirds shelter over winter.',
  },
  'buff-tailed-bumblebee': {
    speciesId: 'buff-tailed-bumblebee',
    fact: 'Queens are among the first bees out in spring, buzzing low to find nest holes.',
    whenAndHow: 'From early spring to autumn on flowers; queens search hedge bottoms in spring.',
    give: 'Grow or leave early-flowering plants and let clover bloom in the lawn.',
    protect: 'Leave undisturbed banks and old mouse holes where colonies nest.',
  },
  'western-honey-bee': {
    speciesId: 'western-honey-bee',
    fact: 'Foragers tell the hive where flowers are by dancing in a figure-of-eight.',
    whenAndHow: 'From spring to autumn on flowers on warm, still days.',
    give: 'Let a range of flowers bloom across the seasons and leave a shallow water dish.',
    protect: 'Avoid spraying flowering plants, and never spray in the middle of the day.',
  },
  'emperor-dragonfly': {
    speciesId: 'emperor-dragonfly',
    fact: 'One of Europe’s largest dragonflies, it can even catch prey in mid-air.',
    whenAndHow: 'On warm summer days, watch it patrolling ponds and lake margins.',
    give: 'Keep or dig a pond with plants and leave its edges vegetated.',
    protect: 'Keep ponds free of pollution and run-off so larvae can develop.',
  },
  'common-darter': {
    speciesId: 'common-darter',
    fact: 'Darters often perch on the same warm spot, darting out to grab passing insects.',
    whenAndHow: 'From midsummer to autumn near still water, basking on paths and posts.',
    give: 'Leave sunny perches and vegetation around ponds and ditches.',
    protect: 'Avoid letting fertiliser or oil wash into ponds where larvae live.',
  },
  'red-wood-ant': {
    speciesId: 'red-wood-ant',
    fact: 'Their thatched nest mounds can be over a metre tall and house half a million ants.',
    whenAndHow: 'From spring to autumn in conifer woods; look for domed mounds of needles.',
    give: 'Leave nest mounds undisturbed — they take years to build.',
    protect: 'Keep to paths and never kick or dig into an ant mound.',
  },

  // ── Plants ───────────────────────────────────────────────────────────────
  'wood-anemone': {
    speciesId: 'wood-anemone',
    fact: 'Wood anemones spread so slowly that dense carpets signal ancient woodland.',
    whenAndHow: 'In spring, look for carpets of white flowers before the trees leaf out.',
    give: 'Leave woodland floors undisturbed so the slow-spreading roots can thrive.',
    protect: 'Enjoy them where they grow — picking removes flowers that took years to spread.',
  },
  'lily-of-the-valley': {
    speciesId: 'lily-of-the-valley',
    fact: 'Every part of this sweetly scented plant is poisonous if eaten.',
    whenAndHow: 'In late spring, follow the scent to shady woodland and shaded gardens.',
    give: 'Leave shaded woodland edges and leaf litter where it grows.',
    protect: 'Do not pick or dig it up, and keep it away from children and pets.',
  },
  ramsons: {
    speciesId: 'ramsons',
    fact: 'You often smell ramsons — wild garlic — before you see the white flowers.',
    whenAndHow: 'In spring, look for broad green leaves and starry flowers in damp woods.',
    give: 'Leave damp woodland undisturbed so the carpets can regrow each year.',
    protect: 'If foraging is allowed locally, take only a little and never uproot bulbs.',
  },
  'marsh-marigold': {
    speciesId: 'marsh-marigold',
    fact: 'One of the oldest native plants, it survived the last Ice Age in Scandinavia.',
    whenAndHow: 'In spring, look for big golden flowers in marshes, ditches, and pond edges.',
    give: 'Keep pond and ditch margins wet and unmown so it can flower.',
    protect: 'Avoid draining wet ground and leave the plants where they grow.',
  },
  cowslip: {
    speciesId: 'cowslip',
    fact: 'Cowslips were once so common in hay meadows that children made them into balls.',
    whenAndHow: 'In spring, look for nodding yellow flowers in old, unimproved meadows.',
    give: 'Leave meadows unmown until the cowslips have flowered and set seed.',
    protect: 'Do not pick or dig them from the wild — meadow flowers are declining.',
  },
  'oxeye-daisy': {
    speciesId: 'oxeye-daisy',
    fact: 'The oxeye daisy’s flower is actually dozens of tiny flowers packed together.',
    whenAndHow: 'In summer, look for large white daisies along roadsides and meadows.',
    give: 'Leave a strip of grass unmown through midsummer so it can flower.',
    protect: 'Avoid spraying verges and meadows with weedkiller.',
  },
  'common-dandelion': {
    speciesId: 'common-dandelion',
    fact: 'Dandelions are one of the most important early nectar sources for bees.',
    whenAndHow: 'From spring onwards almost anywhere; flowers open in sun and close at dusk.',
    give: 'Let dandelions flower on the lawn in spring before the first mow.',
    protect: 'Skip lawn weedkillers so early pollinators keep this vital food.',
  },
  heather: {
    speciesId: 'heather',
    fact: 'A single heather plant can produce over a hundred thousand tiny seeds.',
    whenAndHow: 'In late summer, look for purple carpets on open heaths and bogs.',
    give: 'Support keeping heathland open and free of drainage.',
    protect: 'Keep to paths on heaths and never light fires in dry conditions.',
  },
  bilberry: {
    speciesId: 'bilberry',
    fact: 'Bilberries stain your fingers blue and feed everything from birds to bears.',
    whenAndHow: 'In summer, look for low bushes with dark berries in pine and spruce forest.',
    give: 'Leave forest undergrowth intact so the low bushes can fruit.',
    protect: 'If picking is allowed locally, leave plenty of berries for wildlife.',
  },
  lingonberry: {
    speciesId: 'lingonberry',
    fact: 'Lingonberries keep for months thanks to a natural preservative in the fruit.',
    whenAndHow: 'In late summer and autumn, look for glossy red berries on evergreen mats.',
    give: 'Leave forest floor vegetation undisturbed so the mats can spread.',
    protect: 'If picking is allowed locally, tread carefully to avoid crushing the plants.',
  },
  'silver-birch': {
    speciesId: 'silver-birch',
    fact: 'A birch supports hundreds of insect species, feeding countless birds.',
    whenAndHow: 'Year-round; the white, peeling bark makes it easy to spot in any season.',
    give: 'Leave fallen birch leaves and dead wood to enrich the soil and feed insects.',
    protect: 'Avoid stripping bark, which can wound and weaken the tree.',
  },
  'norway-spruce': {
    speciesId: 'norway-spruce',
    fact: 'A Norway spruce in Sweden grows from roots that are thousands of years old.',
    whenAndHow: 'Year-round in forests; its drooping cones are the longest of any spruce.',
    give: 'Leave fallen cones and dead wood, which shelter insects and fungi.',
    protect: 'Keep to trails in forests to avoid compacting shallow spruce roots.',
  },
  'scots-pine': {
    speciesId: 'scots-pine',
    fact: 'Old Scots pines glow orange near the top and can live for centuries.',
    whenAndHow: 'Year-round on sandy and rocky ground; look for the orange upper bark.',
    give: 'Leave standing deadwood and old pines, which are rich in wildlife.',
    protect: 'Never light fires against or near pines on dry, sandy ground.',
  },

  // ── Fish ─────────────────────────────────────────────────────────────────
  'northern-pike': {
    speciesId: 'northern-pike',
    fact: 'The pike is an ambush predator that can lunge from stillness in a blink.',
    whenAndHow: 'From spring to autumn in weedy shallows of lakes and slow rivers.',
    give: 'Support keeping reedy shallows and water plants where young fish shelter.',
    protect: 'Keep pollution and litter out of the water; follow local fishing rules.',
  },
  'european-perch': {
    speciesId: 'european-perch',
    fact: 'Perch hunt in packs and wear bold stripes that break up their outline.',
    whenAndHow: 'In the warmer months around jetties, weed beds, and drop-offs.',
    give: 'Support clean water and submerged structure that shelters small fish.',
    protect: 'Never tip anything into lakes and rivers; follow local fishing rules.',
  },
  roach: {
    speciesId: 'roach',
    fact: 'Roach are a key food fish that many lake predators depend on.',
    whenAndHow: 'In the warmer months in shoals near the surface of lakes and slow rivers.',
    give: 'Support keeping water clean and margins vegetated for spawning.',
    protect: 'Keep run-off and litter out of the water; follow local fishing rules.',
  },
};

/** All species that have authored content — used by tests and (later) the app. */
export const CONTENT_SPECIES_IDS = Object.keys(KRONOBERG_CONTENT);

// Sanity: the module is only meaningful alongside the species list.
export const HAS_FULL_COVERAGE = KRONOBERG_SPECIES.every(
  (s) => KRONOBERG_CONTENT[s.id] !== undefined,
);
