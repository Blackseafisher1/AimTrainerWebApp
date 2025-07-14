// Helper functions
function getRandomPosition(size, width, height) {
  const margin = size / 2;
  return {
    left: margin + Math.random() * (width - size - margin),
    top: margin + Math.random() * (height - size - margin)
  };
}

function getNonOverlappingPosition(size, existing, radius, width, height) {
  if (radius === 'full') return getRandomPosition(size, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const maxLeft = width - size;
  const maxTop = height - size;

  for (let tries = 100; tries > 0; tries--) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    let left = Math.min(Math.max(0, centerX + Math.cos(angle) * distance - size/2), maxLeft);
    let top = Math.min(Math.max(0, centerY + Math.sin(angle) * distance - size/2), maxTop);

    if (!existing.some(pos => Math.hypot(pos.left - left, pos.top - top) < size)) {
      return { left, top };
    }
  }
  return getRandomPosition(size, width, height);
}

// Worker handler
self.onmessage = (e) => {
  const { id, type, data } = e.data;
  
  try {
    const result = type === 'random' 
      ? getRandomPosition(data.size, data.width, data.height)
      : getNonOverlappingPosition(data.size, data.existing, data.radius, data.width, data.height);
    
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};