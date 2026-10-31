import { KRONOBERG_CONTENT } from './content';
import { SV_CONTENT } from './content.sv';

// T-054: "give" advice must never encourage growing, planting or releasing a species that is
// invasive in Sweden. Naming a plant to *leave* or *support* is fine when it is native (rowan,
// nettle, buckthorn), so this guards by name against the invasive list, in English and Swedish:
// the EU list of concern plus Sweden's national list (Naturvårdsverket / Havs- och vattenmyndigheten).
// Protect advice may name them (e.g. "remove garden lupins near meadows"), so only `give` is checked.

const INVASIVE = [...new Set([
  // English
  'lupin', 'himalayan balsam', 'giant hogweed', 'japanese knotweed', 'rosa rugosa', 'rugosa rose',
  'canadian goldenrod', 'goldenrod', 'canadian waterweed', 'elodea', 'fringed water lily', 'sakhalin knotweed',
  'giant rhubarb', 'skunk cabbage', 'signal crayfish', 'raccoon', 'mink', 'canada goose', 'ruddy duck',
  'spanish slug', 'red-eared slider', 'grey squirrel', 'gray squirrel',
  // Swedish
  'lupin', 'blomsterlupin', 'jättebalsamin', 'jätteloka', 'parkslide', 'vresros', 'kanadensiskt gullris',
  'gullris', 'vattenpest', 'sjögull', 'jätteslide', 'jättegräsrabarber', 'gul skunkkalla', 'signalkräfta',
  'tvättbjörn', 'mink', 'kanadagås', 'mördarsnigel', 'spansk skogssnigel', 'grå ekorre',
])];

function hits(content: Record<string, { give: string }>): string[] {
  return Object.entries(content).flatMap(([id, c]) => {
    const give = c.give.toLowerCase();
    return INVASIVE.filter((name) => new RegExp(`\\b${name}`, 'u').test(give)).map((name) => `${id}: ${name}`);
  });
}

describe('give advice never promotes an invasive species (T-054)', () => {
  it('English curated content', () => {
    expect(hits(KRONOBERG_CONTENT)).toEqual([]);
  });

  it('Swedish curated content', () => {
    expect(hits(SV_CONTENT)).toEqual([]);
  });

  it('the check itself catches a planted lupin', () => {
    expect(hits({ x: { give: 'Plant lupins along the verge for bumblebees.' } })).toEqual(['x: lupin']);
  });
});
