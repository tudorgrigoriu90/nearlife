// Proves the test harness (jest + jest-expo + TypeScript transform) runs.
// Real behavioral tests live next to the code they cover; see CLAUDE.md (TDD).
describe('test harness', () => {
  it('runs TypeScript tests', () => {
    expect(1 + 1).toBe(2);
  });
});
