import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Soldier3DCanvas - Bộ dựng mô hình 3D Người Chiến Sĩ Quân Đội Nhân Dân Việt Nam (K20 Hiện Đại)
 * - Tái hiện chân thực hình ảnh người lính trong ảnh thực tế:
 *   + Quân phục tác chiến rằn ri K20 hiện đại
 *   + Mũ chống đạn hiện đại (FAST Combat Helmet) có đế gắn kính nhìn đêm (NVG mount) và ray phụ kiện
 *   + Khẩu trang tác chiến màu xanh rêu, ánh mắt kiên định, cảnh giác
 *   + Áo giáp chống đạn (Plate Carrier) có 4 bao tiếp đạn súng trường, dây đai chéo và quân hàm ve áo đỏ sao vàng
 *   + Súng bộ binh hiện đại đeo chéo dõng dạc
 *   + Cột cờ Tổ Quốc / cờ Quyết Thắng đỏ sao vàng lụa 3D uốn lượn sóng trên vai
 *   + Căn chỉnh góc nhìn camera cân đối hoàn hảo, KHÔNG BỊ LỆCH XUỐNG DƯỚI!
 * - Hỗ trợ tương tác: Xoay 360 độ bằng chuột / cảm ứng, cử động nhịp thở và hiệu ứng cờ bay.
 */
