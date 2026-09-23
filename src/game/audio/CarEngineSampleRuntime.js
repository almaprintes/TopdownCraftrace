import { attainableTopSpeedKmh, pxpsToKmh } from '../cars/speedUnits.js';
import {
  SPARK_IDLE_RPM,
  SPARK_REDLINE_RPM,
  advanceSparkRpm,
  sparkSampleMix,
  targetSparkRpm
} from './SparkEngineModel.js';
import { ENGINE_AUDIO_PROFILES } from './EngineAudioProfiles.js';
import {
  advanceProfiledRpm,
  profiledSampleMix,
  targetProfiledRpm
} from './ProfiledRpmEngineModel.js';

const SETTINGS_KEY = 'tdr2:settings';
const UPDATE_MS = 40;
export const IGNITION_TO_LIGHTS_MS = 930;
const IGNITION_ENGINE_FADE_START_MS = 520;
const IGNITION_ENGINE_FADE_END_MS = 900;
const IGNITION_ASSET = 'assets/audio/engine/ignition/car_engine_start.wav';
const SPARK_ASSETS = [
  'assets/audio/engine/spark/loop_0.wav',
  'assets/audio/engine/spark/loop_1_0.wav',
  'assets/audio/engine/spark/loop_2_0.wav',
  'assets/audio/engine/spark/loop_3_0.wav',
  'assets/audio/engine/spark/loop_4_0.wav',
  'assets/audio/engine/spark/loop_5_0.wav'
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

let sparkBytesPromise = null;
let ignitionBytesPromise = null;

function preferences() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const audio = settings?.audio || {};
    return {
      master: clamp(Number(audio.master ?? 1), 0, 1),
      engine: clamp(Number(audio.engine ?? 1), 0, 1),
      effects: clamp(Number(audio.effects ?? 0.45), 0, 1),
      mute: Boolean(audio.mute)
    };
  } catch {
    return { master: 1, engine: 1, effects: 0.45, mute: false };
  }
}

function publicAssetUrl(path) {
  return new URL(path, document.baseURI).href;
}

async function fetchArrayBuffer(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`engine sample HTTP ${response.status}: ${url}`);
  return response.arrayBuffer();
}

function preloadSparkBytes() {
  if (!sparkBytesPromise) {
    sparkBytesPromise = Promise.all(SPARK_ASSETS.map(path => fetchArrayBuffer(publicAssetUrl(path))))
      .catch(error => {
        sparkBytesPromise = null;
        throw error;
      });
  }
  return sparkBytesPromise;
}

function preloadIgnitionBytes() {
  if (!ignitionBytesPromise) {
    ignitionBytesPromise = fetchArrayBuffer(publicAssetUrl(IGNITION_ASSET))
      .catch(error => {
        ignitionBytesPromise = null;
        throw error;
      });
  }
  return ignitionBytesPromise;
}

function decodeAudioData(context, bytes) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const accept = buffer => {
      if (settled) return;
      settled = true;
      resolve(buffer);
    };
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    try {
      const pending = context.decodeAudioData(bytes.slice(0), accept, fail);
      pending?.then?.(accept, fail);
    } catch (error) {
      fail(error);
    }
  });
}

async function loadBuffer(context, url) {
  return decodeAudioData(context, await fetchArrayBuffer(url));
}

function makeNoiseBuffer(context, seconds = 2.2) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let slow = 0;
  let fast = 0;
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    slow = slow * 0.988 + white * 0.012;
    fast = fast * 0.70 + white * 0.30;
    data[index] = clamp(slow * 0.40 + fast * 0.44 + white * 0.16, -1, 1);
  }
  return buffer;
}

