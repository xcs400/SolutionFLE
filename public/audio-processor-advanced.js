// ═══════════════════════════════════════════════════════════════
// AUDIO PROCESSOR ADVANCED - Single thread (v3)
// Tout le traitement sur le thread principal (sans Web Worker)
// ═══════════════════════════════════════════════════════════════

;(function (global) {
'use strict';

// ─── CONSTANTES ──────────────────────────────────────────────
const SILENCE_THRESH = 0.025;
const ONSET_WIN_SEC  = 0.015;
const ONSET_CONFIRM  = 3;
const PRE_SPEECH_SEC = 0.20;
const TAIL_SEC       = 0.12;
const N_ENV          = 512;

class AudioProcessorAdvanced {
  // ─── API PUBLIQUE ───────────────────────────────────────────

  async processAudio(audioBlob, options = {}) {
    const opts = {
      trimSilence:      options.trimSilence      ?? true,
      extractPitch:     options.extractPitch     ?? true,
      detectSyllables:  options.detectSyllables  ?? true,
      computeIntonation:options.computeIntonation?? true,
      onProgress:       options.onProgress       ?? null,
    };

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    let decoded = await audioCtx.decodeAudioData(arrayBuffer);

    const results = {
      wavBlob:       null,
      pitchAnalysis: null,
      envelope:      null,
      syllables:     [],
      intonation:    [],
      metadata: { processingTime: 0, algorithm: 'YIN' },
    };

    const t0 = performance.now();

    if (opts.trimSilence) {
      const trimmed = trimSilence(decoded, audioCtx);
      decoded          = trimmed.buffer;
      results.wavBlob  = trimmed.wav;
      opts.onProgress?.({ stage: 'Trim silence', progress: 0.2 });
    }

    if (opts.extractPitch) {
      results.pitchAnalysis = extractPitchYIN(decoded);
      opts.onProgress?.({ stage: 'Pitch analysis', progress: 0.5 });
    }

    if (opts.detectSyllables || opts.computeIntonation) {
      results.envelope = computeEnvRMS(decoded);
      opts.onProgress?.({ stage: 'Envelope', progress: 0.6 });
    }

    if (opts.detectSyllables && results.pitchAnalysis) {
      results.syllables = detectSyllables(results.envelope, results.pitchAnalysis);
      opts.onProgress?.({ stage: 'Syllable detection', progress: 0.75 });
    }

    if (opts.computeIntonation && results.pitchAnalysis && results.syllables.length > 0) {
      results.intonation = computeIntonationPerSyllable(
        results.syllables.map(s => s.pos),
        results.pitchAnalysis
      );
      opts.onProgress?.({ stage: 'Intonation', progress: 0.9 });
    }

    results.metadata.processingTime = performance.now() - t0;
    audioCtx.close();
    return results;
  }

  dispose() {
    // Rien à nettoyer (pas de worker)
  }
}

// ═══════════════════════════════════════════════════════════════
// TRIM SILENCE
// ═══════════════════════════════════════════════════════════════
function trimSilence(buffer, audioCtx) {
  const sr  = buffer.sampleRate;
  const nCh = buffer.numberOfChannels;
  const N   = buffer.length;

  // Mix to mono
  const mono = new Float32Array(N);
  for (let c = 0; c < nCh; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < N; i++) mono[i] += d[i] / nCh;
  }

  // RMS envelope
  const winLen  = Math.max(1, Math.floor(ONSET_WIN_SEC * sr));
  const nFrames = Math.ceil(N / winLen);
  const rms     = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    const off = f * winLen;
    let sum = 0, cnt = 0;
    for (let i = off; i < Math.min(off + winLen, N); i++, cnt++) sum += mono[i] ** 2;
    rms[f] = Math.sqrt(sum / (cnt || 1));
  }

  // Adaptive threshold
  const noiseFrames = rms.slice(0, Math.max(4, Math.floor(nFrames * 0.20)));
  const sorted      = Array.from(noiseFrames).sort((a, b) => a - b);
  const noiseFloor  = sorted[Math.floor(sorted.length * 0.75)];
  const dynThresh   = Math.max(SILENCE_THRESH, noiseFloor * 4);

  // Onset detection
  let onsetFrame = -1;
  for (let f = 0; f < nFrames - ONSET_CONFIRM; f++) {
    let ok = true;
    for (let k = 0; k < ONSET_CONFIRM; k++) {
      if (rms[f + k] < dynThresh) { ok = false; break; }
    }
    if (ok) { onsetFrame = f; break; }
  }
  if (onsetFrame < 0) onsetFrame = 0;

  const onsetSample = onsetFrame * winLen;
  const start = Math.max(0, onsetSample - Math.round(PRE_SPEECH_SEC * sr));

  let endFrame = nFrames - 1;
  for (let f = nFrames - 1; f >= 0; f--) {
    if (rms[f] >= dynThresh) { endFrame = f; break; }
  }
  const end = Math.min(N - 1, (endFrame + 1) * winLen + Math.round(TAIL_SEC * sr));

  // Create trimmed AudioBuffer
  const newLen     = end - start + 1;
  const trimmedBuf = audioCtx.createBuffer(nCh, newLen, sr);
  for (let c = 0; c < nCh; c++) {
    trimmedBuf.copyToChannel(buffer.getChannelData(c).slice(start, end + 1), c);
  }

  return { wav: bufferToWav(trimmedBuf), buffer: trimmedBuf };
}

