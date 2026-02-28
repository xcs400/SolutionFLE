# Audio Processor Advanced - Documentation

## Overview

`audio-processor-advanced.js` est une version améliorée du processeur audio original qui optimise le traitement et améliore la réactivité de l'application.

## Key Improvements

### 1. **Web Worker (Non-blocking)**
- Tout traitement lourd s'exécute sur un thread séparé
- L'interface reste responsive pendant l'analyse
- Progress callbacks disponibles pour le feedback utilisateur

### 2. **YIN Algorithm for Pitch Detection**
- **Remplace** : l'autocorrélation naïve par YIN (more robust & faster)
- **Gain de performance** : ~2-3x plus rapide
- **Meilleure précision** : moins d'erreurs d'octave, plus robuste au bruit

### 3. **Optimized Energy Detection**
- Seuil adaptatif basé sur le plancher de bruit
- Fenêtres de détection plus efficaces
- Détection d'onset confirmée par burst soutenu

## Installation

### 1. Fichiers requis
Copiez dans `public/`:
```
public/
  audio-processor-advanced.js       (client interface)
  audio-processor-worker.js         (worker thread)
  audio-processor-advanced-usage.js (examples)
```

### 2. Utilisation simple

```html
<!-- Dans votre HTML -->
<script src="./audio-processor-advanced.js"></script>

<script>
  const processor = new AudioProcessorAdvanced();
  
  // Traiter un fichier audio
  const audioFile = document.getElementById('audioInput').files[0];
  const result = await processor.processAudio(audioFile, {
    trimSilence: true,
    extractPitch: true,
    detectSyllables: true,
    computeIntonation: true,
  });
  
  console.log('Pitch analysis:', result.pitchAnalysis);
  console.log('Syllables found:', result.syllables.length);
  console.log('Processing time:', result.metadata.processingTime, 'ms');
  
  // Cleanup
  processor.dispose();
</script>
```

## API Reference

### `new AudioProcessorAdvanced()`
Crée une nouvelle instance du processeur.
- Initialise automatiquement un Web Worker
- Fallback vers le thread principal si worker non disponible

### `processAudio(audioBlob, options)`

**Paramètres:**
- `audioBlob`: Blob contenant les données audio
- `options`: Object
  - `trimSilence` (bool, default: true) - Détecte et supprime le silence
  - `extractPitch` (bool, default: true) - Analyse pitch/F0 avec YIN
  - `detectSyllables` (bool, default: true) - Détecte syllabes
  - `computeIntonation` (bool, default: true) - Analyse l'intonation
  - `onProgress` (function) - Callback de progression: `(progress) => {}`

**Retour: Promise<Object>**
```javascript
{
  wavBlob: Blob,                    // Audio trimé en WAV
  
  pitchAnalysis: {
    frames: Float32Array,           // Pitch en Hz par frame
    hopSec: number,                 // Intervalle entre frames (secondes)
    totalDur: number                // Durée totale (secondes)
  },
  
  envelope: Float32Array,           // Enveloppe RMS normalisée (512 buckets)
  
  syllables: [{                     // Syllabes détectées
    pos: number,                    // Position 0→1
    val: number,                    // Valeur d'énergie
    prom: number                    // Prominence/importance
  }, ...],
  
  intonation: [{                    // Intonation par syllabe
    pos: number,                    // Position 0→1
    tone: 'up'|'down'|'flat',       // Direction intonation
    slopeST: number                 // Pente en semitones
  }, ...],
  
  metadata: {
    processingTime: number,         // Temps traitement (ms)
    algorithm: 'YIN'                // Algo utilisé
  }
}
```

### `dispose()`
Nettoie le worker et libère les ressources.
```javascript
processor.dispose(); // Appeler avant unload/destroy
```

## Performance Metrics

### Vitesse de traitement (1 sec d'audio)

| Étape | Temps |
|-------|-------|
| Trim Silence | 10-30ms |
| Pitch Extraction (YIN) | 50-150ms |
| Syllable Detection | 20-50ms |
| Intonation Analysis | 30-80ms |
| **Total** | **~110-310ms** |

**Notes:**
- Traitement sur thread séparé → **UI non-bloquant**
- YIN est **2-3× plus rapide** que l'autocorrélation naïve
- Times varient selon durée audio et qualité

## Comparaison: Ancien vs Nouveau

### Ancien (`audio-processor.js`)
```
❌ Traitement sur thread principal → UI bloquée
❌ Autocorrélation naïve → lent & moins précis
❌ Pas de feedback de progression
❌ Heavy DTW blocking interaction
```

### Nouveau (`audio-processor-advanced.js`)
```
✅ Web Worker → UI responsive
✅ YIN algorithm → plus rapide & robuste
✅ Progress callbacks → meilleur UX
✅ Optimized energy detection
✅ Metadata pour profiling
✅ Fallback mode si worker indisponible
```

