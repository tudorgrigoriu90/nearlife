/* global jest */
// Audio stub for Jest (T-246): the native player does not exist in tests. A tiny fake player that
// keeps `playing` / `didJustFinish` and re-renders its status hook, so components can be driven
// like the real thing. Tests reach the players a render created through `__players`.
const React = require('react');

const players = [];

function makePlayer(source) {
  const listeners = new Set();
  const player = {
    source,
    playing: false,
    didJustFinish: false,
    _listeners: listeners,
    _emit: () => listeners.forEach((l) => l()),
    play: jest.fn(() => {
      player.playing = true;
      player.didJustFinish = false;
      player._emit();
    }),
    pause: jest.fn(() => {
      player.playing = false;
      player._emit();
    }),
    seekTo: jest.fn(async () => undefined),
  };
  return player;
}

module.exports = {
  __players: players,
  useAudioPlayer: jest.fn((source) => {
    const ref = React.useRef(null);
    if (!ref.current) {
      ref.current = makePlayer(source);
      players.push(ref.current);
    }
    return ref.current;
  }),
  useAudioPlayerStatus: (player) => {
    const [, force] = React.useReducer((x) => x + 1, 0);
    React.useEffect(() => {
      player._listeners.add(force);
      return () => player._listeners.delete(force);
    }, [player]);
    return { playing: player.playing, didJustFinish: player.didJustFinish };
  },
  setAudioModeAsync: jest.fn(async () => undefined),
};
