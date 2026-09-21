const gameArea = document.getElementById('game-area');
const timeDisplay = document.getElementById('time');
const scoreDisplay = document.getElementById('score');
const missclicksDisplay = document.getElementById('missclicks');
const sizeBtn = document.getElementById('size-btn');
const stopBtn = document.getElementById('stop-btn');
const modeSelect = document.getElementById('mode-select');
const modeDisplay = document.getElementById('mode-display');
const timeItem = document.getElementById('time-item');
const soundVolume = document.getElementById('sound-volume');
const volumeValue = document.getElementById('volume-value');
const soundStatus = document.getElementById('sound-status');
const soundOptions = document.querySelectorAll('.sound-option');
const resetSoundBtn = document.getElementById('reset-sound');

const soundUpload = document.getElementById('soundUploadBtn');

const toggleTargetBtn = document.getElementById('toggle-target');

const scrollPreventer = e => e.preventDefault();


let useAlternativeHitEffect = false;

// Initialisierung aus localStorage
if (localStorage.getItem('useAlternativeHitEffect') === 'true') {
  useAlternativeHitEffect = true;
}

const hitEffectPool = [];
const POOL_SIZE = 25;

function initHitEffectPool() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const effect = document.createElement('div');
    effect.className = 'hitEffect';
    effect.style.display = 'none';
    gameArea.appendChild(effect);
    hitEffectPool.push(effect);
  }
}



//show current sound
const fileNameSpan = document.getElementById('file-name');




soundUpload.addEventListener('change', function () {

  let name=null;
  if (this.files.length > 0) {
    
    name =this.files[0].name;
     
    if (name.length > 30) {
      name = name.slice(0, 27)+"...";
    }
    fileNameSpan.textContent = "Current sound: " +name;
  } else {
    fileNameSpan.textContent = "No sound uploaded";
  }
});






//worker varribles (position calc)
const positionWorker = new Worker('positionWorker.js');
const workerCallbacks = new Map();
let requestId = 0;






let mouseX = 0;
let mouseY = 0;

// Audio variables
let currentSound = 'classic';
let defaultSoundEnabled = true;
let volume = 0.5;
let customSound = null;
let audioContext = null; // Single audio context for the app

// Check if mobile device
let isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isSmallTouchDevice = (
  ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
  Math.min(window.innerWidth, window.innerHeight) <= 1024
);
if (isSmallTouchDevice)  isMobile = true;

// Adjust target sizes based on device
let sizes;
if (isMobile) {
  sizes = [40, 60, 80, 100];
} else {
  sizes = [50, 70, 100, 150];
}

// Sound presets
const soundPresets = {
  classic: { freq: 880, duration: 0.15 },
  beep: { freq: 440, duration: 0.1 },
  pop: { freq: 660, duration: 0.08 },
  laser: { freq: 1320, duration: 0.05 }
};

// Create single audio context on first interaction
function createAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log("AudioContext created");
  }
}

// Resume audio context if suspended
async function resumeAudioContext() {
  if (!audioContext) {
    createAudioContext();
  }
  
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
      console.log("AudioContext resumed");
    } catch (err) {
      console.error("Failed to resume AudioContext:", err);
    }
  }
}

// Initialize audio context on any user interaction
document.body.addEventListener('click', function() {
  if (!audioContext) {
    createAudioContext();
  }
});

// Also initialize when the page becomes visible
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && audioContext) {
    resumeAudioContext();
  }
});

// Hide file input on mobile
if (isMobile) {
  soundUpload.style.display = 'none';
}

// Load sound preference from localStorage if available
if (localStorage.getItem('aimTrainerSound')) {
  currentSound = localStorage.getItem('aimTrainerSound');
}

// Load volume setting
if (localStorage.getItem('aimTrainerVolume')) {
  volume = parseFloat(localStorage.getItem('aimTrainerVolume'));
  soundVolume.value = volume;
  volumeValue.textContent = Math.round(volume * 100) + '%';
}

