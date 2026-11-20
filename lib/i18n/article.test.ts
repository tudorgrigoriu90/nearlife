import { withIndefiniteArticle } from './article';

// T-371: "You caught a Great Tit!", not "You caught Great Tit!".
describe('withIndefiniteArticle', () => {
  it.each([
    ['Great Tit', 'a Great Tit'],
    ['Osprey', 'an Osprey'],
    ['Eurasian Jay', 'a Eurasian Jay'],
    ['European Robin', 'a European Robin'],
    ['Ural Owl', 'a Ural Owl'],
    ['Honey-buzzard', 'a Honey-buzzard'],
    ['Icterine Warbler', 'an Icterine Warbler'],
    ['one-flowered wintergreen', 'a one-flowered wintergreen'],
    ['Huperzia europaea', 'a Huperzia europaea'],
  ])('%s → %s', (name, expected) => {
    expect(withIndefiniteArticle(name)).toBe(expected);
  });
});
