// Zufallsgenerator mit xorshift32 Algorithmus
let seed = Math.floor(Math.random() * 0x100000000);

function fastRandom() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}

// Helper: Quadratische Distanzprüfung (schneller als Math.hypot)
function isOverlapping(pos1, pos2, minDistance) {
  const dx = pos1.left - pos2.left;
  const dy = pos1.top - pos2.top;
  return (dx * dx + dy * dy) < (minDistance * minDistance);
}

// Generiert zufällige Position mit Randabstand
function getRandomPosition(size, width, height) {
    let margin = size*2;
    return {
      left: margin + fastRandom() * (width - size - 2 * margin),
      top: margin + fastRandom() * (height - size - 2 * margin)
    };
  }


  


// Findet nicht-überlappende Position mit optimierter Logik
// positionWorker.js
function getNonOverlappingPosition(size, existing, radius, width, height) {
  const minDist = size * 1.1; // 10% Abstand
  const minDistSq = minDist * minDist;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxLeft = width - size;
  const maxTop = height - size;
  
  // Verbesserte Logik für 'full' radius (Sniper-Modus)
  if (radius === 'full') {
    // Versuche 1: Versuche Positionen mit reduziertem Rand
    for (let tries = 0; tries < 150; tries++) {
      const candidate = {
        left: size/2 + fastRandom() * (width - size*2),
        top: size/2 + fastRandom() * (height - size*2)
      };
      
      // Prüfe auf Kollisionen
      let valid = true;
      for (const pos of existing) {
        if ((pos.left - candidate.left) ** 2 + (pos.top - candidate.top) ** 2 < minDistSq) {
          valid = false;
          break;
        }
      }
      
      if (valid) return candidate;
    }
    
    // Versuche 2: Notfall mit minimalem Rand
    return {
      left: 5 + fastRandom() * (width - size*2),
      top: 5 + fastRandom() * (height - size *2)
    };
  }
  
  // Originale Logik für radiale Platzierung (Single/Multi-Modus)
  for (let tries = 0; tries < 150; tries++) {
    const angle = fastRandom() * Math.PI * 2;
    const distance = fastRandom() * radius;
    
    const left = Math.max(0, Math.min(
      centerX + Math.cos(angle) * distance - size / 2, 
      maxLeft
    ));
    
    const top = Math.max(0, Math.min(
      centerY + Math.sin(angle) * distance - size / 2,
      maxTop
    ));
    
    const candidate = { left, top };
    
    if (!existing.some(pos => 
      (pos.left - candidate.left) ** 2 + (pos.top - candidate.top) ** 2 < minDistSq
    )) {
      return candidate;
    }
  }
  
  // Fallback für Single/Multi-Modus
  return {
    left: size + fastRandom() * (width - size * 3),
    top: size + fastRandom() * (height - size * 3)
  };
}

// Worker-Handler
self.onmessage = (e) => {
  const { id, type, data } = e.data;
  
  try {
    const result = type === 'random' 
      ? getRandomPosition(data.size, data.width, data.height)
      : getNonOverlappingPosition(
          data.size, 
          data.existing, 
          data.radius, 
          data.width, 
          data.height
        );
    
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};