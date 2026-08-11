// Jest setup (T-091). h3-js' emscripten build (out/libh3.js) calls `new TextDecoder(...)` at import
// time, but jest-expo's "winter" runtime installs a partial TextDecoder that throws on it — so any
// test importing h3-js (lib/cell) crashed on load. Restore Node's spec-compliant TextDecoder /
// TextEncoder so WASM/emscripten-backed libraries load under jest. Wired via `setupFilesAfterEnv`
// (the preset leaves that unset), so this runs after the winter polyfill and before each test module
// is required. Node's implementations are standard supersets of what the app uses, so this is safe
// for every suite, not just the cell tests.
const { TextDecoder, TextEncoder } = require('util');

globalThis.TextDecoder = TextDecoder;
globalThis.TextEncoder = TextEncoder;
