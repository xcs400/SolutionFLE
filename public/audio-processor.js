// ═══════════════════════════════════════════════════════════════
// AUDIO PROCESSOR - Traitement du signal audio pour prononciation
// ═══════════════════════════════════════════════════════════════

// ─── CONSTANTES ──────────────────────────────────────────────
const SILENCE_THRESH = 0.025; // seuil RMS pour détecter la parole
const ONSET_WIN_SEC = 0.015; // fenêtre RMS pour le détecteur d'onset (15 ms)
const ONSET_CONFIRM = 3;     // nb de fenêtres consécutives pour confirmer l'onset
const PRE_SPEECH_SEC = 0.20;  // silence conservé AVANT la première parole
const TAIL_SEC = 0.12;  // silence conservé APRÈS la fin de parole
const N_ENV = 512;   // buckets pour l'enveloppe

// ═══════════════════════════════════════════════════════════════
// LISSAGE GAUSSIEN
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
// ENVELOPPE RMS
// ═══════════════════════════════════════════════════════════════
function computeEnvRMS(buffer, nBuckets) {
  const data = buffer.getChannelData(0);
  const bSz = Math.ceil(data.length / nBuckets);
  const env = new Float32Array(nBuckets);
  let maxVal = 0;
  for (let b = 0; b < nBuckets; b++) {
    let sum = 0, cnt = 0, off = b * bSz;
    for (let i = off; i < Math.min(off + bSz, data.length); i++, cnt++) sum += data[i] * data[i];
    env[b] = Math.sqrt(sum / (cnt || 1));
    if (env[b] > maxVal) maxVal = env[b];
  }
  if (maxVal > 0) for (let i = 0; i < nBuckets; i++) env[i] /= maxVal;
  return env;
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION DE PITCH F0 (autocorrélation)
// ═══════════════════════════════════════════════════════════════
function extractPitch(buffer) {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const frameLen = Math.floor(sr * 0.025); // 25 ms
  const hopLen = Math.floor(sr * 0.010); // 10 ms
  const minLag = Math.floor(sr / 500);
  const maxLag = Math.floor(sr / 70);
  const pitches = [];
  const totalDur = buffer.duration;

  for (let start = 0; start + frameLen <= data.length; start += hopLen) {
    let energy = 0;
    for (let i = start; i < start + frameLen; i++) energy += data[i] * data[i];
    energy /= frameLen;
    if (energy < 0.0003) { pitches.push(0); continue; }

    let bestCorr = -1, bestLag = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let num = 0, den = 0;
      const lim = frameLen - maxLag;
      for (let i = 0; i < lim; i++) {
        num += data[start + i] * data[start + i + lag];
        den += data[start + i] * data[start + i];
      }
      const r = den > 1e-10 ? num / den : 0;
      if (r > bestCorr) { bestCorr = r; bestLag = lag; }
    }
    pitches.push((bestCorr > 0.28 && bestLag > 0) ? sr / bestLag : 0);
  }

  // Filtre médian 5 pts (anti octave-jumps)
  const med = pitches.slice();
  for (let i = 2; i < pitches.length - 2; i++) {
    const w = [pitches[i - 2], pitches[i - 1], pitches[i], pitches[i + 1], pitches[i + 2]].sort((a, b) => a - b);
    med[i] = w[2];
  }
  // Retourne aussi le hop en secondes pour la conversion temps→index
  return { frames: med, hopSec: hopLen / sr, totalDur };
}

// ═══════════════════════════════════════════════════════════════
// DENSITÉ DE PITCH VOISÉ — tableau normalisé [0..N_ENV]
// Utilisé pour pondérer la détection de syllabes
// ═══════════════════════════════════════════════════════════════
function buildVoicedDensity(pitchResult, nBuckets) {
  const { frames, hopSec, totalDur } = pitchResult;
  const density = new Float32Array(nBuckets);
  for (let f = 0; f < frames.length; f++) {
    if (frames[f] <= 0) continue;
    const t = f * hopSec / totalDur;           // 0..1
    const b = Math.min(nBuckets - 1, Math.floor(t * nBuckets));
    density[b] += 1;
  }
  // Normalise
  const maxD = Math.max(...density, 1);
  for (let i = 0; i < nBuckets; i++) density[i] /= maxD;
  return density;
}