function makeDriveCurve(amount = 1.18) {
  const size = 1024;
  const curve = new Float32Array(size);
  for (let index = 0; index < size; index += 1) {
    const x = (index / (size - 1)) * 2 - 1;
    curve[index] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

export class CarEngineSampleRuntime {
  constructor(scene) {
    this.scene = scene;
    this.engineStarted = false;
    this.unlocked = false;
    this._ctx = null;
    this._nodes = null;
    this._lastUpdate = 0;
    this._lastResumeAttempt = 0;
    this._rpm = SPARK_IDLE_RPM;
    this._graphPromise = null;
    this._sparkBufferPromise = null;
    this._sparkBufferContext = null;
    this._ignitionBufferPromise = null;
    this._ignitionBufferContext = null;
    this._ignitionSource = null;
    this._ignitionGain = null;
    this._engineFadeStartAt = 0;
    this._engineFadeEndAt = 0;
    this._sparkTopKmh = Math.max(30, attainableTopSpeedKmh(scene?.carParams || {}, 40) || 60);
    this._contextRecovery = () => this._resumeContext('lifecycle');

    // Fetch and decode before the ignition gesture whenever the platform permits
    // it. The context remains silent/suspended until ARRANCAR MOTOR resumes it.
    this._prepareIgnitionSample();
    if (this._usesRpmBank()) this._prepareSparkBank();
  }

  _carId() {
    try {
      return String(
        this.scene?.carId ||
        this.scene?.car?.id ||
        this.scene?.playerCar?.id ||
        localStorage.getItem('tdr2:carId') ||
        ''
      ).trim();
    } catch {
      return String(this.scene?.carId || '').trim();
    }
  }

  _mode() {
    const id = this._carId();
    if (id === 'helix_spark') return 'spark-samples';
    const profile = this._sampleProfile();
    if (profile?.kind === 'rpm-bank') return 'rpm-bank';
    if (profile) return 'profile-sample';
    return 'procedural';
  }

  _usesRpmBank() {
    const mode = this._mode();
    return mode === 'spark-samples' || mode === 'rpm-bank';
  }

  _sampleProfile() {
    const requested = String(
      this.scene?.carParams?.engineAudioProfile ||
      this.scene?.baseSpec?.engineAudioProfile ||
      (this._carId() === 'helix_vortex' ? 'JEEP' : '')
    ).trim();
    return ENGINE_AUDIO_PROFILES[requested] || null;
  }

  _ensureContext() {
    if (this._ctx) return this._ctx;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('WebAudio unavailable');
    this._ctx = new AudioContextClass({ latencyHint: 'interactive' });
    document.addEventListener('visibilitychange', this._contextRecovery, { passive: true });
    window.addEventListener('pageshow', this._contextRecovery, { passive: true });
    window.addEventListener('focus', this._contextRecovery, { passive: true });
    return this._ctx;
  }

  _resumeContext(reason) {
    const context = this._ctx;
    if (!this.engineStarted || !context || context.state !== 'suspended' || document.hidden) return;
    const now = performance.now();
    if (reason === 'update' && now - this._lastResumeAttempt < 1000) return;
    this._lastResumeAttempt = now;
    context.resume().catch(error => console.warn('[TDR2 engine] AudioContext resume failed', reason, error));
  }

  _prepareSparkBank() {
    try {
      const context = this._ensureContext();
      if (this._sparkBufferPromise && this._sparkBufferContext === context) return this._sparkBufferPromise;
      this._sparkBufferContext = context;
      console.info('[TDR2 engine] Preloading six local RPM samples', this._carId());
      const pending = preloadSparkBytes()
        .then(allBytes => Promise.all(allBytes.map(bytes => decodeAudioData(context, bytes))))
        .then(buffers => {
          console.info('[TDR2 engine] Local RPM samples decoded', this._carId(), buffers.map(buffer => buffer.duration.toFixed(3)));
          return buffers;
        });
      this._sparkBufferPromise = pending;
      pending.catch(error => {
        if (this._sparkBufferPromise === pending) this._sparkBufferPromise = null;
        console.warn('[TDR2 engine] RPM sample bank failed; procedural fallback is disabled', error);
      });
      return pending;
    } catch (error) {
      console.warn('[TDR2 engine] RPM bank preload unavailable', error);
      return null;
    }
  }

  _prepareIgnitionSample() {
    try {
      const context = this._ensureContext();
      if (this._ignitionBufferPromise && this._ignitionBufferContext === context) return this._ignitionBufferPromise;
      this._ignitionBufferContext = context;
      const pending = preloadIgnitionBytes()
        .then(bytes => decodeAudioData(context, bytes))
        .then(buffer => {
          console.info('[TDR2 ignition] Local CC0 starter decoded', buffer.duration.toFixed(3));
          return buffer;
        });
      this._ignitionBufferPromise = pending;
      pending.catch(error => {
        if (this._ignitionBufferPromise === pending) this._ignitionBufferPromise = null;
        console.warn('[TDR2 ignition] Local starter unavailable; race will continue', error);
      });
      return pending;
    } catch (error) {
      console.warn('[TDR2 ignition] Starter preload unavailable; race will continue', error);
      return null;
    }
  }

  _createOutputGraph(context, mode) {
    const master = context.createGain();
    master.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 18;
    compressor.ratio.value = 3.1;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    master.connect(compressor).connect(context.destination);

    const engineBus = context.createGain();
    engineBus.gain.value = 0;
    const drive = context.createWaveShaper();
    drive.curve = makeDriveCurve(1.08);
    drive.oversample = '2x';
    const lowBody = context.createBiquadFilter();
    lowBody.type = 'lowshelf';
    lowBody.frequency.value = 150;
    lowBody.gain.value = 3.2;
    const cabin = context.createBiquadFilter();
    cabin.type = 'peaking';
    cabin.frequency.value = 410;
    cabin.Q.value = 0.50;
    cabin.gain.value = 2.2;
    const roof = context.createBiquadFilter();
    roof.type = 'lowpass';
    roof.frequency.value = 5600;
    roof.Q.value = 0.28;
    engineBus.connect(drive).connect(lowBody).connect(cabin).connect(roof).connect(master);

    return { mode, master, compressor, engineBus, drive, lowBody, cabin, roof };
  }

  async _buildGraph() {
    if (this._nodes) return;
    const context = this._ensureContext();
    const mode = this._mode();
    const graph = this._createOutputGraph(context, mode);
    const audioProfile = this._sampleProfile();
    let combustion = null;
    let sampleSources = [];
    let sampleGains = [];

    if (mode === 'spark-samples' || mode === 'rpm-bank') {
      const buffers = await (this._sparkBufferPromise || this._prepareSparkBank());
      if (!buffers?.length || this._ctx !== context) throw new Error('Spark sample bank unavailable');
      const startAt = context.currentTime + 0.025;
      for (const buffer of buffers) {
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0;
        source.connect(gain).connect(graph.engineBus);
        source.start(startAt);
        sampleSources.push(source);
        sampleGains.push(gain);
      }
      console.info('[TDR2 engine] RPM sample graph started on one WebAudio clock', this._carId());
    } else if (mode === 'profile-sample') {
      const buffer = await loadBuffer(context, publicAssetUrl(audioProfile.sourceUrl));
      if (this._ctx !== context) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = audioProfile.loop;
      source.playbackRate.value = audioProfile.initialPlaybackRate;
      gain.gain.value = audioProfile.initialGain;
      source.connect(gain).connect(graph.engineBus);
      source.start();
      sampleSources = [source];
      sampleGains = [gain];
    } else {
      if (!context.audioWorklet || typeof AudioWorkletNode === 'undefined') throw new Error('AudioWorklet unavailable');
      await context.audioWorklet.addModule(new URL('./EngineCombustionProcessor.js', import.meta.url));
      if (this._ctx !== context) return;
      combustion = new AudioWorkletNode(context, 'tdr-engine-combustion', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        parameterData: { rpm: SPARK_IDLE_RPM, load: 0, coast: 0, level: 0.72 }
      });
      combustion.connect(graph.engineBus);
    }

    const windNoise = context.createBufferSource();
    windNoise.buffer = makeNoiseBuffer(context);
    windNoise.loop = true;
    const windFilter = context.createBiquadFilter();
    windFilter.type = 'highpass';
    windFilter.frequency.value = 1250;
    windFilter.Q.value = 0.20;
    const windGain = context.createGain();
    windGain.gain.value = 0;
    windNoise.connect(windFilter).connect(windGain).connect(graph.master);
    windNoise.start();

    this._nodes = {
      ...graph,
      combustion,
      sampleSources,
      sampleGains,
      audioProfile,
      windNoise,
      windFilter,
      windGain
    };
  }

  _playIgnitionSample() {
    const context = this._ctx;
    const requestedAt = performance.now();
    const pending = this._ignitionBufferPromise || this._prepareIgnitionSample();
    if (!context || !pending) return;
    pending.then(buffer => {
      if (!this.scene || !this.engineStarted || this._ctx !== context) return;
      if (performance.now() - requestedAt > 320) {
        console.warn('[TDR2 ignition] Starter decode missed the ignition window; skipping sample');
        return;
      }
      const audio = preferences();
      const now = context.currentTime;
      const level = audio.mute ? 0 : audio.master * audio.engine * 0.90;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.connect(gain).connect(context.destination);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + 0.025);
      gain.gain.setValueAtTime(level, now + 0.62);
      gain.gain.linearRampToValueAtTime(0, now + 0.98);
      source.onended = () => {
        try { source.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
        if (this._ignitionSource === source) this._ignitionSource = null;
        if (this._ignitionGain === gain) this._ignitionGain = null;
      };
      this._ignitionSource = source;
      this._ignitionGain = gain;
      source.start(now);
      source.stop(now + Math.min(buffer.duration, 1.0));
    }).catch(error => console.warn('[TDR2 ignition] Starter playback failed; race will continue', error));
  }

  startEngine() {
    if (this.engineStarted) return;
    this.engineStarted = true;
    this.unlocked = true;
    try {
      const context = this._ensureContext();
      if (context.state === 'suspended') {
        context.resume().catch(error => console.warn('[TDR2 engine] ignition resume failed', error));
      }
      this._rpm = this._sampleProfile()?.idleRpm || SPARK_IDLE_RPM;
      this._lastUpdate = performance.now();
      this._engineFadeStartAt = this._lastUpdate + IGNITION_ENGINE_FADE_START_MS;
      this._engineFadeEndAt = this._lastUpdate + IGNITION_ENGINE_FADE_END_MS;
      this._playIgnitionSample();
      if (!this._nodes && !this._graphPromise) {
        this._graphPromise = this._buildGraph()
          .then(() => {
            this._graphPromise = null;
            this.update(true);
          })
          .catch(error => {
            this._graphPromise = null;
            console.warn('[TDR2 engine] sample/procedural init failed', error);
          });
      } else {
        this.update(true);
      }
    } catch (error) {
      console.warn('[TDR2 engine] init failed', error);
    }
  }

  _driveState() {
    const velocity = this.scene?.carBody?.body?.velocity || this.scene?.car?.body?.velocity || {};
    const speedPx = Math.hypot(Number(velocity.x) || 0, Number(velocity.y) || 0);
    const touchThrottle = clamp(Number(this.scene?.touch?.throttle) || 0, 0, 1);
    const keyboardThrottle = this.scene?.keys?.up?.isDown || this.scene?.keys?.up2?.isDown ? 1 : 0;
    return {
      kmh: Math.max(0, pxpsToKmh(speedPx)),
      throttle: Math.max(touchThrottle, keyboardThrottle)
    };
  }

  _legacyTargetRpm(kmh, throttle) {
    const speedProgress = clamp(kmh / 195, 0, 1);
    const roadCarry = SPARK_IDLE_RPM + Math.pow(speedProgress, 0.82) * 3600;
    const freeRev = SPARK_IDLE_RPM + Math.pow(clamp(throttle, 0, 1), 0.72) * (SPARK_REDLINE_RPM - SPARK_IDLE_RPM);
    return clamp(Math.max(roadCarry, freeRev), SPARK_IDLE_RPM, SPARK_REDLINE_RPM);
  }

  _advanceLegacyRpm(target, throttle, elapsedSeconds) {
    const rate = this._rpm < target ? 2600 + throttle * 3300 : 3100;
    const step = rate * elapsedSeconds;
    return this._rpm < target
      ? Math.min(target, this._rpm + step)
      : Math.max(target, this._rpm - step);
  }

  update(force = false) {
    if (!this.scene || this.scene._tdrEmbeddedReplay || !this.engineStarted) return;
    const perfNow = performance.now();
    if (!force && perfNow - this._lastUpdate < UPDATE_MS) return;
    const elapsedSeconds = clamp((perfNow - this._lastUpdate || UPDATE_MS) / 1000, 0.001, 0.12);
    this._lastUpdate = perfNow;
    if (!this._ctx || !this._nodes) return;
    if (this._ctx.state === 'suspended') {
      this._resumeContext('update');
      return;
    }

    const { kmh, throttle } = this._driveState();
    const audio = preferences();
    const nodes = this._nodes;
    const now = this._ctx.currentTime;
    const rpmProfile = nodes.mode === 'rpm-bank' ? nodes.audioProfile : null;
    const target = nodes.mode === 'spark-samples'
      ? targetSparkRpm(kmh, throttle, this._sparkTopKmh)
      : nodes.mode === 'rpm-bank'
        ? targetProfiledRpm(rpmProfile, kmh, throttle, this._sparkTopKmh)
        : this._legacyTargetRpm(kmh, throttle);
    this._rpm = nodes.mode === 'spark-samples'
      ? advanceSparkRpm(this._rpm, target, throttle, elapsedSeconds)
      : nodes.mode === 'rpm-bank'
        ? advanceProfiledRpm(rpmProfile, this._rpm, target, throttle, elapsedSeconds)
        : this._advanceLegacyRpm(target, throttle, elapsedSeconds);

    const idleRpm = Number(rpmProfile?.idleRpm) || SPARK_IDLE_RPM;
    const redlineRpm = Number(rpmProfile?.redlineRpm) || SPARK_REDLINE_RPM;
    const rpm01 = clamp((this._rpm - idleRpm) / (redlineRpm - idleRpm), 0, 1);
    const speed01 = clamp(kmh / 180, 0, 1);
    const coast = clamp((1 - throttle) * rpm01 * (kmh > 8 ? 1 : 0), 0, 1);
    const load = clamp(throttle * 0.94 + speed01 * 0.06, 0, 1);

    if (nodes.mode === 'spark-samples' || nodes.mode === 'rpm-bank') {
      const mix = nodes.mode === 'rpm-bank'
        ? profiledSampleMix(rpmProfile, this._rpm)
        : sparkSampleMix(this._rpm);
      nodes.sampleGains.forEach((gain, index) => {
        const sampleGainBase = Number(rpmProfile?.sampleGainBase) || 0.72;
        const sampleLoadGain = Number(rpmProfile?.sampleLoadGain) || 0.18;
        const targetLevel = (mix.levels[index] || 0) * (sampleGainBase + load * sampleLoadGain);
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(targetLevel, now, 0.035);
        const rate = nodes.sampleSources[index]?.playbackRate;
        if (rate) {
          rate.cancelScheduledValues(now);
          rate.setTargetAtTime(mix.rates[index] || 1, now, 0.05);
        }
      });
    } else if (nodes.mode === 'profile-sample') {
      const profile = nodes.audioProfile;
      const source = nodes.sampleSources[0];
      const gain = nodes.sampleGains[0];
      source?.playbackRate?.setTargetAtTime?.(
        profile.minPlaybackRate + rpm01 * profile.playbackRateRange,
        now,
        profile.playbackRateSmoothing
      );
      gain?.gain?.setTargetAtTime?.(
        profile.baseGain + load * profile.loadGain - coast * profile.coastGainReduction,
        now,
        profile.gainSmoothing
      );
    } else {
      nodes.combustion?.parameters.get('rpm')?.setTargetAtTime(this._rpm, now, 0.055);
      nodes.combustion?.parameters.get('load')?.setTargetAtTime(load, now, 0.055);
      nodes.combustion?.parameters.get('coast')?.setTargetAtTime(coast, now, 0.070);
      nodes.combustion?.parameters.get('level')?.setTargetAtTime(0.64 + rpm01 * 0.09, now, 0.070);
    }

    nodes.cabin.frequency.setTargetAtTime((Number(rpmProfile?.cabinFrequencyBase) || 420) + rpm01 * (Number(rpmProfile?.cabinFrequencyRange) || 420), now, 0.12);
    nodes.cabin.gain.setTargetAtTime((Number(rpmProfile?.cabinGainBase) || 1.8) - rpm01 * (Number(rpmProfile?.cabinGainRpmReduction) || 0.5) + load * (Number(rpmProfile?.cabinLoadGain) || 0.3), now, 0.12);
    nodes.lowBody.gain.setTargetAtTime((Number(rpmProfile?.lowBodyGainBase) || 2.5) - rpm01 * (Number(rpmProfile?.lowBodyRpmReduction) || 0.8), now, 0.12);
    nodes.roof.frequency.setTargetAtTime((Number(rpmProfile?.roofFrequencyBase) || 4200) + rpm01 * (Number(rpmProfile?.roofFrequencyRange) || 3200) + load * (Number(rpmProfile?.roofLoadRange) || 500), now, 0.10);
    nodes.windFilter.frequency.setTargetAtTime(1120 + speed01 * 2450, now, 0.14);
    nodes.windGain.gain.setTargetAtTime(Math.pow(speed01, 1.8) * 0.010 * audio.effects, now, 0.12);
    const preGrid = this.scene._startState === 'WAIT_ENGINE' || this.scene._startState === 'READY';
    const ignitionFade = this._engineFadeEndAt > this._engineFadeStartAt
      ? clamp((perfNow - this._engineFadeStartAt) / (this._engineFadeEndAt - this._engineFadeStartAt), 0, 1)
      : 1;
    const engineLevel = (0.64 + rpm01 * 0.18 + load * 0.10) * (preGrid ? 0.72 : 1) * audio.engine * ignitionFade;
    nodes.engineBus.gain.setTargetAtTime(engineLevel, now, 0.06);
    nodes.master.gain.setTargetAtTime(audio.mute ? 0 : audio.master * 0.82, now, 0.055);
  }

  destroy() {
    document.removeEventListener('visibilitychange', this._contextRecovery);
    window.removeEventListener('pageshow', this._contextRecovery);
    window.removeEventListener('focus', this._contextRecovery);
    try { this._nodes?.windNoise?.stop?.(); } catch {}
    try { this._ignitionSource?.stop?.(); } catch {}
    try { this._ignitionSource?.disconnect?.(); } catch {}
    try { this._ignitionGain?.disconnect?.(); } catch {}
    for (const source of this._nodes?.sampleSources || []) {
      try { source.stop?.(); } catch {}
    }
    try { this._nodes?.combustion?.disconnect?.(); } catch {}
    try { this._ctx?.close?.(); } catch {}
    this._nodes = null;
    this._graphPromise = null;
    this._sparkBufferPromise = null;
    this._sparkBufferContext = null;
    this._ignitionBufferPromise = null;
    this._ignitionBufferContext = null;
    this._ignitionSource = null;
    this._ignitionGain = null;
    this._ctx = null;
    this.scene = null;
  }
}