// Set active sound button
function updateSoundButtons() {
  soundOptions.forEach(option => {
    if (option.dataset.sound === currentSound) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
}

// Volume control
soundVolume.addEventListener('input', () => {
  volume = parseFloat(soundVolume.value);
  volumeValue.textContent = Math.round(volume * 100) + '%';
  localStorage.setItem('aimTrainerVolume', volume);
});

// Toggle sound status
soundStatus.addEventListener('click', () => {
  defaultSoundEnabled = !defaultSoundEnabled;
  updateSoundStatus();
});

function updateSoundStatus() {
  if (defaultSoundEnabled) {
    soundStatus.textContent = "Sound: ON";
    soundStatus.className = "active";
  } else {
    soundStatus.textContent = "Sound: OFF";
    soundStatus.className = "inactive";
  }
}

// Handle sound file upload
soundUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    await resumeAudioContext();
    
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const arrayBuffer = e.target.result;
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        customSound = decodedBuffer;
        currentSound = 'custom';
        updateSoundButtons();
        playHitSound(); // Play preview of uploaded sound
      } catch (error) {
        console.error('Error decoding audio data', error);
        alert('Error loading audio file. Please try a different file.');
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (err) {
    console.error("Failed to initialize audio for upload:", err);
    alert("Audio initialization failed. Please interact with the page and try again.");
  }
});

// Sound effect function
async function playHitSound() {
  if (!defaultSoundEnabled || !audioContext) return;
  
  try {
    await resumeAudioContext();
    
    if (currentSound === 'custom' && customSound) {
      const source = audioContext.createBufferSource();
      source.buffer = customSound;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start();
    } else {
      const sound = soundPresets[currentSound];
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = sound.freq;
      gainNode.gain.value = volume * 0.3;
      
      oscillator.start();
      
      // Create a quick fade out
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + sound.duration);
      
      setTimeout(() => {
        oscillator.stop();
      }, sound.duration * 1000);
    }
  } catch (e) {
    console.log("Audio error:", e);
  }
}




//Toggle between hiteffects on/off
let disableHitteffect = true;
const hitOnOffBtn = document.getElementById('hitEffectOnOff');
document.getElementById('hitEffectOnOff')

function checkHitEffect(){
 if (disableHitteffect === false) {
  disableHitteffect = true;
   document.getElementById('hitEffectOnOff').innerText="Turn ON";
   hitOnOffBtn.style.background= "rgba(30, 255, 0, 0.4)"
   hitOnOffBtn.style.color= "rgb(0, 255, 0)"
   hitOnOffBtn.style.boxShadow= "0px 0px 5px green"
    document.documentElement.style.setProperty('--x','rgba(0, 255, 0, 1)');
  

 }
 else {
  disableHitteffect = false;
  document.getElementById('hitEffectOnOff').innerText="Turn OFF";
  hitOnOffBtn.style.background= "rgba(255, 0, 0, 0.4)"
  hitOnOffBtn.style.color= "rgb(255, 0, 0)"
  hitOnOffBtn.style.boxShadow= "0px 0px 5px red"
   document.documentElement.style.setProperty('--x','rgba(255, 0, 0, 1)');
 }


}
hitOnOffBtn.addEventListener("click", checkHitEffect)


// Create visual hit effect

