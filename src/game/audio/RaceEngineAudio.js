const FLASH_ID = 'veloce_flash';
const ENGINE_KEYS = Array.from({ length: 6 }, (_, i) => `tdr_flash_engine_${i}`);
const TURBO_KEY = 'tdr_flash_turbo_loop';
const FLUTTER_KEY = 'tdr_flash_turbo_flutter';
const SHIFT_KEY = 'tdr_flash_shift';

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
const lerp = (a, b, t) => a + (b - a) * t;

function activeCarId(scene) {
  return scene?.baseSpec?.id || scene?.carParams?.id || scene?.carId || scene?._carId || null;
}

function addRaceAudioAssets(scene) {
  const base = 'assets/audio/cars/veloce_flash';
  ENGINE_KEYS.forEach((key, i) => {
    if (!scene.cache.audio.exists(key)) scene.load.audio(key, `${base}/engine/loop_${i}.wav`);
  });
  if (!scene.cache.audio.exists(TURBO_KEY)) scene.load.audio(TURBO_KEY, `${base}/turbo/audley_fergine-car-turbo-loop-288859.mp3`);
  if (!scene.cache.audio.exists(FLUTTER_KEY)) scene.load.audio(FLUTTER_KEY, `${base}/turbo/spinopel-turbo-flutter-336362.mp3`);
  if (!scene.cache.audio.exists(SHIFT_KEY)) scene.load.audio(SHIFT_KEY, `${base}/transmission/freesound_community-shifting-car-42962.mp3`);
}

function createState(scene) {
  if (activeCarId(scene) !== FLASH_ID || !scene.sound) return null;

  const loops = ENGINE_KEYS.map((key) => scene.sound.add(key, { loop: true, volume: 0 }));
  const turbo = scene.sound.add(TURBO_KEY, { loop: true, volume: 0 });
  const flutter = scene.sound.add(FLUTTER_KEY, { loop: false, volume: 0.30 });
  const shift = scene.sound.add(SHIFT_KEY, { loop: false, volume: 0.36 });

  const state = {
    loops,
    turbo,
    flutter,
    shift,
    started: false,
    lastGear: 1,
    shiftDip: 0,
    prevThrottle: false,
    lastFlutterAt: -9999,
    destroyed: false
  };

  const start = async () => {
    if (state.destroyed || state.started) return;
    try { await scene.sound.context?.resume?.(); } catch {}
    if (scene.sound.locked) return;
    try {
      loops.forEach((s) => { if (!s.isPlaying) s.play(); });
      if (!turbo.isPlaying) turbo.play();
      state.started = true;
    } catch {}
  };

  state.start = start;
  scene.input?.once?.('pointerdown', start);
  scene.input?.keyboard?.once?.('keydown', start);

  const shutdown = () => {
    state.destroyed = true;
    for (const s of [...loops, turbo, flutter, shift]) {
      try { s.stop(); s.destroy(); } catch {}
    }
  };
  scene.events?.once?.('shutdown', shutdown);
  scene.events?.once?.('destroy', shutdown);

  return state;
}

function playShort(scene, sound, durationMs, volume, seek = 0) {
  if (!sound || scene.sound?.locked) return;
  try {
    sound.stop();
    sound.play({ volume, seek });
    scene.time?.delayedCall?.(durationMs, () => {
      try { if (sound.isPlaying) sound.stop(); } catch {}
    });
  } catch {}
}

function updateState(scene, state, deltaMs) {
  if (!state || state.destroyed || activeCarId(scene) !== FLASH_ID) return;
  if (!state.started) state.start?.();
  if (!state.started) return;

  const body = scene.car?.body;
  if (!body?.velocity) return;

  const rot = Number(scene.car?.rotation || 0);
  const fx = Math.cos(rot), fy = Math.sin(rot);
  const fwd = body.velocity.x * fx + body.velocity.y * fy;
  const maxFwd = Math.max(1, Number(scene.maxFwd || scene.baseSpec?.maxFwd || 581.1));
  const speed01 = clamp01(Math.max(0, fwd) / maxFwd);

  const t = scene.touch || {};
  const keys = scene.keys || {};
  const throttle = !!(t.throttle > 0.5 || keys.up?.isDown || keys.up2?.isDown) && !!scene._raceStarted;

  // Sonic gearbox only: no physics are changed.
  const gearCuts = [0, 0.16, 0.31, 0.47, 0.64, 0.82, 1.01];
  let gear = 1;
  for (let i = 1; i < gearCuts.length - 1; i++) if (speed01 >= gearCuts[i]) gear = i + 1;

  const lo = gearCuts[gear - 1];
  const hi = gearCuts[gear] || 1;
  const inGear = clamp01((speed01 - lo) / Math.max(0.001, hi - lo));
  let rpm01 = clamp01(0.20 + inGear * 0.80);
  if (!throttle) rpm01 *= 0.90;

  const now = scene.time?.now || 0;
  if (gear !== state.lastGear) {
    state.shiftDip = 1;
    playShort(scene, state.shift, 280, 0.42, 0);
    if (throttle && now - state.lastFlutterAt > 280) {
      playShort(scene, state.flutter, 520, 0.32, 0);
      state.lastFlutterAt = now;
    }
    state.lastGear = gear;
  }

  if (state.prevThrottle && !throttle && speed01 > 0.18 && now - state.lastFlutterAt > 450) {
    playShort(scene, state.flutter, 620, 0.28, 0);
    state.lastFlutterAt = now;
  }
  state.prevThrottle = throttle;

  state.shiftDip = Math.max(0, state.shiftDip - (Number(deltaMs) || 0) / 180);
  const dip = 1 - state.shiftDip * 0.68;

  const pos = rpm01 * (state.loops.length - 1);
  const i0 = Math.floor(pos);
  const i1 = Math.min(state.loops.length - 1, i0 + 1);
  const blend = pos - i0;
  const master = (scene._raceStarted ? 0.72 : 0.18) * dip;

  state.loops.forEach((s, i) => {
    let w = 0;
    if (i === i0) w = 1 - blend;
    else if (i === i1) w = blend;
    const targetVol = master * w;
    const current = Number(s.volume || 0);
    s.setVolume(lerp(current, targetVol, 0.20));
    const rate = lerp(0.90, 1.10, rpm01);
    s.setRate(rate);
  });

  const turboLoad = throttle ? clamp01((rpm01 - 0.22) / 0.78) * clamp01(speed01 * 1.25) : 0;
  state.turbo.setVolume(lerp(Number(state.turbo.volume || 0), 0.30 * turboLoad, 0.12));
  state.turbo.setRate(lerp(0.92, 1.18, rpm01));
}

export function installRaceEngineAudio(RaceScene) {
  const proto = RaceScene?.prototype;
  if (!proto || proto.__tdrRaceEngineAudioInstalled) return;
  proto.__tdrRaceEngineAudioInstalled = true;

  const originalPreload = proto.preload;
  proto.preload = function patchedRaceAudioPreload(...args) {
    const out = originalPreload?.apply(this, args);
    addRaceAudioAssets(this);
    return out;
  };

  const originalCreate = proto.create;
  proto.create = function patchedRaceAudioCreate(...args) {
    const out = originalCreate?.apply(this, args);
    this.__tdrEngineAudio = createState(this);
    return out;
  };

  const originalUpdate = proto.update;
  proto.update = function patchedRaceAudioUpdate(time, deltaMs) {
    const out = originalUpdate?.call(this, time, deltaMs);
    updateState(this, this.__tdrEngineAudio, deltaMs);
    return out;
  };
}