// ═══════════════════════════════════════════════════════════════
// EXTRACT PITCH WITH YIN
// ═══════════════════════════════════════════════════════════════
function extractPitchYIN(buffer) {
  const data    = buffer.getChannelData(0);
  const sr      = buffer.sampleRate;
  const frameLen = Math.floor(sr * 0.025); // 25 ms
  const hopLen   = Math.floor(sr * 0.010); // 10 ms
  const minF0 = 70, maxF0 = 500;
  const minLag = Math.floor(sr / maxF0);
  const maxLag = Math.floor(sr / minF0);
  const thr    = 0.1;
  const pitches = [];

  for (let start = 0; start + frameLen <= data.length; start += hopLen) {
    let energy = 0;
    for (let i = start; i < start + frameLen; i++) energy += data[i] * data[i];
    energy /= frameLen;
    if (energy < 0.0003) { pitches.push(0); continue; }

    // YIN difference function
    const d = new Float32Array(maxLag);
    for (let tau = 0; tau < maxLag; tau++) {
      let sum = 0;
      for (let i = 0; i < frameLen - tau; i++) {
        const diff = data[start + i] - data[start + i + tau];
        sum += diff * diff;
      }
      d[tau] = sum;
    }

    // Cumulative mean normalized difference
    const cumsum = new Float32Array(maxLag);
    cumsum[0] = 1;
    let sum = 0;
    for (let tau = 1; tau < maxLag; tau++) {
      sum += d[tau];
      cumsum[tau] = d[tau] * tau / (sum + 1e-10);
    }

    // First minimum below threshold
    let bestLag = 0;
    for (let tau = minLag; tau < maxLag; tau++) {
      if (cumsum[tau] < thr) { bestLag = tau; break; }
    }

    // Fallback: global minimum
    if (bestLag === 0) {
      let minVal = cumsum[minLag];
      for (let tau = minLag + 1; tau < maxLag; tau++) {
        if (cumsum[tau] < minVal) { minVal = cumsum[tau]; bestLag = tau; }
      }
    }

    pitches.push(bestLag > 0 ? sr / bestLag : 0);
  }

  // Median filter 5-point (anti octave-jumps)
  const med = pitches.slice();
  for (let i = 2; i < pitches.length - 2; i++) {
    const w = [pitches[i-2], pitches[i-1], pitches[i], pitches[i+1], pitches[i+2]].sort((a, b) => a - b);
    med[i] = w[2];
  }

  return { frames: med, hopSec: hopLen / sr, totalDur: buffer.duration };
}

// ═══════════════════════════════════════════════════════════════
// ENVELOPE RMS
// ═══════════════════════════════════════════════════════════════
function computeEnvRMS(buffer) {
  const data = buffer.getChannelData(0);
  const bSz  = Math.ceil(data.length / N_ENV);
  const env  = new Float32Array(N_ENV);
  let maxVal = 0;
  for (let b = 0; b < N_ENV; b++) {
    let sum = 0, cnt = 0, off = b * bSz;
    for (let i = off; i < Math.min(off + bSz, data.length); i++, cnt++) sum += data[i] * data[i];
    env[b] = Math.sqrt(sum / (cnt || 1));
    if (env[b] > maxVal) maxVal = env[b];
  }
  if (maxVal > 0) for (let i = 0; i < N_ENV; i++) env[i] /= maxVal;
  return env;
}

// ═══════════════════════════════════════════════════════════════
// GAUSSIAN SMOOTH
// ═══════════════════════════════════════════════════════════════
function gaussSmooth(arr, radius) {
  const n = arr.length, r = Math.max(1, Math.round(radius));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, w = 0;
    for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) {
      const g = Math.exp(-0.5 * ((j - i) / r) ** 2);
      s += arr[j] * g; w += g;
    }
    out[i] = s / w;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// VOICED DENSITY
// ═══════════════════════════════════════════════════════════════
function buildVoicedDensity(pitchResult, nBuckets) {
  const { frames, hopSec, totalDur } = pitchResult;
  const density = new Float32Array(nBuckets);
  for (let f = 0; f < frames.length; f++) {
    if (frames[f] <= 0) continue;
    const t = f * hopSec / totalDur;
    const b = Math.min(nBuckets - 1, Math.floor(t * nBuckets));
    density[b] += 1;
  }
  const maxD = Math.max(...density, 1);
  for (let i = 0; i < nBuckets; i++) density[i] /= maxD;
  return density;
}