// ═══════════════════════════════════════════════════════════════
// DÉTECTION DE SYLLABES (pitch-gated)
// ═══════════════════════════════════════════════════════════════
function detectSyllables(env, pitchResult) {
  const n = env.length;
  const voiced = buildVoicedDensity(pitchResult, n);

  // Lissage de l'énergie (double passe)
  const eSmooth = gaussSmooth(gaussSmooth(env, n * 0.025), n * 0.018);

  // Lissage de la densité voisée (fenêtre plus large → contexte voisé)
  const vSmooth = gaussSmooth(voiced, n * 0.04);

  // Score combiné : géométrique (les deux doivent être présents)
  // energy^0.5 * voiced^0.5 → pénalise fortement quand l'un est absent
  const combined = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    combined[i] = Math.sqrt(Math.max(0, eSmooth[i]) * Math.max(0, vSmooth[i]));
  }

  const globalMax = Math.max(...combined);
  if (globalMax < 1e-6) return [];

  const thr = globalMax * 0.18;
  const minGap = Math.max(5, Math.floor(n * 0.07)); // ≥7% du signal entre syllabes

  // Candidats avec prominence
  const candidates = [];
  for (let i = 3; i < n - 3; i++) {
    if (combined[i] < thr) continue;
    if (combined[i] <= combined[i - 1] || combined[i] <= combined[i + 1]) continue;
    if (combined[i] <= combined[i - 2] || combined[i] <= combined[i + 2]) continue;

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

  // NMS par prominence décroissante
  const peaks = [];
  for (const c of candidates.sort((a, b) => b.prom - a.prom)) {
    if (peaks.every(p => Math.abs(p.pos - c.pos) >= minGap)) peaks.push(c);
  }
  peaks.sort((a, b) => a.pos - b.pos);
  return peaks.map(p => p.pos / n); // positions normalisées 0→1
}

// ═══════════════════════════════════════════════════════════════
// INTONATION PAR SYLLABE
// ═══════════════════════════════════════════════════════════════
function computeIntonationPerSyllable(syllablePositions, pitchResult) {
  const { frames, hopSec, totalDur } = pitchResult;

  return syllablePositions.map(pos => {
    const tCenter = pos * totalDur;              // secondes
    const winSec = 0.10;                        // ±100ms
    const fStart = Math.max(0, Math.floor((tCenter - winSec) / hopSec));
    const fEnd = Math.min(frames.length - 1, Math.ceil((tCenter + winSec) / hopSec));

    // Frames voisées dans la fenêtre
    const voiced = [];
    for (let f = fStart; f <= fEnd; f++) {
      if (frames[f] > 50) voiced.push({ t: f - fStart, hz: frames[f] });
    }

    if (voiced.length < 4) return { pos, tone: 'flat', slopeST: 0 };

    // Régression linéaire (moindres carrés) sur les semitones
    // y = semitones par rapport à la médiane locale
    const REF = 150;
    const pts = voiced.map(v => ({ t: v.t, st: 12 * Math.log2(v.hz / REF) }));
    const n = pts.length;
    const mT = pts.reduce((s, p) => s + p.t, 0) / n;
    const mST = pts.reduce((s, p) => s + p.st, 0) / n;
    let num = 0, den = 0;
    for (const p of pts) { num += (p.t - mT) * (p.st - mST); den += (p.t - mT) ** 2; }
    const slope = den > 0 ? num / den : 0; // semitones / frame

    // Pente totale sur la durée de la fenêtre
    const totalSlope = slope * (fEnd - fStart);

    // Seuils : ±0.8 semitone de variation perceptible
    const tone = totalSlope > 0.8 ? 'up' : totalSlope < -0.8 ? 'down' : 'flat';
    return { pos, tone, slopeST: totalSlope };
  });
}

// ═══════════════════════════════════════════════════════════════
// SCORE PITCH (DTW sur contours mélodiques)
// ═══════════════════════════════════════════════════════════════
function resample(arr, n) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) * (arr.length - 1);
    const lo = Math.floor(t), hi = Math.min(lo + 1, arr.length - 1);
    out[i] = arr[lo] + (t - lo) * (arr[hi] - arr[lo]);
  }
  return out;
}

function scorePitch(pitchA, pitchB) {
  const REF = 150;
  const toSt = hz => hz > 50 ? 12 * Math.log2(hz / REF) : null;

  const vA = pitchA.frames.map(toSt).filter(v => v !== null);
  const vB = pitchB.frames.map(toSt).filter(v => v !== null);

  if (vA.length < 5 || vB.length < 5) return 0.50;

  const center = arr => { const m = arr.reduce((s, v) => s + v, 0) / arr.length; return arr.map(v => v - m); };
  const cA = center(vA), cB = center(vB);

  const N = 80;
  const rA = Array.from(resample(Float32Array.from(cA), N));
  const rB = Array.from(resample(Float32Array.from(cB), N));

  const dtw = Array.from({ length: N + 1 }, () => new Float32Array(N + 1).fill(Infinity));
  dtw[0][0] = 0;
  for (let i = 1; i <= N; i++) for (let j = 1; j <= N; j++) {
    const cost = Math.abs(rA[i - 1] - rB[j - 1]);
    dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
  }
  const dtwDist = dtw[N][N] / (2 * N);
  const rawScore = Math.max(0, 1 - dtwDist / 3.5);

  const vrA = vA.length / pitchA.frames.length;
  const vrB = vB.length / pitchB.frames.length;
  const vf = Math.min(vrA, vrB) / (Math.max(vrA, vrB) + 1e-10);

  return rawScore * (0.7 + 0.3 * vf);
}