function createHitEffect(x, y, size) {
  // Mindestgröße festlegen

 if(disableHitteffect) return;
  const minSize = 0;
  
  // Effektgröße berechnen (mindestens minSize)
  const effectSize = Math.max(minSize, size * 0.8);
  
  let effect = hitEffectPool.find(e => e.style.display === 'none');
  
  if (!effect && hitEffectPool.length <= 25) {
    effect = document.createElement('div');
    effect.style.display = 'none';
    gameArea.appendChild(effect);
    hitEffectPool.push(effect);
  }
  
  if (effect) {
    // Klasse basierend auf aktuellem Animationstyp setzen
    effect.className = useAlternativeHitEffect ? 'hitEffect2' : 'hitEffect';
    
    effect.style.left = `${x - effectSize/2}px`;
    effect.style.top = `${y - effectSize/2}px`;
    effect.style.width = `${effectSize}px`;
    effect.style.height = `${effectSize}px`;
    effect.style.display = 'block';
    
    // Animation zurücksetzen
    effect.style.animation = 'none';
    //void effect.offsetWidth;
    
    // Richtige Animation basierend auf Typ setzen
    if (useAlternativeHitEffect) {
      effect.style.animation = 'hitEffect2 0.3s ease-out forwards';
    } else {
      effect.style.animation = 'hitEffect 0.3s ease-out forwards';
    }
    
    setTimeout(() => {
      effect.style.display = 'none';
    }, 300);
  }
  
}

function toggleHitEffect() {
  useAlternativeHitEffect = !useAlternativeHitEffect;
  localStorage.setItem('useAlternativeHitEffect', useAlternativeHitEffect);
  updateHitEffectButton();
}

function updateHitEffectButton() {
  const btn = document.getElementById('toggle-hit-effect');
  if (btn) {
    btn.textContent = useAlternativeHitEffect 
      ? "Switch to Explosion" 
      : "Switch to Pulse";
  }
}

// Button-Event hinzufügen
document.getElementById('toggle-hit-effect').addEventListener('click', toggleHitEffect);











const roundTime = 60;


let timeLeft = roundTime;
let score = 0;
let missClicks = 0;

// Ändere die Initialisierung von bestScores
let bestScores = JSON.parse(localStorage.getItem('aimTrainerBestScores'));
if (bestScores === null){
     bestScores={
    single: 0,
    multi: 0,
    sniper: 0
     }
};

// Neue Modi in alten localStorage-Staenden nachpflegen
if (typeof bestScores.bounce !== 'number') bestScores.bounce = 0;
if (typeof bestScores.chaos !== 'number') bestScores.chaos = 0;




let intervalId = null;
let roundStarted = false;
let currentSizeIndex = isMobile ? 2 : 3;

let mode = 'single';
let targets = [];
let lastPositions = [];

// Metrics variables
let combo = 0;
let lastHitTime = 0;
let totalReactionTime = 0;
let accuracy = 0;
let avgReactionTime = 0;
let totalShots = 0;

const settings = {
  single: { count: 1, radius: isMobile ? 250 : 450 },
  multi: { count: 3, radius: isMobile ? 200 : 350 },
  sniper: { count: 2, radius: 'full' },
  bounce: { count: 1, radius: 'full', moving: true },
  chaos: { count: 3, radius: isMobile ? 200 : 350, moving: true, collisions: true }
};

// ===== Bewegte Targets (Bounce/Chaos) =====
// Position lebt in ballState und wird per transform (GPU) gesetzt,
// nicht per left/top - das kostet kein Layout pro Frame.
const ballState = new Map();
let ballRafId = null;
let ballLastTs = 0;

function isMovingMode() {
  return settings[mode].moving === true;
}

function ballSpeed() {
  const base = Math.min(gameArea.clientWidth, gameArea.clientHeight);
  return base * (mode === 'chaos' ? 0.22 : 0.30);
}

function randomVelocity() {
  const sp = ballSpeed();
  const ang = Math.random() * Math.PI * 2;
  return { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp };
}

function stopBallLoop() {
  if (ballRafId !== null) {
    cancelAnimationFrame(ballRafId);
    ballRafId = null;
  }
}

function startBallLoop() {
  if (ballRafId !== null || !isMovingMode()) return;
  ballLastTs = performance.now();
  ballRafId = requestAnimationFrame(ballLoop);
}