// ═══════════════════════════════════════════════════════════════
// DETECT SYLLABLES
// ═══════════════════════════════════════════════════════════════
function detectSyllables(env, pitchResult) {
  const n      = env.length;
  const voiced = buildVoicedDensity(pitchResult, n);

  const eSmooth = gaussSmooth(gaussSmooth(env, n * 0.025), n * 0.018);
  const vSmooth = gaussSmooth(voiced, n * 0.04);

  const combined = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    combined[i] = Math.sqrt(Math.max(0, eSmooth[i]) * Math.max(0, vSmooth[i]));
  }

  const globalMax = Math.max(...combined);
  if (globalMax < 1e-6) return [];

  const thr    = globalMax * 0.18;
  const minGap = Math.max(5, Math.floor(n * 0.07));

  const candidates = [];
  for (let i = 3; i < n - 3; i++) {
    if (combined[i] < thr) continue;
    if (combined[i] <= combined[i-1] || combined[i] <= combined[i+1]) continue;
    if (combined[i] <= combined[i-2] || combined[i] <= combined[i+2]) continue;

    let lMin = combined[i], rMin = combined[i];
    for (let j = Math.max(0, i - minGap); j < i; j++)
      if (combined[j] < lMin) lMin = combined[j];
    for (let j = i + 1; j <= Math.min(n - 1, i + minGap); j++)
      if (combined[j] < rMin) rMin = combined[j];
    const prom = combined[i] - Math.max(lMin, rMin);

    if (prom >= globalMax * 0.10) {
      candidates.push({ pos: i, val: combined[i], prom });
    }
  }

  const peaks = [];
  for (const c of candidates.sort((a, b) => b.prom - a.prom)) {
    if (peaks.every(p => Math.abs(p.pos - c.pos) >= minGap)) peaks.push(c);
  }
  peaks.sort((a, b) => a.pos - b.pos);
  return peaks.map(p => ({ pos: p.pos / n, val: p.val, prom: p.prom }));
}

// ═══════════════════════════════════════════════════════════════
// INTONATION PER SYLLABLE
// ═══════════════════════════════════════════════════════════════
function computeIntonationPerSyllable(syllablePositions, pitchResult) {
  const { frames, hopSec, totalDur } = pitchResult;

  return syllablePositions.map(pos => {
    const tCenter = pos * totalDur;
    const winSec  = 0.10;
    const fStart  = Math.max(0, Math.floor((tCenter - winSec) / hopSec));
    const fEnd    = Math.min(frames.length - 1, Math.ceil((tCenter + winSec) / hopSec));

    const voiced = [];
    for (let f = fStart; f <= fEnd; f++) {
      if (frames[f] > 50) voiced.push({ t: f - fStart, hz: frames[f] });
    }

    if (voiced.length < 4) return { pos, tone: 'flat', slopeST: 0 };

    const REF = 150;
    const pts  = voiced.map(v => ({ t: v.t, st: 12 * Math.log2(v.hz / REF) }));
    const n    = pts.length;
    const mT   = pts.reduce((s, p) => s + p.t,  0) / n;
    const mST  = pts.reduce((s, p) => s + p.st, 0) / n;
    let num = 0, den = 0;
    for (const p of pts) { num += (p.t - mT) * (p.st - mST); den += (p.t - mT) ** 2; }
    const slope      = den > 0 ? num / den : 0;
    const totalSlope = slope * (fEnd - fStart);
    const tone       = totalSlope > 0.8 ? 'up' : totalSlope < -0.8 ? 'down' : 'flat';
    return { pos, tone, slopeST: totalSlope };
  });
}

// ═══════════════════════════════════════════════════════════════
// BUFFER TO WAV
// ═══════════════════════════════════════════════════════════════
function bufferToWav(buffer) {
  const nCh = buffer.numberOfChannels, sr = buffer.sampleRate, len = buffer.length;
  const pcm = new Int16Array(len * nCh);
  for (let i = 0; i < len; i++) for (let c = 0; c < nCh; c++) {
    const s = buffer.getChannelData(c)[i];
    pcm[i * nCh + c] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
  }
  const db = pcm.byteLength, wav = new ArrayBuffer(44 + db), v = new DataView(wav);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + db, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * nCh * 2, true);
  v.setUint16(32, nCh * 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, db, true);
  new Uint8Array(wav, 44).set(new Uint8Array(pcm.buffer));
  return new Blob([wav], { type: 'audio/wav' });
}

// Export commun
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioProcessorAdvanced;
} else {
  global.AudioProcessorAdvanced = AudioProcessorAdvanced;
}

}(typeof globalThis !== 'undefined' ? globalThis : window));