import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Tank3DCanvas - Bộ dựng xe tăng 3D chuyên nghiệp bằng WebGL & Three.js
 * - Hỗ trợ nạp Model 3D tải trên mạng (file .glb / .gltf) tại /models/tank3d.glb
 * - Nếu chưa có file .glb trên máy: Tự động dựng cỗ xe tăng thép T-54 3D chân thực (Procedural PBR Military Tank)
 *   với tháp pháo tròn bọc thép, 10 bánh tì kép, xích sắt xoay, khói xả và cờ đỏ sao vàng lụa 3D uốn lượn sóng!
 * - Hỗ trợ chế độ:
 *   + 'showcase': Xem xoay 360 độ tương tác
 *   + 'parade': Lướt qua màn hình
 *   + 'vortex_suction': Xoáy tròn 3D và bị hút gọn gàng vào tâm nút Đăng Bài!
 */
export const Tank3DCanvas = ({
  mode = 'showcase', // 'showcase' | 'parade' | 'vortex_suction'
  modelUrl = '/models/tank3d.glb',
  targetPoint = null, // { x, y } toạ độ nút button đăng bài trên màn hình
  onSuctionComplete = null,
  width = '100%',
  height = '100%',
  className = '',
  style = {},
}) => {
  const mountRef = useRef(null);
  const [modelTypeLoaded, setModelTypeLoaded] = useState('procedural'); // 'custom_glb' | 'procedural'
  const animFrameRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 1000);
    camera.position.set(0, 3.2, 8.5);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 3. Lighting (Ánh sáng chuẩn quân sự & PBR kim khí)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    sunLight.position.set(6, 12, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xfacc15, 1.2);
    rimLight.position.set(-8, 5, -6);
    scene.add(rimLight);

    // Đốm sáng đỏ sao vàng vinh quang
    const victoryGlow = new THREE.PointLight(0xef4444, 2.5, 15);
    victoryGlow.position.set(0, 2, 2);
    scene.add(victoryGlow);

    // 4. Tank Root Group
    const tankRoot = new THREE.Group();
    scene.add(tankRoot);

    let flagMesh = null;
    let wheelsList = [];
    let exhaustParticles = [];

    // =========================================================================
    // HÀM DỰNG XE TĂNG 3D PROCEDURAL T-54 (THÉP BỌC GIÁP & CỜ ĐỎ SAO VÀNG 3D)
    // =========================================================================
    const buildProceduralTank = () => {
      // Vật liệu thép quân đội sơn xanh ô-liu mờ (Cast Armor Green)
      const armorMat = new THREE.MeshStandardMaterial({
        color: 0x3d4f36,
        roughness: 0.45,
        metalness: 0.65,
      });

      // Thép đậm / vành bánh xích
      const darkSteelMat = new THREE.MeshStandardMaterial({
        color: 0x1f2421,
        roughness: 0.7,
        metalness: 0.8,
      });

      // Viền kim loại bóng / nòng súng
      const gunMetalMat = new THREE.MeshStandardMaterial({
        color: 0x222629,
        roughness: 0.25,
        metalness: 0.9,
      });

      // A. Thân xe tăng (Hull) - vát nghiêng
      const hullGeom = new THREE.BoxGeometry(2.4, 0.75, 4.4);
      const hull = new THREE.Mesh(hullGeom, armorMat);
      hull.position.y = 0.65;
      hull.castShadow = true;
      hull.receiveShadow = true;
      tankRoot.add(hull);

      // Tấm chắn bùn hai bên sườn
      const fenderLGeom = new THREE.BoxGeometry(0.25, 0.08, 4.5);
      const fenderL = new THREE.Mesh(fenderLGeom, armorMat);
      fenderL.position.set(-1.3, 0.65, 0);
      tankRoot.add(fenderL);

      const fenderR = fenderL.clone();
      fenderR.position.x = 1.3;
      tankRoot.add(fenderR);

      // B. Tháp pháo tròn (Sloped Turret Dome)
      const turretGeom = new THREE.CylinderGeometry(1.05, 1.35, 0.65, 24);
      const turret = new THREE.Mesh(turretGeom, armorMat);
      turret.position.set(0, 1.25, -0.15);
      turret.castShadow = true;
      tankRoot.add(turret);

      // Cửa hầm chỉ huy tròn trên tháp pháo
      const cupolaGeom = new THREE.CylinderGeometry(0.35, 0.38, 0.18, 16);
      const cupola = new THREE.Mesh(cupolaGeom, darkSteelMat);
      cupola.position.set(-0.45, 1.62, -0.3);
      tankRoot.add(cupola);

      // C. Nòng pháo dài (Main Gun Barrel 100mm)
      const barrelGeom = new THREE.CylinderGeometry(0.08, 0.11, 3.4, 18);
      const barrel = new THREE.Mesh(barrelGeom, gunMetalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 1.32, 2.1);
      barrel.castShadow = true;
      tankRoot.add(barrel);

      // Loa giảm giật / vành đầu nòng pháo (Muzzle Brake)
      const muzzleGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.3, 16);
      const muzzle = new THREE.Mesh(muzzleGeom, gunMetalMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(0, 1.32, 3.8);
      tankRoot.add(muzzle);

      // D. Bánh xích & Bánh tì đôi chịu lực (5 bánh mỗi bên)
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 5; i++) {
          const wheelGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 18);
          const wheel = new THREE.Mesh(wheelGeom, darkSteelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(side * 1.3, 0.35, (i - 2) * 0.88);
          wheel.castShadow = true;
          tankRoot.add(wheel);
          wheelsList.push(wheel);

          // Nắp trục moay-ơ bánh xe
          const capGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.26, 12);
          const cap = new THREE.Mesh(capGeom, armorMat);
          cap.rotation.z = Math.PI / 2;
          cap.position.copy(wheel.position);
          tankRoot.add(cap);
        }

        // Bánh chủ động phía sau & bánh dẫn hướng phía trước
        const driveWheelGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.22, 16);
        const rearDrive = new THREE.Mesh(driveWheelGeom, darkSteelMat);
        rearDrive.rotation.z = Math.PI / 2;
        rearDrive.position.set(side * 1.3, 0.55, -2.1);
        tankRoot.add(rearDrive);
        wheelsList.push(rearDrive);

        const frontIdler = rearDrive.clone();
        frontIdler.position.z = 2.1;
        tankRoot.add(frontIdler);
        wheelsList.push(frontIdler);

        // Dải xích bao quanh (Tread Belt)
        const treadGeom = new THREE.BoxGeometry(0.26, 0.65, 4.45);
        const tread = new THREE.Mesh(treadGeom, darkSteelMat);
        tread.position.set(side * 1.3, 0.38, 0);
        tankRoot.add(tread);
      }

      // E. Cột ăng-ten cắm cờ
      const poleGeom = new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8);
      const pole = new THREE.Mesh(poleGeom, gunMetalMat);
      pole.position.set(0.55, 2.4, -0.6);
      tankRoot.add(pole);

      // F. CỜ ĐỎ SAO VÀNG 3D VẢI LỤA UỐN LƯỢN SÓNG (3D Waving Cloth Flag)
      const flagGeom = new THREE.PlaneGeometry(1.6, 1.05, 24, 16);

      // Vẽ Canvas Texture cho Cờ đỏ sao vàng
      const flagCanvas = document.createElement('canvas');
      flagCanvas.width = 512;
      flagCanvas.height = 340;
      const fCtx = flagCanvas.getContext('2d');
      // Nền đỏ cờ
      fCtx.fillStyle = '#da251d';
      fCtx.fillRect(0, 0, 512, 340);
      // Ngôi sao vàng năm cánh ở tâm
      fCtx.fillStyle = '#ffff00';
      fCtx.save();
      fCtx.translate(256, 170);
      fCtx.beginPath();
      for (let s = 0; s < 5; s++) {
        fCtx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * 65, -Math.sin(((18 + s * 72) * Math.PI) / 180) * 65);
        fCtx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * 28, -Math.sin(((54 + s * 72) * Math.PI) / 180) * 28);
      }
      fCtx.closePath();
      fCtx.fill();
      fCtx.restore();

      const flagTexture = new THREE.CanvasTexture(flagCanvas);
      const flagMat = new THREE.MeshStandardMaterial({
        map: flagTexture,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.1,
      });

      flagMesh = new THREE.Mesh(flagGeom, flagMat);
      flagMesh.position.set(1.35, 2.85, -0.6);
      flagMesh.castShadow = true;
      tankRoot.add(flagMesh);

      // G. Đốm khói xả 3D (Exhaust puffs)
      for (let p = 0; p < 8; p++) {
        const puffGeom = new THREE.SphereGeometry(0.12 + (p % 3) * 0.06, 8, 8);
        const puffMat = new THREE.MeshBasicMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.35,
        });
        const puff = new THREE.Mesh(puffGeom, puffMat);
        puff.position.set(-0.9, 0.8, -2.4 - p * 0.4);
        tankRoot.add(puff);
        exhaustParticles.push({
          mesh: puff,
          baseZ: -2.4 - p * 0.4,
          speed: 0.04 + (p % 3) * 0.02,
        });
      }

      // H. Mặt đất đổ bóng 3D mờ mịn
      const shadowPlaneGeom = new THREE.PlaneGeometry(6, 6);
      const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.45 });
      const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = 0;
      shadowPlane.receiveShadow = true;
      scene.add(shadowPlane);
    };

    // =========================================================================
    // NẠP MODEL .GLB TỪ MẠNG (NẾU CÓ) HOẶC FALLBACK SANG PROCEDURAL T-54
    // =========================================================================
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        // Tải thành công file .glb của người dùng đưa!
        const model = gltf.scene;
        // Chuẩn hoá kích thước
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.6 / maxDim;
        model.scale.set(scale, scale, scale);

        // Canh tâm model
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += 1.2;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        tankRoot.add(model);
        setModelTypeLoaded('custom_glb');
      },
      undefined,
      (err) => {
        // Nếu không có file .glb hoặc lỗi đường dẫn -> Tự động dùng Procedural Tank T-54
        buildProceduralTank();
        setModelTypeLoaded('procedural');
      }
    );

    // =========================================================================
    // CÁC BIẾN & THUẬT TOÁN ĐIỀU KHIỂN CHUYỂN ĐỘNG THEO MODE
    // =========================================================================
    let startTime = Date.now();
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotY = 0.45;
    let targetRotX = 0.15;

    // Kéo thả chuột để xoay 360 độ (ở chế độ showcase)
    const onMouseDown = (e) => {
      if (mode !== 'showcase') return;
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseMove = (e) => {
      if (!isDragging || mode !== 'showcase') return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      targetRotY += dx * 0.008;
      targetRotX = Math.max(-0.4, Math.min(0.6, targetRotX + dy * 0.006));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // =========================================================================
    // VÒNG LẶP ANIMATION (RENDER LOOP)
    // =========================================================================
    let suctionProgress = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsed = (Date.now() - startTime) / 1000;

      // 1. Uốn lượn cờ đỏ sao vàng 3D vải lụa theo hàm sóng sin
      if (flagMesh && flagMesh.geometry) {
        const posAttr = flagMesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          // Uốn nếp cờ bay từ cột x sang mép ngoài
          const waveZ = Math.sin(elapsed * 6.5 + x * 4.2) * 0.14 * (x + 0.8) +
                        Math.cos(elapsed * 4.2 + y * 3.1) * 0.06;
          posAttr.setZ(i, waveZ);
        }
        posAttr.needsUpdate = true;
      }

      // 2. Quay bánh xích khi di chuyển
      wheelsList.forEach((w) => {
        w.rotation.x += 0.06;
      });

      // 3. Khói ống xả cuộn ra sau
      exhaustParticles.forEach((p) => {
        p.mesh.position.z -= p.speed;
        p.mesh.scale.multiplyScalar(1.015);
        p.mesh.material.opacity *= 0.98;
        if (p.mesh.position.z < -4.8) {
          p.mesh.position.z = p.baseZ;
          p.mesh.scale.set(1, 1, 1);
          p.mesh.material.opacity = 0.35;
        }
      });

      // 4. Xử lý hoạt cảnh theo MODE
      if (mode === 'showcase') {
        // Tự xoay nhẹ nhàng kết hợp kéo chuột
        tankRoot.rotation.y += (targetRotY - tankRoot.rotation.y) * 0.08;
        tankRoot.rotation.x += (targetRotX - tankRoot.rotation.x) * 0.08;
        // Bập bùng nhịp phuộc xe tăng
        tankRoot.position.y = Math.sin(elapsed * 3) * 0.04;
      } else if (mode === 'parade') {
        // Lướt từ trái sang phải
        const paradeX = -7 + (elapsed * 3.5) % 15;
        tankRoot.position.set(paradeX, Math.sin(elapsed * 5) * 0.05, 0);
        tankRoot.rotation.set(0, Math.PI / 2, 0);
      } else if (mode === 'vortex_suction') {
        // =====================================================================
        // HIỆU ỨNG ĐĂNG BÀI: XE TĂNG 3D XOÁY ỐC & HÚT VÀO NÚT BUTTON ĐĂNG BÀI!
        // =====================================================================
        suctionProgress = Math.min(1, suctionProgress + 0.016);

        if (suctionProgress < 0.3) {
          // Giai đoạn 1: Xe tăng lao tới dũng mãnh, hướng nòng pháo
          const t1 = suctionProgress / 0.3;
          tankRoot.position.z = 5 - t1 * 4;
          tankRoot.position.y = Math.sin(elapsed * 12) * 0.06;
          tankRoot.rotation.y = 0.35 * (1 - t1);
          tankRoot.scale.setScalar(1.0 + t1 * 0.15);
        } else {
          // Giai đoạn 2 & 3: Bị hút chân không xoắn ốc vào nút đăng bài
          const t2 = (suctionProgress - 0.3) / 0.7; // 0 -> 1

          // Chuyển đổi toạ độ nút màn hình sang toạ độ Three.js World
          let tx = 0;
          let ty = -0.5;
          if (targetPoint) {
            const ndcX = (targetPoint.x / w) * 2 - 1;
            const ndcY = -(targetPoint.y / h) * 2 + 1;
            tx = ndcX * 4.2;
            ty = ndcY * 2.6;
          }

          // Quỹ đạo xoắn ốc (Spiral Suction Vortex)
          const angle = t2 * Math.PI * 8; // Xoay 4 vòng tròn
          const spiralRadius = (1 - t2) * 3.2;

          tankRoot.position.x = tx + Math.cos(angle) * spiralRadius;
          tankRoot.position.y = ty + Math.sin(angle) * spiralRadius * 0.6;
          tankRoot.position.z = (1 - t2) * 2.5 - t2 * 2;

          // Xoay tròn 3D dữ dội theo chiều lực hút
          tankRoot.rotation.z += 0.28;
          tankRoot.rotation.y += 0.35;
          tankRoot.rotation.x = t2 * Math.PI * 2;

          // Thu nhỏ kích thước theo cấp số nhân (hút vào điểm vô cực)
          const s = Math.max(0.001, (1 - t2) * (1 - t2));
          tankRoot.scale.set(s, s, s);

          if (t2 >= 0.98 && onSuctionComplete) {
            onSuctionComplete();
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 5. Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [mode, modelUrl, targetPoint]);

  return (
    <div
      ref={mountRef}
      className={`tank-3d-canvas-wrap ${className}`}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: mode === 'showcase' ? 'auto' : 'none',
        ...style,
      }}
    />
  );
};
