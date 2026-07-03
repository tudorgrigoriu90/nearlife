import type { Month, Species } from './types';

// Hand-curated seed list for the Kronoberg (Sweden) validation prototype (T-019).
// ~50 real species plausibly present in the region, each tagged with category, rarity
// (observation-frequency flavour), and the months it's plausibly active/notable.
// Card content is authored separately (T-020). This list is throwaway-tolerant: the real
// data layer (E3) replaces it with GBIF-derived probabilities.

const ALL_YEAR: Month[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const KRONOBERG_SPECIES: Species[] = [
  // ── Birds ────────────────────────────────────────────────────────────────
  { id: 'common-swift', scientificName: 'Apus apus', commonName: 'Common Swift', category: 'bird', rarity: 'common', activeMonths: [5, 6, 7, 8] },
  { id: 'barn-swallow', scientificName: 'Hirundo rustica', commonName: 'Barn Swallow', category: 'bird', rarity: 'common', activeMonths: [4, 5, 6, 7, 8, 9] },
  { id: 'common-cuckoo', scientificName: 'Cuculus canorus', commonName: 'Common Cuckoo', category: 'bird', rarity: 'uncommon', activeMonths: [5, 6, 7] },
  { id: 'european-robin', scientificName: 'Erithacus rubecula', commonName: 'European Robin', category: 'bird', rarity: 'common', activeMonths: [3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'common-blackbird', scientificName: 'Turdus merula', commonName: 'Common Blackbird', category: 'bird', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'fieldfare', scientificName: 'Turdus pilaris', commonName: 'Fieldfare', category: 'bird', rarity: 'common', activeMonths: [1, 2, 3, 10, 11, 12] },
  { id: 'great-tit', scientificName: 'Parus major', commonName: 'Great Tit', category: 'bird', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'blue-tit', scientificName: 'Cyanistes caeruleus', commonName: 'Eurasian Blue Tit', category: 'bird', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'common-chaffinch', scientificName: 'Fringilla coelebs', commonName: 'Common Chaffinch', category: 'bird', rarity: 'common', activeMonths: [3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'eurasian-jay', scientificName: 'Garrulus glandarius', commonName: 'Eurasian Jay', category: 'bird', rarity: 'uncommon', activeMonths: ALL_YEAR },
  { id: 'great-spotted-woodpecker', scientificName: 'Dendrocopos major', commonName: 'Great Spotted Woodpecker', category: 'bird', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'white-wagtail', scientificName: 'Motacilla alba', commonName: 'White Wagtail', category: 'bird', rarity: 'common', activeMonths: [4, 5, 6, 7, 8, 9] },
  { id: 'common-crane', scientificName: 'Grus grus', commonName: 'Common Crane', category: 'bird', rarity: 'uncommon', activeMonths: [4, 5, 6, 7, 8, 9] },
  { id: 'whooper-swan', scientificName: 'Cygnus cygnus', commonName: 'Whooper Swan', category: 'bird', rarity: 'uncommon', activeMonths: [3, 4, 10, 11] },
  { id: 'mallard', scientificName: 'Anas platyrhynchos', commonName: 'Mallard', category: 'bird', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'common-buzzard', scientificName: 'Buteo buteo', commonName: 'Common Buzzard', category: 'bird', rarity: 'uncommon', activeMonths: [3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'osprey', scientificName: 'Pandion haliaetus', commonName: 'Osprey', category: 'bird', rarity: 'rare', activeMonths: [4, 5, 6, 7, 8, 9] },

  // ── Mammals ──────────────────────────────────────────────────────────────
  { id: 'red-fox', scientificName: 'Vulpes vulpes', commonName: 'Red Fox', category: 'mammal', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'european-hedgehog', scientificName: 'Erinaceus europaeus', commonName: 'European Hedgehog', category: 'mammal', rarity: 'common', activeMonths: [4, 5, 6, 7, 8, 9, 10] },
  { id: 'roe-deer', scientificName: 'Capreolus capreolus', commonName: 'Roe Deer', category: 'mammal', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'moose', scientificName: 'Alces alces', commonName: 'Moose', category: 'mammal', rarity: 'uncommon', activeMonths: ALL_YEAR },
  { id: 'red-squirrel', scientificName: 'Sciurus vulgaris', commonName: 'Eurasian Red Squirrel', category: 'mammal', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'european-beaver', scientificName: 'Castor fiber', commonName: 'European Beaver', category: 'mammal', rarity: 'uncommon', activeMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'mountain-hare', scientificName: 'Lepus timidus', commonName: 'Mountain Hare', category: 'mammal', rarity: 'uncommon', activeMonths: ALL_YEAR },
  { id: 'european-badger', scientificName: 'Meles meles', commonName: 'European Badger', category: 'mammal', rarity: 'uncommon', activeMonths: [3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'common-pipistrelle', scientificName: 'Pipistrellus pipistrellus', commonName: 'Common Pipistrelle', category: 'mammal', rarity: 'uncommon', activeMonths: [5, 6, 7, 8, 9] },

  // ── Insects ──────────────────────────────────────────────────────────────
  { id: 'small-tortoiseshell', scientificName: 'Aglais urticae', commonName: 'Small Tortoiseshell', category: 'insect', rarity: 'common', activeMonths: [3, 4, 5, 6, 7, 8, 9] },
  { id: 'european-peacock', scientificName: 'Aglais io', commonName: 'European Peacock', category: 'insect', rarity: 'common', activeMonths: [3, 4, 5, 6, 7, 8, 9] },
  { id: 'brimstone-butterfly', scientificName: 'Gonepteryx rhamni', commonName: 'Common Brimstone', category: 'insect', rarity: 'common', activeMonths: [3, 4, 5, 6, 7, 8] },
  { id: 'orange-tip', scientificName: 'Anthocharis cardamines', commonName: 'Orange Tip', category: 'insect', rarity: 'common', activeMonths: [4, 5, 6] },
  { id: 'common-blue', scientificName: 'Polyommatus icarus', commonName: 'Common Blue', category: 'insect', rarity: 'common', activeMonths: [5, 6, 7, 8] },
  { id: 'green-veined-white', scientificName: 'Pieris napi', commonName: 'Green-veined White', category: 'insect', rarity: 'common', activeMonths: [4, 5, 6, 7, 8] },
  { id: 'seven-spot-ladybird', scientificName: 'Coccinella septempunctata', commonName: 'Seven-spot Ladybird', category: 'insect', rarity: 'common', activeMonths: [4, 5, 6, 7, 8, 9] },
  { id: 'buff-tailed-bumblebee', scientificName: 'Bombus terrestris', commonName: 'Buff-tailed Bumblebee', category: 'insect', rarity: 'common', activeMonths: [3, 4, 5, 6, 7, 8, 9] },
  { id: 'western-honey-bee', scientificName: 'Apis mellifera', commonName: 'Western Honey Bee', category: 'insect', rarity: 'common', activeMonths: [3, 4, 5, 6, 7, 8, 9] },
  { id: 'emperor-dragonfly', scientificName: 'Anax imperator', commonName: 'Emperor Dragonfly', category: 'insect', rarity: 'uncommon', activeMonths: [6, 7, 8] },
  { id: 'common-darter', scientificName: 'Sympetrum striolatum', commonName: 'Common Darter', category: 'insect', rarity: 'common', activeMonths: [6, 7, 8, 9, 10] },
  { id: 'red-wood-ant', scientificName: 'Formica rufa', commonName: 'Red Wood Ant', category: 'insect', rarity: 'common', activeMonths: [4, 5, 6, 7, 8, 9] },

  // ── Plants ───────────────────────────────────────────────────────────────
  { id: 'wood-anemone', scientificName: 'Anemone nemorosa', commonName: 'Wood Anemone', category: 'plant', rarity: 'common', activeMonths: [4, 5] },
  { id: 'lily-of-the-valley', scientificName: 'Convallaria majalis', commonName: 'Lily of the Valley', category: 'plant', rarity: 'common', activeMonths: [5, 6] },
  { id: 'ramsons', scientificName: 'Allium ursinum', commonName: 'Ramsons', category: 'plant', rarity: 'uncommon', activeMonths: [4, 5, 6] },
  { id: 'marsh-marigold', scientificName: 'Caltha palustris', commonName: 'Marsh Marigold', category: 'plant', rarity: 'common', activeMonths: [4, 5, 6] },
  { id: 'cowslip', scientificName: 'Primula veris', commonName: 'Cowslip', category: 'plant', rarity: 'uncommon', activeMonths: [4, 5, 6] },
  { id: 'oxeye-daisy', scientificName: 'Leucanthemum vulgare', commonName: 'Oxeye Daisy', category: 'plant', rarity: 'common', activeMonths: [6, 7, 8] },
  { id: 'common-dandelion', scientificName: 'Taraxacum officinale', commonName: 'Common Dandelion', category: 'plant', rarity: 'common', activeMonths: [4, 5, 6, 7, 8, 9] },
  { id: 'heather', scientificName: 'Calluna vulgaris', commonName: 'Heather', category: 'plant', rarity: 'common', activeMonths: [7, 8, 9] },
  { id: 'bilberry', scientificName: 'Vaccinium myrtillus', commonName: 'Bilberry', category: 'plant', rarity: 'common', activeMonths: [5, 6, 7, 8] },
  { id: 'lingonberry', scientificName: 'Vaccinium vitis-idaea', commonName: 'Lingonberry', category: 'plant', rarity: 'common', activeMonths: [6, 7, 8, 9] },
  { id: 'silver-birch', scientificName: 'Betula pendula', commonName: 'Silver Birch', category: 'plant', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'norway-spruce', scientificName: 'Picea abies', commonName: 'Norway Spruce', category: 'plant', rarity: 'common', activeMonths: ALL_YEAR },
  { id: 'scots-pine', scientificName: 'Pinus sylvestris', commonName: 'Scots Pine', category: 'plant', rarity: 'common', activeMonths: ALL_YEAR },

  // ── Fish ─────────────────────────────────────────────────────────────────
  { id: 'northern-pike', scientificName: 'Esox lucius', commonName: 'Northern Pike', category: 'fish', rarity: 'common', activeMonths: [4, 5, 6, 7, 8, 9, 10] },
  { id: 'european-perch', scientificName: 'Perca fluviatilis', commonName: 'European Perch', category: 'fish', rarity: 'common', activeMonths: [5, 6, 7, 8, 9] },
  { id: 'roach', scientificName: 'Rutilus rutilus', commonName: 'Common Roach', category: 'fish', rarity: 'common', activeMonths: [5, 6, 7, 8, 9] },
];
