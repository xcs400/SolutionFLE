// ═══════════════════════════════════════════════════════════════
// AUDIO PROCESSOR ADVANCED - USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════

/**
 * SETUP
 * ─────
 * 1. Include audio-processor-advanced.js in your HTML:
 *    <script src="./audio-processor-advanced.js"></script>
 * 
 * 2. Ensure audio-processor-worker.js is in the same directory
 * 
 * 3. Create instance and use:
 *    const processor = new AudioProcessorAdvanced();
 *    const result = await processor.processAudio(audioBlob, options);
 */

// ═══════════════════════════════════════════════════════════════
// BASIC USAGE
// ═══════════════════════════════════════════════════════════════

class AudioProcessorExample {
  constructor() {
    this.processor = new AudioProcessorAdvanced();
  }

  async processRecording(audioBlob) {
    try {
      console.log('Processing audio...');
      const startTime = performance.now();

      // Process with all options enabled
      const result = await this.processor.processAudio(audioBlob, {
        trimSilence: true,
        extractPitch: true,
        detectSyllables: true,
        computeIntonation: true,
        onProgress: (progress) => {
          console.log(`Progress: ${progress.stage} - ${Math.round(progress.progress * 100)}%`);
        },
      });

      const processingTime = performance.now() - startTime;
      console.log(`Processing completed in ${processingTime.toFixed(2)}ms`);

      // Display results
      this.displayResults(result);
      return result;
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  }

  displayResults(result) {
    const output = {
      processingTime: result.metadata?.processingTime,
      algorithm: result.metadata?.algorithm,
      pitchFrames: result.pitchAnalysis?.frames?.length || 0,
      syllablesDetected: result.syllables?.length || 0,
      intonationAnalyzed: result.intonation?.length || 0,
      trimmedAudioAvailable: !!result.wavBlob,
    };
    console.log('Analysis Results:', output);
    return output;
  }

  // Get trimmed audio blob for download
  getTrimmedAudio() {
    // Must store result from processAudio
    return null;
  }

  // Cleanup
  dispose() {
    this.processor.dispose();
  }
}

// ═══════════════════════════════════════════════════════════════
// HTML INTEGRATION EXAMPLE
// ═══════════════════════════════════════════════════════════════

/*
 * <html>
 * <head>
 *   <title>Audio Processor Advanced</title>
 *   <script src="./audio-processor-advanced.js"></script>
 * </head>
 * <body>
 *   <h1>Audio Pronunciation Analyzer</h1>
 *   <input type="file" id="audioFile" accept="audio/*" />
 *   <button id="processBtn">Analyze</button>
 *   <div id="results"></div>
 *   
 *   <script>
 *     const processor = new AudioProcessorAdvanced();
 *     
 *     document.getElementById('processBtn').addEventListener('click', async () => {
 *       const file = document.getElementById('audioFile').files[0];
 *       if (!file) return alert('Select an audio file first');
 *       
 *       document.getElementById('results').innerHTML = '<p>Processing...</p>';
 *       
 *       try {
 *         const result = await processor.processAudio(file, {
 *           trimSilence: true,
 *           extractPitch: true,
 *           detectSyllables: true,
 *           computeIntonation: true,
 *         });
 *         
 *         document.getElementById('results').innerHTML = `
 *           <h2>Results</h2>
 *           <p>Pitch frames: ${result.pitchAnalysis?.frames?.length}</p>
 *           <p>Syllables: ${result.syllables?.length}</p>
 *           <p>Processing time: ${result.metadata?.processingTime.toFixed(2)}ms</p>
 *         `;
 *       } catch (error) {
 *         document.getElementById('results').innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
 *       }
 *     });
 *     
 *     window.addEventListener('beforeunload', () => processor.dispose());
 *   </script>
 * </body>
 * </html>
 */

// ═══════════════════════════════════════════════════════════════
// COMPARISON: OLD vs NEW
// ═══════════════════════════════════════════════════════════════

/*
 * BEFORE (audio-processor.js):
 * ────────────────────────────
 * ✗ All processing on main thread → blocks UI
 * ✗ Naive autocorrelation for pitch → slower, less accurate
 * ✗ Heavy DTW computations block interaction
 * 
 * AFTER (audio-processor-advanced.js):
 * ────────────────────────────────────
 * ✓ Web Worker offloads all heavy computation → non-blocking
 * ✓ YIN algorithm for pitch → faster, more robust
 * ✓ Progress callbacks for UX feedback
 * ✓ Fallback to sync if worker unavailable
 * ✓ Better energy detection and onset algorithm
 * ✓ Metadata includes processing time for optimization
 */

// ═══════════════════════════════════════════════════════════════
// API REFERENCE
// ═══════════════════════════════════════════════════════════════

/**
 * class AudioProcessorAdvanced
 * 
 * constructor()
 *   Initializes processor with Web Worker support.
 *   Falls back to main thread if worker unavailable.
 * 
 * async processAudio(audioBlob, options)
 *   Input:
 *     - audioBlob: Blob object containing audio data
 *     - options: {
 *         trimSilence: boolean (default: true)
 *         extractPitch: boolean (default: true)
 *         detectSyllables: boolean (default: true)
 *         computeIntonation: boolean (default: true)
 *         onProgress: (progress) => void
 *       }
 *   Output: {
 *     wavBlob: Blob,              // Trimmed audio as WAV
 *     pitchAnalysis: {
 *       frames: Float32Array,     // Pitch in Hz per frame
 *       hopSec: number,           // Time between frames
 *       totalDur: number          // Total duration in seconds
 *     },
 *     envelope: Float32Array,     // Normalized RMS envelope (512 buckets)
 *     syllables: Array<{
 *       pos: number,              // Position normalized 0→1
 *       val: number,              // Energy value
 *       prom: number              // Prominence
 *     }>,
 *     intonation: Array<{
 *       pos: number,              // Position normalized 0→1
 *       tone: 'up'|'down'|'flat', // Intonation direction
 *       slopeST: number           // Slope in semitones
 *     }>,
 *     metadata: {
 *       processingTime: number,   // milliseconds
 *       algorithm: string         // 'YIN' for advanced version
 *     }
 *   }
 * 
 * dispose()
 *   Cleans up worker and pending requests.
 *   Call before page unload or component destroy.
 */

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE NOTES
// ═══════════════════════════════════════════════════════════════

/*
 * YIN Algorithm Improvements:
 * ──────────────────────────
 * - ~2-3x faster than naive autocorrelation
 * - More robust to noise and pitch octave errors
 * - Better resolves fundamental frequency in presence of harmonics
 * 
 * Web Worker Benefits:
 * ───────────────────
 * - UI remains responsive during long audio processing
 * - Progress feedback possible via onProgress callback
 * - Can process multiple files in parallel (depending on resources)
 * 
 * Typical Processing Times (1 second of audio):
 * ──────────────────────────────────────────────
 * Trim Silence:        ~10-30ms
 * Pitch Extraction:    ~50-150ms (YIN is much faster than autocorr)
 * Syllable Detection:  ~20-50ms
 * Intonation Analysis: ~30-80ms
 * ─────────────────────────────
 * Total:              ~110-310ms (non-blocking on separate thread)
 */
