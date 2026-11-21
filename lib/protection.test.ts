import { protectionLine } from './protection';
import { createTranslator } from './i18n';

// T-337: the card's protection line, by level and by what kind of organism it is.
const tr = createTranslator('en');
const say = (line: ReturnType<typeof protectionLine>) => tr(line.rule, { where: tr(line.where) }) + (line.extra ? ` ${tr(line.extra)}` : '');

describe('protectionLine', () => {
  it('gives every wild bird the 4 § wording, with hunting under its own rules', () => {
    const line = protectionLine('bird', { category: 'bird' }, false);
    expect(line).toEqual({ rule: 'legal.protected.bird', where: 'legal.where.sweden', extra: 'legal.hunting' });
    expect(say(line)).toMatch(/^Protected in Sweden, like every wild bird/);
  });

  it('tells animals not to catch, harm or disturb them where the level is strict, reinforced or annex', () => {
    for (const level of ['strict', 'reinforced', 'annex'] as const) {
      expect(protectionLine(level, { category: 'insect' }, false).rule).toBe('legal.protected.animal');
    }
    expect(protectionLine('basic', { category: 'insect', group: 'amphibian' }, false).rule).toBe('legal.protected.animalBasic');
  });

  it('adds hunting for mammals and fishing for fish, which those laws govern (6 b §)', () => {
    expect(protectionLine('annex', { category: 'mammal' }, false).extra).toBe('legal.hunting');
    expect(protectionLine('strict', { category: 'fish' }, false).extra).toBe('legal.fishing');
    expect(protectionLine('annex', { category: 'insect' }, false).extra).toBeUndefined();
  });

  it('tells plants and fungi not to pick or dig them up; limited protection only bans uprooting and selling', () => {
    expect(protectionLine('basic', { category: 'plant' }, false).rule).toBe('legal.protected.plant');
    expect(protectionLine('reinforced', { category: 'fungus' }, false).rule).toBe('legal.protected.plant');
    expect(protectionLine('limited', { category: 'plant' }, false).rule).toBe('legal.protected.plantLimited');
  });

  it('a snail filed under the plant minigame is still an animal', () => {
    expect(protectionLine('reinforced', { category: 'plant', group: 'mollusc' }, false).rule).toBe('legal.protected.animal');
  });

  it('says "in this county" when the protection holds only in some counties', () => {
    const line = protectionLine('limited', { category: 'plant' }, true);
    expect(line.where).toBe('legal.where.county');
    expect(say(line)).toMatch(/^Protected in this county:/);
  });

  it('has Swedish for every line', () => {
    const sv = createTranslator('sv');
    for (const key of [
      'legal.protected.bird', 'legal.protected.animal', 'legal.protected.animalBasic', 'legal.protected.plant',
      'legal.protected.plantLimited', 'legal.where.sweden', 'legal.where.county', 'legal.hunting', 'legal.fishing',
    ] as const) {
      expect(sv(key)).not.toBe(tr(key));
    }
    expect(sv('legal.protected.plant', { where: sv('legal.where.sweden') })).toMatch(/^Fridlyst i Sverige/);
  });
});