function ballLoop(ts) {
  ballRafId = requestAnimationFrame(ballLoop);
  const dt = Math.min((ts - ballLastTs) / 1000, 0.033); // Tab-Wechsel-Spruecke dämpfen
  ballLastTs = ts;
  const size = sizes[currentSizeIndex];
  const maxX = gameArea.clientWidth - size;
  const maxY = gameArea.clientHeight - size;

  for (const b of ballState.values()) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // Abprallen an den Raendern
    if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); }
    else if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx); }
    if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy); }
    else if (b.y > maxY) { b.y = maxY; b.vy = -Math.abs(b.vy); }
  }

  if (settings[mode].collisions) {
    resolveBallCollisions(size);
  }

  for (const [btn, b] of ballState) {
    btn.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0)`;
  }
}

// Elastischer Stoss gleicher Massen: Normalanteile der Geschwindigkeit
// werden getauscht, Baelle werden vorher auseinandergeschoben
function resolveBallCollisions(size) {
  const balls = [...ballState.values()];
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= size * size || distSq === 0) continue;
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;

      // Ueberlappung symmetrisch aufloesen
      const overlap = (size - dist) / 2;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;

      // Nur wenn sie sich annaehern
      const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (dvn > 0) {
        a.vx -= dvn * nx;
        a.vy -= dvn * ny;
        b.vx += dvn * nx;
        b.vy += dvn * ny;
      }
    }
  }
}



const MODE_NAMES = { single: 'Single', multi: 'Multi', sniper: 'Sniper', bounce: 'Bounce', chaos: 'Chaos' };

function updateDisplays() {
  scoreDisplay.textContent = score;
  missclicksDisplay.textContent = missClicks;
  timeDisplay.textContent = timeLeft;
  modeDisplay.textContent = MODE_NAMES[mode] || mode;

  document.getElementById('best-score-value').textContent = bestScores[mode];

  // Calculate and update accuracy
  accuracy = totalShots > 0 ? Math.round((score / totalShots) * 100) : 0;
  document.getElementById('accuracy').textContent = accuracy + '%';

  // Update combo
  document.getElementById('combo').textContent = combo;

  // Update average reaction time
  avgReactionTime = score > 0 ? (totalReactionTime / score) : 0;
  document.getElementById('avg-time').textContent = avgReactionTime.toFixed(2) + 's';

  // Add pulse animation to score chip when it changes
  scoreDisplay.parentElement.classList.remove('pulse');
  void scoreDisplay.parentElement.offsetWidth;
  scoreDisplay.parentElement.classList.add('pulse');

  // Flash time chip when below 10 seconds (only during a round)
  if (roundStarted && timeLeft < 11) {
    timeItem.style.animation = 'pulse 0.8s infinite';
    timeItem.style.background = 'rgba(255, 50, 50, 0.3)';
  } else {
    timeItem.style.animation = '';
    timeItem.style.background = '';
  }
}

//heavy calc in worker (setup)
// Web Worker Setup

positionWorker.onmessage = (e) => {
  const callback = workerCallbacks.get(e.data.id);
  if (callback) {
    e.data.error ? callback.reject(e.data.error) : callback.resolve(e.data.result);
    workerCallbacks.delete(e.data.id);
  }
};

positionWorker.onerror = (e) => {
  console.error('Worker error:', e);
  Array.from(workerCallbacks.values()).forEach(cb => cb.reject(new Error('Worker failed')));
  workerCallbacks.clear();
};

async function getRandomPosition(size) {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    workerCallbacks.set(id, { resolve, reject });
    positionWorker.postMessage({
      id,
      type: 'random',
      data: { 
        size,
        width: gameArea.offsetWidth,
        height: gameArea.offsetHeight
      }
    });
  });
}
async function getNonOverlappingPosition(size, existing, radius) {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    workerCallbacks.set(id, { resolve, reject });
    positionWorker.postMessage({
      id,
      type: 'non-overlapping',
      data: { 
        size, 
        existing, 
        radius,
        width: gameArea.offsetWidth,
        height: gameArea.offsetHeight
      }
    });
  });
}
// Sollte async sein, da sie auf Worker wartet
async function moveTargetToNewPosition(targetIndex) {
  const size = sizes[currentSizeIndex];
  const radius = settings[mode].radius;
  const btn = targets[targetIndex];

  // Existierende Positionen sammeln
  const existing = targets
    .filter((_, i) => i !== targetIndex)
    .map(t => ({
      left: parseFloat(t.style.left),
      top: parseFloat(t.style.top)
    }))
    .filter(pos => !isNaN(pos.left));

  // Worker für Positionierung nutzen
  let  pos = await getNonOverlappingPosition(size, existing, radius);

  // Neue Position setzen
  btn.classList.remove('pressed');
  const x = Math.max(0, Math.min(pos.left, gameArea.offsetWidth - size));
  const y = Math.max(0, Math.min(pos.top, gameArea.offsetHeight - size));

  if (isMovingMode()) {
    // Ball: Position in ballState, zufaellige neue Richtung
    const b = ballState.get(btn);
    if (b) {
      b.x = x;
      b.y = y;
      const v = randomVelocity();
      b.vx = v.vx;
      b.vy = v.vy;
    }
  } else {
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
  }
}

async function teleportAllTargets() {
    await new Promise(resolve => requestAnimationFrame(resolve));

  const size = sizes[currentSizeIndex];
  const radius = settings[mode].radius;
  lastPositions = [];

  // Container-Größe mit Schutz vor Null/negativ
  const width = Math.max(50, gameArea.offsetWidth);
  const height = Math.max(50, gameArea.offsetHeight);

  for (let i = 0; i < targets.length; i++) {
    try {
      const pos = await getNonOverlappingPosition(size, lastPositions, radius, width, height);
      lastPositions.push(pos);

      const x = Math.max(0, Math.min(pos.left, width - size));
      const y = Math.max(0, Math.min(pos.top, height - size));

      if (isMovingMode()) {
        targets[i].style.left = '0px';
        targets[i].style.top = '0px';
        const b = ballState.get(targets[i]);
        if (b) { b.x = x; b.y = y; }
      } else {
        targets[i].style.left = x + 'px';
        targets[i].style.top = y + 'px';
      }

    } catch (err) {
      console.error('Position error:', err);
      const pos = await getRandomPosition(size, width, height);
      lastPositions.push(pos);

      const x = Math.max(0, Math.min(pos.left, width - size));
      const y = Math.max(0, Math.min(pos.top, height - size));

      if (isMovingMode()) {
        targets[i].style.left = '0px';
        targets[i].style.top = '0px';
        const b = ballState.get(targets[i]);
        if (b) { b.x = x; b.y = y; }
      } else {
        targets[i].style.left = x + 'px';
        targets[i].style.top = y + 'px';
      }
    }
  }
}

async function createTargets() {
  // Alte Targets entfernen
  stopBallLoop();
  ballState.clear();
  targets.forEach(t => {
    if (t.parentNode === gameArea) {
      gameArea.removeChild(t);
    }
  });
  targets = [];

  const count = settings[mode].count;
  const size = sizes[currentSizeIndex];

  // Neue Targets erstellen
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.className = useImageTarget ? 'target image-mode' : 'target red-mode';
    if (isMovingMode()) {
      btn.classList.add('moving');
      btn.style.left = '0px';
      btn.style.top = '0px';
    }
    btn.style.width = `${size}px`;
    btn.style.height = `${size}px`;
    btn.dataset.index = i; // WICHTIG: Index speichern

    // Event-Listener mit korrektem Index-Closure
    const handleClick = (e) => {
      handleTargetClick(e, btn, size, i); // i wird korrekt gebunden
    };

    // Press = visuelles Feedback (pressed class), Release = Hit zählt
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      // Capture: pointerup kommt immer am Button an, auch wenn der
      // Ball unter dem Finger/Zeiger wegbewegt wird
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    });

    const release = (e) => {
      if (!btn.classList.contains('pressed')) return;
      btn.classList.remove('pressed');
      // Nur treffen, wenn der Finger/Zeiger beim Loslassen noch auf dem Target ist
      const r = btn.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top && e.clientY <= r.bottom) {
        handleClick(e);
      }
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', () => btn.classList.remove('pressed'));
    btn.addEventListener('pointercancel', () => btn.classList.remove('pressed'));

    // preventDefault auf pointerdown unterdrückt NICHT den nachfolgenden
    // Click-Event -> würde als Missclick auf gameArea zählen. Schlucken.
    btn.addEventListener('click', (e) => e.stopPropagation());

    gameArea.appendChild(btn);
    targets.push(btn);
  }

  await new Promise(resolve => requestAnimationFrame(resolve));
  await teleportAllTargets();

  // Baelle initialisieren und Animationsloop starten
  if (isMovingMode()) {
    targets.forEach((btn, i) => {
      const pos = lastPositions[i] || { left: 0, top: 0 };
      const v = randomVelocity();
      ballState.set(btn, { x: pos.left, y: pos.top, vx: v.vx, vy: v.vy });
      btn.style.transform = `translate3d(${Math.round(pos.left)}px, ${Math.round(pos.top)}px, 0)`;
    });
    startBallLoop();
  }

  updateTargetAppearance();
}
// handleTargetClick kann synchron bleiben
function handleTargetClick(e, btn, size, index) {
  e.stopPropagation();
  playHitSound();

  // Synchroner Teil
  const rect = btn.getBoundingClientRect();
  const areaRect = gameArea.getBoundingClientRect();
  createHitEffect(
    rect.left - areaRect.left + size/2,
    rect.top - areaRect.top + size/2,
    size
  );

  // Asynchronen Teil starten
  moveTargetToNewPosition(index).then(() => {
    if (!roundStarted) {
      startRound();
    }
    // Erster Treffer startet die Runde UND zaehlt als Hit
    score++;
    totalShots++;
    combo++;
    const now = Date.now();
    if (lastHitTime > 0) {
      totalReactionTime += (now - lastHitTime) / 1000;
    }
    lastHitTime = now;
    updateDisplays();
  });
}

function startRound() {
   document.addEventListener('touchmove', scrollPreventer, { passive: false });
  document.body.style.overflow = 'hidden'; 
  document.documentElement.style.overflow =='hidden';

  document.body.style.position = 'fixed';
  document.body.style.width = '100%';

  if (roundStarted) return;
  roundStarted = true;

  timeLeft = roundTime;
  score = 0;
  missClicks = 0;
  totalShots = 0;
  
  // Reset metrics
  combo = 0;
  lastHitTime = 0;
  totalReactionTime = 0;
  accuracy = 0;
  avgReactionTime = 0;
  
  updateDisplays();

  intervalId = setInterval(() => {
    timeLeft--;
    updateDisplays();

    if (timeLeft <= 0) {
      endRound();
    }
  }, 1000);
}


function endRound() {
  document.removeEventListener('touchmove', scrollPreventer, { passive: false });
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto'; // Fix: == zu = geändert
  document.body.style.position = 'static';
  
  clearInterval(intervalId);
  intervalId = null;
  roundStarted = false;

  let finalScore = score - missClicks;
  if (finalScore < 0) finalScore = 0;

  // Alert nur anzeigen wenn nicht 0 Punkte
  if (score > 0 || missClicks > 0) {
    alert(`Round over! 
