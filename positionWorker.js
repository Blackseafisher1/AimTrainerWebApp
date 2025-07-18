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
 
  const margin = 10;

  // Verfügbaren Platz berechnen (garantiert >= 0)
  const availableWidth = Math.max(0, width - size - 2 * margin);
  const availableHeight = Math.max(0, height - size -  2* margin);
  
  return {
    left: margin + (availableWidth > 0 ? fastRandom() * availableWidth : 0),
    top: margin + (availableHeight > 0 ? fastRandom() * availableHeight : 0)
  };
}

function getNonOverlappingPosition(size, existing, radius, width, height) {
  // OPTIMIERTE MARGIN (identisch zu getRandomPosition)
  const margin = 10;
  const minDist = radius === 'full' ? size * 2 : size * 1.1;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Maximalpositionen unter Berücksichtigung der Margin
  const maxLeft = width - size - margin;
  const maxTop = height - size - margin;

  // Phase 1: Schnelle zufällige Versuche (Sniper-Modus)
  if (radius === 'full') {
    for (let tries = 0; tries < 50; tries++) {
      const candidate = {
        left: margin + fastRandom() * (width - size - 2 * margin),
        top: margin + fastRandom() * (height - size - 2 * margin)
      };
      if (!existing.some(pos => isOverlapping(pos, candidate, minDist))) {
        return candidate;
      }
    }
  }
  
  // Phase 2: Radiale Platzierung (Single/Multi-Modus)
  for (let tries = 0; tries < 100; tries++) {
    const angle = fastRandom() * Math.PI * 2;
    const distance = fastRandom() * (radius - margin); // Radius um Margin reduziert
    
    const candidate = {
      left: Math.max(margin, Math.min(
        centerX + Math.cos(angle) * distance - size / 2, 
        maxLeft
      )),
      top: Math.max(margin, Math.min(
        centerY + Math.sin(angle) * distance - size / 2,
        maxTop
      ))
    };
    
    if (!existing.some(pos => isOverlapping(pos, candidate, minDist))) {
      return candidate;
    }
  }

  // Phase 3: Notfall-Lösung
  return getRandomPosition(size, width, height);
}

// Worker-Handler (UNVERÄNDERT)
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