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

function getRandomPosition(size, width, height) {
  // Sicherstellen, dass der Rand nicht größer als der Container ist
  
 
  
  const margin = (
  size <= 40 ? Math.min(size * 2, width / 70, height / 35) :
  size <= 70 ? Math.min(size * 2, width / 40, height / 30) :
               Math.min(size * 2, width / 8, height / 8)
);
  // Verfügbaren Platz berechnen (mindestens 0)
  const availableWidth = Math.max(0, width - size - 2 * margin);
  const availableHeight = Math.max(0, height - size - 2 * margin);
  
  return {
    left: margin + (availableWidth > 0 ? fastRandom() * availableWidth : 0),
    top: margin + (availableHeight > 0 ? fastRandom() * availableHeight : 0)
  };
}
  


// Findet nicht-überlappende Position mit optimierter Logik
// positionWorker.js
function getNonOverlappingPosition(size, existing, radius, width, height) {
 const minDist = radius === 'full' ? size * 2 : size * 1.5;//mindestabstand basierend auf dem modus (sniper oder nicht)
  const centerX = width / 2;
  const centerY = height / 2;
  const maxLeft = width - size;
  const maxTop = height - size;

  // Sniper-Modus (full radius)
  if (radius === 'full') {
   
    // Phase 1: Schnelle zufällige Versuche
    for (let tries = 0; tries < 50; tries++) {
      const candidate = {
        left: size + fastRandom() * (width - size * 3),
        top: size + fastRandom() * (height - size * 3)
      };
      
      if (!existing.some(pos => isOverlapping(pos, candidate, minDist))) {
        return candidate;
      }
    }

    // Phase 2: Gezielte Sektor-Suche
    if (existing.length > 0) {
      const sectorSize = Math.max(size * 3, 150);
      const cols = Math.ceil(width / sectorSize);
      const rows = Math.ceil(height / sectorSize);
      
      const sectorCounts = new Uint8Array(cols * rows);
      existing.forEach(pos => {
        const col = Math.min(cols-1, Math.floor(pos.left / sectorSize));
        const row = Math.min(rows-1, Math.floor(pos.top / sectorSize));
        sectorCounts[row * cols + col]++;
      });

      for (let tries = 0; tries < 25; tries++) {
        const leastUsedSector = sectorCounts.indexOf(Math.min(...sectorCounts));
        const col = leastUsedSector % cols;
        const row = Math.floor(leastUsedSector / cols);
        
        const candidate = {
          left: col * sectorSize + size/2 + fastRandom() * (sectorSize - size),
          top: row * sectorSize + size/2 + fastRandom() * (sectorSize - size)
        };
        
        if (!existing.some(pos => isOverlapping(pos, candidate, minDist))) {
          return candidate;
        }
        sectorCounts[leastUsedSector]++;
      }
    }

    // Phase 3: Notfall-Lösung
    for (let tries = 0; tries < 10; tries++) {
      const candidate = getRandomPosition(size, width, height);
      if (!existing.some(pos => isOverlapping(pos, candidate, size))) {
        return candidate;
      }
    }

    return getRandomPosition(size, width, height);
  }

  // Single/Multi-Modus (radiale Platzierung)
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
    
    if (!existing.some(pos => isOverlapping(pos, candidate, minDist))) {
      return candidate;
    }
  }
  
  // Fallback für Single/Multi-Modus
  return {
    left: Math.max(0, fastRandom() * (width - size)),
    top: Math.max(0, fastRandom() * (height - size))
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