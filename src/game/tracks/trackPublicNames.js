import { TRACK_REGISTRY } from './trackRegistry.js';

const PUBLIC_TRACK_NAMES = Object.freeze({
  track01: 'CIRCUITO ATLÁNTICO',
  'karting-tenerife': 'KARTING TENERIFE'
});

for (const [key, name] of Object.entries(PUBLIC_TRACK_NAMES)) {
  const track = TRACK_REGISTRY[key];
  if (!track) continue;
  track.name = name;
  track.meta = { ...(track.meta || {}), name };
}