// ═══════════════════════════════════════════════════════════════
// SCORE RYTHME (DTW sur IOI normalisés)
// ═══════════════════════════════════════════════════════════════
function scoreRhythm(posA, posB) {
  const nA = posA.length, nB = posB.length;
  if (nA === 0 || nB === 0) return 0.50;

  const countFactor = Math.max(0.60, 1 - Math.abs(nA - nB) / Math.max(nA, nB) * 0.5);
  if (nA < 2 || nB < 2) return 0.55 * countFactor;

  const ioiOf = pos => {
    const ioi = pos.slice(1).map((v, i) => v - pos[i]);
    const sum = ioi.reduce((a, b) => a + b, 0);
    return sum > 0 ? ioi.map(v => v / sum) : ioi;
  };
  const ioiA = ioiOf(posA), ioiB = ioiOf(posB);
  const la = ioiA.length, lb = ioiB.length;
  const dp = Array.from({ length: la + 1 }, () => new Float32Array(lb + 1).fill(Infinity));
  dp[0][0] = 0;
  for (let i = 1; i <= la; i++) for (let j = 1; j <= lb; j++) {
    const cost = Math.abs(ioiA[i - 1] - ioiB[j - 1]);
    dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  }
  const dtwDist = dp[la][lb] / Math.max(la, lb);
  const ioiScore = Math.max(0, 1 - dtwDist * 4);
  return ioiScore * countFactor;
}

// ═══════════════════════════════════════════════════════════════
// DÉTECTION D'ONSET ET TRIM DE SILENCE
// ═══════════════════════════════════════════════════════════════
async function trimSilence(blob) {
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(await blob.arrayBuffer());
  const sr = decoded.sampleRate;
  const nCh = decoded.numberOfChannels;
  const N = decoded.length;

  // Mixage mono pour le calcul d'onset (plus rapide, inutile de traiter chaque canal)
  const mono = new Float32Array(N);
  for (let c = 0; c < nCh; c++) {
    const d = decoded.getChannelData(c);
    for (let i = 0; i < N; i++) mono[i] += d[i] / nCh;
  }

  // ── Enveloppe RMS par fenêtres de ONSET_WIN_SEC ───────────────
  const winLen = Math.max(1, Math.floor(ONSET_WIN_SEC * sr));
  const nFrames = Math.ceil(N / winLen);
  const rms = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    const off = f * winLen;
    let sum = 0, cnt = 0;
    for (let i = off; i < Math.min(off + winLen, N); i++, cnt++) sum += mono[i] ** 2;
    rms[f] = Math.sqrt(sum / (cnt || 1));
  }

  // ── Seuil adaptatif : médiane du premier tiers + marge ────────
  const noiseFrames = rms.slice(0, Math.max(4, Math.floor(nFrames * 0.20)));
  const sorted = Float32Array.from(noiseFrames).sort();
  const noiseFloor = sorted[Math.floor(sorted.length * 0.75)]; // percentile 75
  const dynThresh = Math.max(SILENCE_THRESH, noiseFloor * 4);  // 4× le bruit de fond

  // ── Onset : première fenêtre d'un burst soutenu ───────────────
  let onsetFrame = -1;
  for (let f = 0; f < nFrames - ONSET_CONFIRM; f++) {
    let ok = true;
    for (let k = 0; k < ONSET_CONFIRM; k++) {
      if (rms[f + k] < dynThresh) { ok = false; break; }
    }
    if (ok) { onsetFrame = f; break; }
  }

  // Si rien détecté (silence total ?), comportement de secours
  if (onsetFrame < 0) onsetFrame = 0;

  // ── Calcul du start avec marge fixe PRE_SPEECH_SEC ───────────
  const onsetSample = onsetFrame * winLen;
  const start = Math.max(0, onsetSample - Math.round(PRE_SPEECH_SEC * sr));

  // ── Fin : dernier burst de parole ────────────────────────────
  let endFrame = nFrames - 1;
  for (let f = nFrames - 1; f >= 0; f--) {
    if (rms[f] >= dynThresh) { endFrame = f; break; }
  }
  const end = Math.min(N - 1, (endFrame + 1) * winLen + Math.round(TAIL_SEC * sr));

  // ── Découpe du buffer ─────────────────────────────────────────
  const newLen = end - start + 1;
  const buf = audioCtx.createBuffer(nCh, newLen, sr);
  for (let c = 0; c < nCh; c++) {
    buf.copyToChannel(decoded.getChannelData(c).slice(start, end + 1), c);
  }
  audioCtx.close();
  return { wav: bufferToWav(buf), buffer: buf };
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION BUFFER → WAV
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
