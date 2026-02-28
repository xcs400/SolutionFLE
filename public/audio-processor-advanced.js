// ═══════════════════════════════════════════════════════════════
// AUDIO PROCESSOR ADVANCED - Client interface (v2)
// Déléguée au Web Worker pour meilleure réactivité
// ═══════════════════════════════════════════════════════════════

class AudioProcessorAdvanced {
  constructor() {
    this.worker = null;
    this.workerReady = false;
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.initWorker();
  }

  initWorker() {
    try {
      this.worker = new Worker('./audio-processor-worker.js');
      this.worker.onmessage = (e) => this.handleWorkerMessage(e);
      this.worker.onerror = (e) => {
        console.error('[AudioProcessor] Worker error:', e.message);
      };
      this.workerReady = true;
    } catch (err) {
      console.warn('[AudioProcessor] Worker unavailable, falling back to main thread:', err.message);
      this.worker = null;
    }
  }

  handleWorkerMessage(e) {
    const { id, type, data, error } = e.data;
    const request = this.pendingRequests.get(id);
    
    if (!request) return;
    
    if (error) {
      request.reject(new Error(error));
    } else if (type === 'complete') {
      request.resolve(data);
    } else if (type === 'progress') {
      request.onProgress?.(data);
    }
    
    if (type === 'complete' || error) {
      this.pendingRequests.delete(id);
    }
  }

  async processAudio(audioBlob, options = {}) {
    if (!this.worker) {
      // Fallback: traiter en synchrone (bloquera le thread)
      console.warn('[AudioProcessor] No worker available, processing synchronously');
      return this.processAudioSync(audioBlob, options);
    }

    const id = ++this.requestId;
    const buffer = await audioBlob.arrayBuffer();
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, onProgress: options.onProgress });
      this.worker.postMessage(
        {
          id,
          type: 'process',
          audioBuffer: buffer,
          options: {
            trimSilence: options.trimSilence ?? true,
            extractPitch: options.extractPitch ?? true,
            detectSyllables: options.detectSyllables ?? true,
            computeIntonation: options.computeIntonation ?? true,
          },
        },
        [buffer] // transfert de propriété du buffer
      );
    });
  }

  // Fallback synchrone (déprécié, plus lent)
  async processAudioSync(audioBlob, options = {}) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(await audioBlob.arrayBuffer());
    
    const trimmed = await this.trimSilenceSync(decoded);
    const pitchResult = this.extractPitchYINSync(trimmed);
    const env = this.computeEnvRMSSync(trimmed);
    const syllables = this.detectSyllablesSync(env, pitchResult);
    const intonation = this.computeIntonationPerSyllableSync(syllables.map(s => s.pos), pitchResult);

    audioCtx.close();
    
    return {
      wavBlob: trimmed.wav,
      pitchAnalysis: pitchResult,
      envelope: env,
      syllables,
      intonation,
    };
  }

  // Méthodes synchrones de fallback (partagées avec le worker pour cohérence)
  async trimSilenceSync(buffer) {
    const SILENCE_THRESH = 0.025;
    const ONSET_WIN_SEC = 0.015;
    const ONSET_CONFIRM = 3;
    const PRE_SPEECH_SEC = 0.20;
    const TAIL_SEC = 0.12;

    const sr = buffer.sampleRate;
    const nCh = buffer.numberOfChannels;
    const N = buffer.length;

    const mono = new Float32Array(N);
    for (let c = 0; c < nCh; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < N; i++) mono[i] += d[i] / nCh;
    }

    const winLen = Math.max(1, Math.floor(ONSET_WIN_SEC * sr));
    const nFrames = Math.ceil(N / winLen);
    const rms = new Float32Array(nFrames);
    for (let f = 0; f < nFrames; f++) {
      const off = f * winLen;
      let sum = 0, cnt = 0;
      for (let i = off; i < Math.min(off + winLen, N); i++, cnt++) sum += mono[i] ** 2;
      rms[f] = Math.sqrt(sum / (cnt || 1));
    }

    const noiseFrames = rms.slice(0, Math.max(4, Math.floor(nFrames * 0.20)));
    const sorted = Array.from(noiseFrames).sort((a, b) => a - b);
    const noiseFloor = sorted[Math.floor(sorted.length * 0.75)];
    const dynThresh = Math.max(SILENCE_THRESH, noiseFloor * 4);

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

    const newLen = end - start + 1;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = audioCtx.createBuffer(nCh, newLen, sr);
    for (let c = 0; c < nCh; c++) {
      buf.copyToChannel(buffer.getChannelData(c).slice(start, end + 1), c);
    }
    audioCtx.close();

    return { wav: this.bufferToWavSync(buf), buffer: buf };
  }

  extractPitchYINSync(buffer) {
    // YIN: plus rapide et robuste que l'autocorrélation naïve
    const data = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    const frameLen = Math.floor(sr * 0.025); // 25 ms
    const hopLen = Math.floor(sr * 0.010);   // 10 ms
    const minF0 = 70, maxF0 = 500;
    const minLag = Math.floor(sr / maxF0);
    const maxLag = Math.floor(sr / minF0);
    const thr = 0.1; // YIN threshold
    const pitches = [];

    for (let start = 0; start + frameLen <= data.length; start += hopLen) {
      let energy = 0;
      for (let i = start; i < start + frameLen; i++) energy += data[i] * data[i];
      energy /= frameLen;
      if (energy < 0.0003) { pitches.push(0); continue; }

      // YIN d function
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

      // Find first minimum below threshold
      let bestLag = 0;
      for (let tau = minLag; tau < maxLag; tau++) {
        if (cumsum[tau] < thr) {
          bestLag = tau;
          break;
        }
      }

      // Si aucun trouvé, chercher le minimum global
      if (bestLag === 0) {
        let minVal = cumsum[minLag];
        for (let tau = minLag + 1; tau < maxLag; tau++) {
          if (cumsum[tau] < minVal) {
            minVal = cumsum[tau];
            bestLag = tau;
          }
        }
      }

      pitches.push(bestLag > 0 ? sr / bestLag : 0);
    }

    // Filtre médian 5 pts (anti octave-jumps)
    const med = pitches.slice();
    for (let i = 2; i < pitches.length - 2; i++) {
      const w = [pitches[i - 2], pitches[i - 1], pitches[i], pitches[i + 1], pitches[i + 2]].sort((a, b) => a - b);
      med[i] = w[2];
    }

    return { frames: med, hopSec: hopLen / sr, totalDur: buffer.duration };
  }

  computeEnvRMSSync(buffer) {
    const N_ENV = 512;
    const data = buffer.getChannelData(0);
    const bSz = Math.ceil(data.length / N_ENV);
    const env = new Float32Array(N_ENV);
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

  detectSyllablesSync(env, pitchResult) {
    // Simplifié pour fallback
    return [];
  }

  computeIntonationPerSyllableSync(syllablePositions, pitchResult) {
    return [];
  }

  bufferToWavSync(buffer) {
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

  // Nettoyage
  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Export commun
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioProcessorAdvanced;
}
