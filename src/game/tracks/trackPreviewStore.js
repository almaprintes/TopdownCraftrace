// Persistent official circuit previews.
// The preview is derived from the exact same rendered canvas used by Generate Map,
// then reused by TrackGarage so both views share one visual source of truth.

const DB_NAME = 'tdr2_track_previews';
const DB_VERSION = 1;
const STORE = 'previews';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'trackKey' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

export function trackPreviewSignature(meta = {}) {
  const compact = {
    name: meta.name || '',
    worldW: Number(meta.worldW || 0),
    worldH: Number(meta.worldH || 0),
    trackWidth: Number(meta.trackWidth || 0),
    surfaceProfile: meta.surfaceProfile || meta?.meta?.surfaceProfile || '',
    finishSegment: meta.finishSegment ?? null,
    finishT: meta.finishT ?? null,
    finishAnchor: meta.finishAnchor || null,
    raceDirection: meta.raceDirection || 'forward',
    centerline: Array.isArray(meta.centerline)
      ? meta.centerline.map(p => Array.isArray(p)
          ? [Number(p[0] || 0), Number(p[1] || 0), Number(p[2] || 0)]
          : [Number(p?.x || 0), Number(p?.y || 0), Number(p?.width || 0)])
      : []
  };
  return JSON.stringify(compact);
}

export async function saveTrackPreview(trackKey, meta, blob, width, height) {
  if (!trackKey || !blob) return;
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({
        trackKey: String(trackKey),
        signature: trackPreviewSignature(meta),
        blob,
        width: Number(width || 0),
        height: Number(height || 0),
        updatedAt: Date.now()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Preview save failed'));
      tx.onabort = () => reject(tx.error || new Error('Preview save aborted'));
    });
  } finally {
    db.close();
  }
}

export async function loadTrackPreview(trackKey, meta) {
  if (!trackKey) return null;
  const db = await openDb();
  try {
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(String(trackKey));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Preview read failed'));
    });
    if (!row?.blob) return null;
    // Never show a stale map after the authored track geometry changes.
    if (row.signature !== trackPreviewSignature(meta)) return null;
    return row;
  } finally {
    db.close();
  }
}