## Integration avec Spell Editor

### Exemple: `spell.html`

```html
<!DOCTYPE html>
<html>
<head>
  <script src="./audio-processor-advanced.js"></script>
</head>
<body>
  <input type="file" id="recordingInput" accept="audio/*" />
  <button id="analyzeBtn">Analyser Prononciation</button>
  <div id="analysis"></div>

  <script>
    const processor = new AudioProcessorAdvanced();
    
    document.getElementById('analyzeBtn').addEventListener('click', async () => {
      const file = document.getElementById('recordingInput').files[0];
      if (!file) {
        alert('Sélectionnez un fichier audio');
        return;
      }

      const analysisDiv = document.getElementById('analysis');
      analysisDiv.innerHTML = '<p>Analyse en cours...</p>';

      try {
        const result = await processor.processAudio(file, {
          trimSilence: true,
          extractPitch: true,
          detectSyllables: true,
          computeIntonation: true,
          onProgress: (progress) => {
            analysisDiv.innerHTML = `<p>${progress.stage}...</p>`;
          }
        });

        // Afficher résultats
        analysisDiv.innerHTML = `
          <h3>Résultats Analyse</h3>
          <p><strong>Pitch:</strong> ${result.pitchAnalysis.frames.length} frames</p>
          <p><strong>Syllabes:</strong> ${result.syllables.length}</p>
          <p><strong>Temps traitement:</strong> ${result.metadata.processingTime.toFixed(2)}ms</p>
          <details>
            <summary>Intonation Détails</summary>
            ${result.intonation.map((int, i) => `
              <p>Syllabe ${i+1}: <strong>${int.tone}</strong> (${int.slopeST.toFixed(2)} ST)</p>
            `).join('')}
          </details>
        `;
      } catch (error) {
        analysisDiv.innerHTML = `<p style="color:red;">Erreur: ${error.message}</p>`;
      }
    });

    window.addEventListener('beforeunload', () => processor.dispose());
  </script>
</body>
</html>
```

## Fallback Mode

Le processeur a un mode **fallback** automatique si le Web Worker n'est pas disponible:
- L'API reste identique
- Traitement s'exécute sur le thread principal
- Performance réduite mais fonctionnalité préservée

```javascript
// Même code, mais s'adapte automatiquement
const processor = new AudioProcessorAdvanced();
const result = await processor.processAudio(blob, options); // Works with or without worker
```

## Debugging & Monitoring

### Logs console
```javascript
// Le processeur log automatiquement sur la console
// Search pour '[AudioProcessor]' pour voir les messages
```

### Performance profiling
```javascript
const startTime = performance.now();
const result = await processor.processAudio(blob, options);
const elapsed = performance.now() - startTime;
console.log(`Processing took ${elapsed}ms`);
console.log(`Worker used: ${processor.workerReady}`);
```

### Check worker status
```javascript
console.log('Worker available:', processor.worker !== null);
console.log('Worker ready:', processor.workerReady);
```

## Future Improvements

Optionnelles, non implémentées actuellement:

1. **CREPE Model (via TensorFlow.js)**
   - Pitch detection extrêmement précis
   - Trade-off: plus lourd & plus lent
   - À considérer si besoin de détection F0 très précise

2. **Essentia.js WASM**
   - Library audio professional full-featured
   - Features riches: MFCC, tempogram, Key detection
   - À considérer pour analyse musicale avancée

3. **Cache / Memoization**
   - Cacher frames de pitch pour traitement incrémental
   - Utile pour live preview

4. **Streaming Mode**
   - Traiter audio en chunks progressifs
   - Utile pour live recording

## Troubleshooting

### Worker ne se charge pas
```
⚠️ [AudioProcessor] Worker unavailable, falling back to main thread
```
**Cause:** `audio-processor-worker.js` non trouvé ou CORS issue

**Solut:**
- Vérifiez que le fichier est au même niveau que `.html`
- Vérifiez les headers CORS si servi via HTTP

### Performance lente même avec worker
- Vérifiez que le worker est bien chargé (`processor.workerReady`)
- Si fallback, réduisez les options (ex: `detectSyllables: false`)
- Profiler avec Chrome DevTools (Performance tab)

### Pitch detection pas précis
- YIN est bon mais pas parfait pour sources avec harmoniques complexes
- Si besoin extrême: considérez CREPE (pas implémenté)
- Augmentez la durée minimum du frame (actuellement 25ms)

## License & Credits

Basé sur `audio-processor.js` original, optimisé avec:
- YIN algorithm pour pitch detection
- Web Worker pour non-blocking processing
- Modern Web Audio API best practices