Score: ${score} 
Missclicks: ${missClicks}
Final score: ${finalScore}
Accuracy: ${accuracy}% 
Avg. Time: ${avgReactionTime.toFixed(2)}s`);
  }

  if (finalScore > bestScores[mode]) {
      bestScores[mode] = finalScore;
      localStorage.setItem('aimTrainerBestScores', JSON.stringify(bestScores));
       if (finalScore > 0) alert('New Best Score! in ' + mode + " | " + bestScores[mode]);
  }
  
  updateDisplays();
}

// Missclicks einheitlich fuer Maus UND Touch: nur wenn der Press direkt
// auf der leeren Flaeche startet. Keine Click-Listener mehr - der
// synthetische Mobile-Click landet nach dem Wegteleportieren des Targets
// auf gameArea und wuerde jeden Hit faelschlich als Missclick zaehlen.
gameArea.addEventListener('pointerdown', (e) => {
  if (roundStarted && e.target === gameArea) {
    missClicks++;
    totalShots++;
    combo = 0;
    updateDisplays();
  }
});

// NEU: Mausposition verfolgen
gameArea.addEventListener('mousemove', (e) => {
  const rect = gameArea.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

// NEU: Funktion zum Simulieren eines Klicks
function simulateMouseClick() {
  const element = document.elementFromPoint(mouseX + gameArea.getBoundingClientRect().left, 
                                          mouseY + gameArea.getBoundingClientRect().top);
  
  if (element && element.classList.contains('target')) {
    const index = targets.indexOf(element);
    if (index !== -1) {
      const size = parseInt(element.style.width);
      const simulatedEvent = {
        stopPropagation: () => {},
        type: 'click'
      };
      handleTargetClick(simulatedEvent, element, size, index);
    }
  } else if (roundStarted) {
    missClicks++;
    totalShots++;
    combo = 0;
    updateDisplays();
  }
}

// NEU: Tastatur-Event-Listener
document.addEventListener('keydown', (e) => {
  const allowedKeys = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ü', 'ö', 'ä', 'ß']);
  
  if (allowedKeys.has(e.key.toLowerCase())) {
    simulateMouseClick();
  }
});









sizeBtn.addEventListener('click', async () => {
  currentSizeIndex = (currentSizeIndex + 1) % sizes.length;
  const size = sizes[currentSizeIndex];
  // Update target sizes
  targets.forEach(target => {
    target.style.width = size + 'px';
    target.style.height = size + 'px';
  });
 
  await createTargets();
  updateDisplays();
});








modeSelect.addEventListener('change', async () => {
  if (roundStarted) {
    endRound();
  }
  mode = modeSelect.value;
  await createTargets();
  updateDisplays();
});

stopBtn.addEventListener('click', () => {
  if (roundStarted) {
    endRound();
  }
});

// Big play-area toggle: game area fills the screen below the slim header, controls hidden
const fullscreenBtn = document.getElementById('fullscreen-btn');

fullscreenBtn.addEventListener('click', async () => {
  document.body.classList.toggle('big-mode');
  await teleportAllTargets();
});

// Sound selector functionality
soundOptions.forEach(option => {
  option.addEventListener('click', () => {
    currentSound = option.dataset.sound;
    localStorage.setItem('aimTrainerSound', currentSound);
    updateSoundButtons();
    playHitSound();
  });
  updateDisplays();
});

// Reset sound to default
resetSoundBtn.addEventListener('click', () => {
  currentSound = 'classic';
  customSound = null;
  soundUpload.value = '';
  localStorage.setItem('aimTrainerSound', currentSound);
  updateSoundButtons();
  playHitSound();
});

// Toggle target between image and red
let useImageTarget = false;
if (localStorage.getItem('useImageTarget') === 'true') {
    useImageTarget = true;
}

// Adjustable target color (red mode)
let targetColor = localStorage.getItem('aimTrainerTargetColor') || '#ff0000';
const targetColorInput = document.getElementById('target-color');

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function applyTargetColor() {
  const { r, g, b } = hexToRgb(targetColor);
  const root = document.documentElement.style;
  root.setProperty('--target-color', targetColor);
  root.setProperty('--target-border', `rgb(${Math.round(r * 0.72)}, ${Math.round(g * 0.72)}, ${Math.round(b * 0.72)})`);

  // Hit effects folgen der Target-Farbe (nur im Red-Mode)
  if (!useImageTarget) {
    root.setProperty('--hit-effect-color', `rgba(${r}, ${g}, ${b}, 0.73)`);
    root.setProperty('--hit-effect-color-start', `rgba(${r}, ${g}, ${b}, 0.3)`);
    root.setProperty('--hit-effect-color-20', `rgba(${r}, ${g}, ${b}, 0.7)`);
    root.setProperty('--hit-effect-color-70', `rgba(${r}, ${g}, ${b}, 0.3)`);
    root.setProperty('--hit-effect-color-80', `rgba(${r}, ${g}, ${b}, 0.0)`);
    root.setProperty('--hit-effect-color-85', `rgba(${r}, ${g}, ${b}, 0.1)`);
    root.setProperty('--hit-effect-color-100', `rgba(${r}, ${g}, ${b}, 0.2)`);
    root.setProperty('--hit-effect2', `rgb(${r}, ${g}, ${b})`);
  }
}

targetColorInput.addEventListener('input', () => {
  targetColor = targetColorInput.value;
  localStorage.setItem('aimTrainerTargetColor', targetColor);
  applyTargetColor();
});

// Light/Dark mode
const themeBtn = document.getElementById('theme-btn');
let theme = localStorage.getItem('aimTrainerTheme') || 'dark';

function applyTheme() {
  document.body.dataset.theme = theme;
  document.getElementById('icon-sun').style.display = theme === 'dark' ? 'block' : 'none';
  document.getElementById('icon-moon').style.display = theme === 'dark' ? 'none' : 'block';
}

themeBtn.addEventListener('click', () => {
  theme = (theme === 'dark') ? 'light' : 'dark';
  localStorage.setItem('aimTrainerTheme', theme);
  applyTheme();
});


function updateTargetAppearance() {
    // Update target classes
    targets.forEach(target => {
        if (useImageTarget) {
            target.classList.add('image-mode');
            target.classList.remove('red-mode');
        } else {
            target.classList.add('red-mode');
            target.classList.remove('image-mode');
        }
    });

    // Update hit effect colors using CSS variables
    if (useImageTarget) {
        // Orange/Braun für Image-Modus
        document.documentElement.style.setProperty('--hit-effect-color', 'rgba(194, 103, 0, 0.8)');
        document.documentElement.style.setProperty('--hit-effect-color-start', 'rgba(194, 103, 0, 0.6)');
        document.documentElement.style.setProperty('--hit-effect-color-20', 'rgba(194, 103, 0, 0.7)');
        document.documentElement.style.setProperty('--hit-effect-color-70', 'rgba(194, 103, 0, 0.3)');
        document.documentElement.style.setProperty('--hit-effect-color-80', 'rgba(194, 103, 0, 0.0)');
        document.documentElement.style.setProperty('--hit-effect-color-85', 'rgba(194, 103, 0, 0.1)');
        document.documentElement.style.setProperty('--hit-effect-color-100', 'rgba(194, 103, 0, 0.2)');

        document.documentElement.style.setProperty('--hit-effect2','rgb(194, 103, 0)');


    } else {
        // Red-Mode: Farben aus der waehlbaren Target-Farbe ableiten
        applyTargetColor();
    }

    toggleTargetBtn.textContent = useImageTarget ? "Switch to Red" : "Switch to Image";
}

toggleTargetBtn.addEventListener('click', function() {
    useImageTarget = !useImageTarget;
    localStorage.setItem('useImageTarget', useImageTarget);
    updateTargetAppearance();
});



// Initialize

window.addEventListener('resize', () => {
  teleportAllTargets();
});

window.addEventListener('orientationchange', () => {
  setTimeout(teleportAllTargets(), 100);
});

// Initialize game

async function initGame() {

if (isMobile) {
  
  // Add these lines to hide the label and file name text
  document.querySelector('label[for="soundUploadBtn"]').style.display = 'none';
  document.getElementById('file-name').style.display = 'none';
}


  await createTargets();
  updateDisplays();
  updateSoundStatus();
  updateSoundButtons();
  modeSelect.value = mode;
  targetColorInput.value = targetColor;
  applyTheme();
  createAudioContext();
  initHitEffectPool();
  updateTargetAppearance();
  updateHitEffectButton(); // Button-Text initialisieren
  checkHitEffect();
}

initGame();

