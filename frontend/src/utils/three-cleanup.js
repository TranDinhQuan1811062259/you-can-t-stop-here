/**
 * Tiện ích giải phóng triệt để tài nguyên GPU / VRAM cho Three.js Scene & WebGLRenderer.
 * Đảm bảo dọn sạch toàn bộ geometry, material và mọi slot texture (bao gồm CanvasTexture).
 */

export const disposeThreeMaterial = (material) => {
  if (!material) return;

  const disposeSingle = (mat) => {
    if (!mat) return;
    Object.keys(mat).forEach((prop) => {
      const value = mat[prop];
      if (value && typeof value === 'object' && value.isTexture && typeof value.dispose === 'function') {
        try {
          value.dispose();
        } catch (_) {}
      }
    });
    if (typeof mat.dispose === 'function') {
      try {
        mat.dispose();
      } catch (_) {}
    }
  };

  if (Array.isArray(material)) {
    material.forEach(disposeSingle);
  } else {
    disposeSingle(material);
  }
};

export const disposeThreeScene = (scene, renderer) => {
  if (scene && typeof scene.traverse === 'function') {
    scene.traverse((object) => {
      if (object.geometry && typeof object.geometry.dispose === 'function') {
        try {
          object.geometry.dispose();
        } catch (_) {}
      }
      if (object.material) {
        disposeThreeMaterial(object.material);
      }
    });
    if (typeof scene.clear === 'function') {
      try {
        scene.clear();
      } catch (_) {}
    }
  }

  if (renderer) {
    try {
      renderer.renderLists?.dispose?.();
    } catch (_) {}
    try {
      renderer.dispose();
    } catch (_) {}
  }
};
