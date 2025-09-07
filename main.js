const gameArea = document.getElementById('game-area');
const timeDisplay = document.getElementById('time');
const scoreDisplay = document.getElementById('score');
const missclicksDisplay = document.getElementById('missclicks');
const bestScoreDisplay = document.getElementById('best-score');
const sizeBtn = document.getElementById('size-btn');
const stopBtn = document.getElementById('stop-btn');
const modeBtn = document.getElementById('mode-btn');
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
  sniper: { count: 2, radius: 'full' }
};



// Ersetze die bestehende updateDisplays-Funktion (Zeile ~190)
function updateDisplays() {
  scoreDisplay.textContent = score;
  missclicksDisplay.textContent = missClicks;
  timeDisplay.textContent = timeLeft;
  modeDisplay.textContent = 
    mode === 'single' ? 'Single' : 
    mode === 'multi' ? 'Multi' : 
    'Sniper';
  
  bestScoreDisplay.innerHTML = `<span id="best-score-value">High score: ${bestScores[mode]}</span>`;
  
  // NEUE BERECHNUNGEN HINZUGEFÜGT
  accuracy = totalShots > 0 ? Math.round((score / totalShots) * 100) : 0;
  document.getElementById('accuracy').textContent = accuracy + '%';
  
  document.getElementById('combo').textContent = combo;
  
  avgReactionTime = score > 0 ? (totalReactionTime / score) : 0;
  document.getElementById('avg-time').textContent = avgReactionTime.toFixed(2) + 's';
}



  
  // Calculate and update accuracy
  accuracy = totalShots > 0 ? Math.round((score / totalShots) * 100) : 0;
  document.getElementById('accuracy').textContent = accuracy + '%';
  
  // Update combo
  document.getElementById('combo').textContent = combo;
  
  // Update average reaction time
  avgReactionTime = score > 0 ? (totalReactionTime / score) : 0;
  document.getElementById('avg-time').textContent = avgReactionTime.toFixed(2) + 's';
  
  // Add pulse animation to score when it changes
  scoreDisplay.parentElement.classList.remove('pulse');
  void scoreDisplay.parentElement.offsetWidth;
  scoreDisplay.parentElement.classList.add('pulse');
  
  // Flash time when below 10 seconds
  if (timeLeft < 11) {
    timeItem.style.animation = 'pulse 0.8s infinite';
    timeItem.style.background = 'rgba(255, 50, 50, 0.3)';
  } else {
    timeItem.style.animation = '';
    timeItem.style.background = '';
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
  targets[targetIndex].style.left = `${Math.max(0, Math.min(pos.left, gameArea.offsetWidth - size))}px`;
  targets[targetIndex].style.top = `${Math.max(0, Math.min(pos.top, gameArea.offsetHeight - size))}px`;
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
      
      // Position begrenzen
      targets[i].style.left = Math.max(0, Math.min(pos.left, width - size)) + 'px';
      targets[i].style.top = Math.max(0, Math.min(pos.top, height - size)) + 'px';
      
    } catch (err) {
      console.error('Position error:', err);
      const pos = await getRandomPosition(size, width, height);
      lastPositions.push(pos);
      
      // Position begrenzen
      targets[i].style.left = Math.max(0, Math.min(pos.left, width - size)) + 'px';
      targets[i].style.top = Math.max(0, Math.min(pos.top, height - size)) + 'px';
    }
  }
}

async function createTargets() {
  // Alte Targets entfernen
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
    btn.style.width = `${size}px`;
    btn.style.height = `${size}px`;
    btn.dataset.index = i; // WICHTIG: Index speichern

    // Event-Listener mit korrektem Index-Closure
    const handleClick = (e) => {
      handleTargetClick(e, btn, size, i); // i wird korrekt gebunden
    };

    if (isMobile) {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleClick(e);
      });
    } else {
      btn.addEventListener('click', handleClick);
    }

    gameArea.appendChild(btn);
    targets.push(btn);
  }

  await new Promise(resolve => requestAnimationFrame(resolve));
  await teleportAllTargets();
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
    } else {
      score++;
      totalShots++;
      combo++;
      const now = Date.now();
      if (lastHitTime > 0) {
        totalReactionTime += (now - lastHitTime) / 1000;
      }
      lastHitTime = now;
    }
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

gameArea.addEventListener('click', () => {
  if (roundStarted) {
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









if (isMobile) {
  gameArea.addEventListener('touchstart', (e) => {
    if (roundStarted && e.target === gameArea) {
      missClicks++;
      totalShots++;
      combo = 0;
      updateDisplays();
    }
  });
}

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








modeBtn.addEventListener('click', async () => {
  if (roundStarted) {
    endRound();
 } 
  if (mode === 'single') {
    mode = 'multi';
  } else if (mode === 'multi') {
    mode = 'sniper';
  } else {
    mode = 'single';
  }

  await createTargets();
  updateDisplays();
  

});

stopBtn.addEventListener('click', () => {
  if (roundStarted) {
    endRound();
  }
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
        // Rot für Red-Modus
        document.documentElement.style.setProperty('--hit-effect-color', 'rgba(255, 0, 0, 0.8)');
        document.documentElement.style.setProperty('--hit-effect-color-start', 'rgba(255, 0, 0, 0.6)');
        document.documentElement.style.setProperty('--hit-effect-color-20', 'rgba(255, 0, 0, 0.7)');
        document.documentElement.style.setProperty('--hit-effect-color-70', 'rgba(255, 0, 0, 0.3)');
        document.documentElement.style.setProperty('--hit-effect-color-80', 'rgba(255, 0, 0, 0.0)');
        document.documentElement.style.setProperty('--hit-effect-color-85', 'rgba(255, 0, 0, 0.1)');
        document.documentElement.style.setProperty('--hit-effect-color-100', 'rgba(255, 0, 0, 0.2)');

         document.documentElement.style.setProperty('--hit-effect2','rgb(255, 0, 0)');

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
  createAudioContext();
  initHitEffectPool();
  updateTargetAppearance();
  updateHitEffectButton(); // Button-Text initialisieren
  checkHitEffect();
}

initGame();