export const Soldier3DCanvas = ({
  mode = 'showcase', // 'showcase' | 'parade'
  width = '100%',
  height = '100%',
  className = '',
  style = {},
}) => {
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || window.innerWidth || 400;
    const h = container.clientHeight || window.innerHeight || 300;

    // 1. Scene & Camera (Căn chỉnh tâm chuẩn xác ở Y = 0.82, cân đối hoàn hảo, không bị lệch xuống dưới)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 1000);
    camera.position.set(0, 1.20, 4.4);
    camera.lookAt(0, 0.82, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Lighting (Ánh sáng nổi bật quân phục rằn ri và mũ chống đạn)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.6);
    sunLight.position.set(4, 8, 6);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xfacc15, 1.5);
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    fillLight.position.set(-4, 2, 4);
    scene.add(fillLight);

    // Đốm hào quang đỏ vinh quang
    const victoryLight = new THREE.PointLight(0xef4444, 2.0, 10);
    victoryLight.position.set(0, 2.2, 1.5);
    scene.add(victoryLight);

    // 4. Soldier Root Group
    const soldierRoot = new THREE.Group();
    // Thu gọn kích thước vừa vặn (scale = 0.68), nâng Y = 0.16 cân đối hoàn hảo
    soldierRoot.scale.set(0.68, 0.68, 0.68);
    soldierRoot.position.set(0, 0.16, 0);
    scene.add(soldierRoot);

    let flagMesh = null;

    // =========================================================================
    // TRÌNH TẠO TEXTURE RẰN RI K20 VIỆT NAM (PROCEDURAL K20 CAMOUFLAGE)
    // =========================================================================
    const createK20CamoTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Nền xanh cỏ úa quân sự
      ctx.fillStyle = '#3c5235';
      ctx.fillRect(0, 0, 512, 512);

      // Đốm rằn ri K20 (xanh lục sẫm, xanh ô-liu sáng, nâu đất và vệt đen)
      const drawPatch = (cx, cy, rx, ry, rot, col) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      const patches = [
        [120, 110, 80, 50, 0.3, '#5c784e'],
        [360, 130, 95, 60, -0.5, '#22281e'],
        [240, 260, 110, 70, 0.7, '#6e8a5e'],
        [90, 390, 85, 55, -0.4, '#242c20'],
        [430, 370, 90, 60, 0.6, '#56724a'],
        [220, 440, 80, 45, -0.6, '#1a2017'],
        [320, 220, 70, 40, 0.2, '#749263'],
      ];
      patches.forEach(([cx, cy, rx, ry, rot, col]) => drawPatch(cx, cy, rx, ry, rot, col));

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      tex.needsUpdate = true;
      return tex;
    };

    const camoTexture = createK20CamoTexture();

    // =========================================================================
    // VẬT LIỆU PBR QUÂN SỰ
    // =========================================================================
    const camoMat = new THREE.MeshStandardMaterial({
      map: camoTexture,
      roughness: 0.55,
      metalness: 0.1,
    });

    const tacticalVestMat = new THREE.MeshStandardMaterial({
      color: 0x273622, // Xanh rêu đậm bọc giáp
      roughness: 0.65,
      metalness: 0.15,
    });

    const pouchMat = new THREE.MeshStandardMaterial({
      color: 0x42382c, // Bao đạn màu nâu đất da bò quân đội
      roughness: 0.6,
      metalness: 0.1,
    });

    const maskMat = new THREE.MeshStandardMaterial({
      color: 0x223a22, // Khẩu trang tác chiến màu xanh rêu
      roughness: 0.7,
      metalness: 0.05,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd9a07a, // Màu da người Việt Nam
      roughness: 0.45,
      metalness: 0.05,
    });

    const helmetCoverMat = new THREE.MeshStandardMaterial({
      map: camoTexture,
      roughness: 0.5,
      metalness: 0.1,
    });

    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1f2421,
      roughness: 0.35,
      metalness: 0.85,
    });

    const woodStockMat = new THREE.MeshStandardMaterial({
      color: 0x5a2d18, // Báng súng màu gỗ nâu đỏ truyền thống
      roughness: 0.4,
      metalness: 0.1,
    });

    const goldStarMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.2,
    });

    // =========================================================================
    // DỰNG CHI TIẾT MÔ HÌNH 3D NGƯỜI CHIẾN SĨ K20
    // =========================================================================

    // 1. ĐÔI ỦNG QUÂN ĐỘI & ĐÔI CHÂN TÁC CHIẾN (BOOTS & LEGS)
    for (let side = -1; side <= 1; side += 2) {
      // Bàn chân & Ủng da đen
      const bootGeom = new THREE.BoxGeometry(0.18, 0.16, 0.32);
      const boot = new THREE.Mesh(bootGeom, darkSteelMat);
      boot.position.set(side * 0.18, 0.08, 0.04);
      boot.castShadow = true;
      soldierRoot.add(boot);

      // Cẳng chân mặc quần rằn ri K20
      const legGeom = new THREE.CylinderGeometry(0.11, 0.12, 0.55, 12);
      const lowerLeg = new THREE.Mesh(legGeom, camoMat);
      lowerLeg.position.set(side * 0.18, 0.42, 0);
      lowerLeg.castShadow = true;
      soldierRoot.add(lowerLeg);

      // Đùi & Túi hộp cạnh đùi (Cargo pockets)
      const thighGeom = new THREE.CylinderGeometry(0.13, 0.12, 0.55, 12);
      const thigh = new THREE.Mesh(thighGeom, camoMat);
      thigh.position.set(side * 0.18, 0.88, 0);
      thigh.castShadow = true;
      soldierRoot.add(thigh);

      const pocketGeom = new THREE.BoxGeometry(0.06, 0.16, 0.14);
      const pocket = new THREE.Mesh(pocketGeom, camoMat);
      pocket.position.set(side * 0.31, 0.88, 0);
      soldierRoot.add(pocket);
    }

    // 2. THÂN MÌNH & ÁO GIÁP TÁC CHIẾN (TORSO & PLATE CARRIER)
    // Thân áo trong K20
    const torsoGeom = new THREE.BoxGeometry(0.52, 0.65, 0.32);
    const torso = new THREE.Mesh(torsoGeom, camoMat);
    torso.position.set(0, 1.45, 0);
    torso.castShadow = true;
    soldierRoot.add(torso);

    // Áo giáp chống đạn (Tactical Plate Carrier Vest)
    const vestGeom = new THREE.BoxGeometry(0.56, 0.55, 0.36);
    const vest = new THREE.Mesh(vestGeom, tacticalVestMat);
    vest.position.set(0, 1.48, 0.02);
    vest.castShadow = true;
    soldierRoot.add(vest);

    // 4 Bao tiếp đạn trước ngực (Tactical Magazine Pouches)
    for (let p = 0; p < 4; p++) {
      const pouchGeom = new THREE.BoxGeometry(0.1, 0.22, 0.08);
      const pouch = new THREE.Mesh(pouchGeom, pouchMat);
      pouch.position.set(-0.18 + p * 0.12, 1.34, 0.22);
      pouch.castShadow = true;
      soldierRoot.add(pouch);
    }

    // Dây đai vai & Khóa cài tác chiến
    for (let side = -1; side <= 1; side += 2) {
      const strapGeom = new THREE.BoxGeometry(0.12, 0.04, 0.38);
      const strap = new THREE.Mesh(strapGeom, tacticalVestMat);
      strap.position.set(side * 0.18, 1.76, 0.02);
      soldierRoot.add(strap);

      const buckleGeom = new THREE.BoxGeometry(0.05, 0.06, 0.02);
      const buckle = new THREE.Mesh(buckleGeom, darkSteelMat);
      buckle.position.set(side * 0.18, 1.62, 0.21);
      soldierRoot.add(buckle);
    }

    // Quân hàm ve áo màu đỏ viền vàng hai bên cổ áo (Collar Rank Tabs)
    for (let side = -1; side <= 1; side += 2) {
      const tabGeom = new THREE.BoxGeometry(0.08, 0.04, 0.02);
      const tabMat = new THREE.MeshStandardMaterial({ color: 0xda251d });
      const tab = new THREE.Mesh(tabGeom, tabMat);
      tab.position.set(side * 0.12, 1.74, 0.18);
      soldierRoot.add(tab);

      const starGeom = new THREE.SphereGeometry(0.015, 8, 8);
      const tabStar = new THREE.Mesh(starGeom, goldStarMat);
      tabStar.position.set(side * 0.12, 1.74, 0.19);
      soldierRoot.add(tabStar);
    }

    // 3. CÁNH TAY & GĂNG TAY CHIẾN ĐẤU (ARMS & TACTICAL GLOVES)
    for (let side = -1; side <= 1; side += 2) {
      // Cánh tay áo rằn ri
      const armGeom = new THREE.CylinderGeometry(0.08, 0.09, 0.42, 12);
      const arm = new THREE.Mesh(armGeom, camoMat);
      arm.position.set(side * 0.35, 1.55, 0.02);
      arm.rotation.z = side * 0.12;
      arm.castShadow = true;
      soldierRoot.add(arm);

      // Cẳng tay
      const foreArmGeom = new THREE.CylinderGeometry(0.075, 0.08, 0.38, 12);
      const foreArm = new THREE.Mesh(foreArmGeom, camoMat);
      foreArm.position.set(side * 0.37, 1.25, 0.08);
      foreArm.rotation.x = -0.25;
      foreArm.castShadow = true;
      soldierRoot.add(foreArm);

      // Găng tay chiến thuật màu rêu đậm
      const gloveGeom = new THREE.BoxGeometry(0.09, 0.12, 0.08);
      const glove = new THREE.Mesh(gloveGeom, tacticalVestMat);
      glove.position.set(side * 0.37, 1.05, 0.14);
      soldierRoot.add(glove);
    }

    // 4. ĐẦU, KHẨU TRANG & MŨ CHỐNG ĐẠN FAST HIỆN ĐẠI (HEAD, MASK & FAST HELMET)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.88, 0);

    // Cổ
    const neckGeom = new THREE.CylinderGeometry(0.08, 0.09, 0.12, 12);
    const neck = new THREE.Mesh(neckGeom, skinMat);
    neck.position.y = -0.04;
    headGroup.add(neck);

    // Khuôn mặt
    const faceGeom = new THREE.SphereGeometry(0.145, 16, 16);
    const face = new THREE.Mesh(faceGeom, skinMat);
    face.position.set(0, 0.08, 0);
    headGroup.add(face);

    // Khẩu trang tác chiến màu xanh rêu che kín mũi miệng
    const maskGeom = new THREE.SphereGeometry(0.148, 16, 16, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.42);
    const mask = new THREE.Mesh(maskGeom, maskMat);
    mask.position.set(0, 0.07, 0.015);
    headGroup.add(mask);

    // Mũ chống đạn hiện đại FAST bọc vải rằn ri
    const helmetGeom = new THREE.SphereGeometry(0.165, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const helmet = new THREE.Mesh(helmetGeom, helmetCoverMat);
    helmet.position.set(0, 0.1, 0.01);
    headGroup.add(helmet);

    // Đế gắn kính nhìn đêm phía trước trán mũ (NVG Mount Bracket)
    const nvgMountGeom = new THREE.BoxGeometry(0.07, 0.08, 0.03);
    const nvgMount = new THREE.Mesh(nvgMountGeom, darkSteelMat);
    nvgMount.position.set(0, 0.16, 0.17);
    headGroup.add(nvgMount);

    // Ray phụ kiện 2 bên tai mũ (Side Tactical Rails)
    for (let side = -1; side <= 1; side += 2) {
      const railGeom = new THREE.BoxGeometry(0.03, 0.04, 0.14);
      const rail = new THREE.Mesh(railGeom, darkSteelMat);
      rail.position.set(side * 0.16, 0.12, 0.02);
      headGroup.add(rail);

      // Dây quai cằm
      const strapGeom = new THREE.BoxGeometry(0.02, 0.12, 0.02);
      const chinStrap = new THREE.Mesh(strapGeom, darkSteelMat);
      chinStrap.position.set(side * 0.13, 0.02, 0.04);
      chinStrap.rotation.z = side * 0.25;
      headGroup.add(chinStrap);
    }

    soldierRoot.add(headGroup);

    // 5. KHẨU SÚNG BỘ BINH ĐEO SAU LƯNG (SLUNG RIFLE)
    const rifleGroup = new THREE.Group();
    rifleGroup.position.set(-0.16, 1.45, -0.22);
    rifleGroup.rotation.set(0.2, 0.4, 0.65); // Đeo chéo lưng uy dũng

    // Thân súng kim loại
    const receiverGeom = new THREE.BoxGeometry(0.08, 0.12, 0.55);
    const receiver = new THREE.Mesh(receiverGeom, darkSteelMat);
    rifleGroup.add(receiver);

    // Nòng súng dài
    const barrelGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8);
    const barrel = new THREE.Mesh(barrelGeom, darkSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.55);
    rifleGroup.add(barrel);

    // Hộp tiếp đạn cong
    const magGeom = new THREE.BoxGeometry(0.05, 0.2, 0.1);
    const mag = new THREE.Mesh(magGeom, darkSteelMat);
    mag.position.set(0, -0.12, 0.06);
    mag.rotation.x = 0.25;
    rifleGroup.add(mag);

    // Báng súng gỗ nâu đỏ
    const stockGeom = new THREE.BoxGeometry(0.06, 0.14, 0.32);
    const stock = new THREE.Mesh(stockGeom, woodStockMat);
    stock.position.set(0, -0.02, -0.4);
    rifleGroup.add(stock);

    soldierRoot.add(rifleGroup);

    // 6. CÁN CỜ & CỜ ĐỎ SAO VÀNG "QUYẾT THẮNG" LỤA 3D
    const poleGeom = new THREE.CylinderGeometry(0.016, 0.016, 2.6, 8);
    const pole = new THREE.Mesh(poleGeom, darkSteelMat);
    pole.position.set(0.42, 1.8, 0.1);
    soldierRoot.add(pole);

    // Mũi giáo kim loại đầu cán cờ
    const spearGeom = new THREE.ConeGeometry(0.04, 0.14, 8);
    const spear = new THREE.Mesh(spearGeom, goldStarMat);
    spear.position.set(0.42, 3.16, 0.1);
    soldierRoot.add(spear);

    // Lá cờ lụa 3D
    const flagGeom = new THREE.PlaneGeometry(1.4, 0.95, 24, 16);

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
      fCtx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * 58, -Math.sin(((18 + s * 72) * Math.PI) / 180) * 58);
      fCtx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * 25, -Math.sin(((54 + s * 72) * Math.PI) / 180) * 25);
    }
    fCtx.closePath();
    fCtx.fill();
    fCtx.restore();

    // Dòng chữ QUYẾT THẮNG
    fCtx.fillStyle = '#fde047';
    fCtx.font = '900 36px "Arial Black", Impact, sans-serif';
    fCtx.textAlign = 'center';
    fCtx.textBaseline = 'top';
    fCtx.fillText('QUYẾT THẮNG', 256, 255);

    const flagTexture = new THREE.CanvasTexture(flagCanvas);
    flagTexture.needsUpdate = true;

    const flagMat = new THREE.MeshStandardMaterial({
      map: flagTexture,
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0.1,
    });

    flagMesh = new THREE.Mesh(flagGeom, flagMat);
    flagMesh.position.set(1.12, 2.55, 0.1);
    flagMesh.castShadow = true;
    soldierRoot.add(flagMesh);

    // 7. Mặt đất đổ bóng 3D
    const shadowPlaneGeom = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // =========================================================================
    // ĐIỀU KHIỂN XOAY 360 ĐỘ TƯƠNG TÁC
    // =========================================================================
    let startTime = Date.now();
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotY = 0.35;
    let targetRotX = 0.05;

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
      targetRotX = Math.max(-0.3, Math.min(0.4, targetRotX + dy * 0.006));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const onTouchStart = (e) => {
      if (mode !== 'showcase' || !e.touches || e.touches.length === 0) return;
      isDragging = true;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (!isDragging || mode !== 'showcase' || !e.touches || e.touches.length === 0) return;
      const dx = e.touches[0].clientX - prevMouseX;
      const dy = e.touches[0].clientY - prevMouseY;
      targetRotY += dx * 0.008;
      targetRotX = Math.max(-0.3, Math.min(0.4, targetRotX + dy * 0.006));
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    };
    const onTouchEnd = () => {
      isDragging = false;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // =========================================================================
    // VÒNG LẶP ANIMATION (RENDER LOOP)
    // =========================================================================
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsed = (Date.now() - startTime) / 1000;

      // 1. Sóng cờ Quyết Thắng lụa 3D
      if (flagMesh && flagMesh.geometry) {
        const posAttr = flagMesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          const waveZ =
            Math.sin(elapsed * 6.5 + x * 4.5) * 0.12 * (x + 0.7) +
            Math.cos(elapsed * 4.2 + y * 3.2) * 0.05;
          posAttr.setZ(i, waveZ);
        }
        posAttr.needsUpdate = true;
      }

      // 2. Nhịp thở tự nhiên của người chiến sĩ
      const breath = Math.sin(elapsed * 2.4) * 0.015;
      torso.scale.set(1 + breath, 1, 1 + breath * 1.2);
      vest.scale.set(1 + breath * 0.8, 1, 1 + breath * 0.8);

      // 3. Xoay 360 độ tương tác mượt mà
      if (mode === 'showcase') {
        soldierRoot.rotation.y += (targetRotY - soldierRoot.rotation.y) * 0.08;
        soldierRoot.rotation.x += (targetRotX - soldierRoot.rotation.x) * 0.08;
        soldierRoot.position.y = 0.16 + Math.sin(elapsed * 2.4) * 0.015;
      } else if (mode === 'parade') {
        const span = 14;
        const speed = 3.6;
        const paradeX = -7 + (elapsed * speed) % span;
        const stepBob = Math.abs(Math.sin(elapsed * 5.8)) * 0.08;
        soldierRoot.position.set(paradeX, 0.16 + stepBob, 0);
        soldierRoot.rotation.set(0.04, Math.PI / 2 - 0.22, 0);
        soldierRoot.scale.set(0.70, 0.70, 0.70);
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
      camera.lookAt(0, 0.82, 0);
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [mode]);

  return (
    <div
      ref={mountRef}
      className={`soldier-3d-canvas-wrap ${className}`}
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
