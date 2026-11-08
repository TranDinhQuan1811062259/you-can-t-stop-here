import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Tank3DCanvas - Bộ dựng xe tăng 3D T-54B Quân Đội Nhân Dân Việt Nam (Nguyên mẫu Xe 565 Duyệt Binh)
 * - Tái hiện chuẩn xác cỗ xe tăng 565 từ ảnh thực tế:
 *   + Sơn rằn ri ngụy trang quân sự đa tông màu (3-tone military camouflage)
 *   + Số hiệu chiến thuật "565" khuôn tô quân sự màu trắng sắc nét
 *   + Phù hiệu Quân Đội Nhân Dân Việt Nam (Ngôi sao vàng trên nền đỏ tròn viền vàng)
 *   + Hệ thống giáp phản ứng nổ ERA xếp hàng trên mũi xe và phiến giáp vát nghiêng tháp pháo
 *   + Đồng chí Trưởng xe đội mũ công tác xe tăng Liên Xô/Việt Nam giơ tay chào quân lễ nghiêm trang
 *   + Súng máy phòng không 12.7mm DShK, đèn pha hồng ngoại L-2G, 2 thùng phuy nhiên liệu phụ 200L phía sau
 *   + Cờ đỏ sao vàng lụa 3D uốn lượn sóng trên cần ăng-ten
 *   + 10 bánh tì chịu lực moay-ơ hình sao, dải xích lăn bánh và khói xả động cơ
 * - Hỗ trợ nạp model tùy biến .glb từ người dùng (nếu có tải về đặt tại /models/tank3d.glb)
 * - Chế độ: 'showcase' (xoay 360 độ tương tác), 'parade' (duyệt binh lướt qua), 'vortex_suction' (xoáy ốc hút vào nút đăng bài)
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
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 1000);
    camera.position.set(0, 3.0, 8.8);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);

    // 3. Lighting (Ánh sáng chuẩn quân sự & PBR kim khí)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.6);
    sunLight.position.set(6, 12, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xfacc15, 1.4);
    rimLight.position.set(-8, 5, -6);
    scene.add(rimLight);

    // Ánh sáng hào quang đỏ sao vàng
    const victoryGlow = new THREE.PointLight(0xef4444, 2.2, 16);
    victoryGlow.position.set(0, 2.5, 2);
    scene.add(victoryGlow);

    // 4. Tank Root Group
    const tankRoot = new THREE.Group();
    scene.add(tankRoot);

    let flagMesh = null;
    let wheelsList = [];
    let exhaustParticles = [];

    // =========================================================================
    // TRÌNH TẠO TEXTURE PROCEDURAL CHUẨN XÁC THEO ẢNH XE TĂNG 565
    // =========================================================================

    // 1. Vân sơn rằn ri quân đội Việt Nam (3-Tone Camouflage Canvas Texture)
    const createCamouflageTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Nền xanh ô-liu quân đội
      ctx.fillStyle = '#3f5438';
      ctx.fillRect(0, 0, 512, 512);

      // Đốm rằn ri xanh sáng (Sage/Pale Olive)
      ctx.fillStyle = '#6e855f';
      const drawPatch = (cx, cy, rx, ry, rot) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      const palePatches = [
        [100, 110, 85, 60, 0.4],
        [370, 95, 110, 70, -0.6],
        [220, 270, 125, 75, 0.8],
        [85, 410, 80, 60, -0.3],
        [420, 380, 100, 65, 0.5],
      ];
      palePatches.forEach(([cx, cy, rx, ry, rot]) => drawPatch(cx, cy, rx, ry, rot));

      // Đốm rằn ri xám đen / nâu đất đậm (Dark Disruptive Camo)
      ctx.fillStyle = '#222720';
      const darkPatches = [
        [230, 90, 75, 45, -0.5],
        [65, 250, 70, 40, 0.7],
        [360, 230, 85, 50, 0.2],
        [190, 440, 90, 55, -0.7],
        [470, 450, 65, 40, 0.4],
      ];
      darkPatches.forEach(([cx, cy, rx, ry, rot]) => drawPatch(cx, cy, rx, ry, rot));

      // Hạt sần kim khí bọc thép
      const imgData = ctx.getImageData(0, 0, 512, 512);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 16;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    // 2. Tấm số hiệu chiến thuật "565" & Phù hiệu QĐNDVN hai bên tháp pháo
    const createTurretMarkingTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Nền rằn ri
      ctx.fillStyle = '#3f5438';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#6e855f';
      ctx.beginPath();
      ctx.ellipse(370, 120, 130, 75, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222720';
      ctx.beginPath();
      ctx.ellipse(140, 140, 100, 60, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Viền kim loại giáp
      ctx.strokeStyle = '#283524';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 244);

      // A. Phù hiệu tròn Quân Đội Nhân Dân Việt Nam
      const cx = 95;
      const cy = 128;
      const r = 56;

      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#da251d';
      ctx.fill();

      // Ngôi sao vàng 5 cánh
      ctx.fillStyle = '#ffff00';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      for (let s = 0; s < 5; s++) {
        ctx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * 35, -Math.sin(((18 + s * 72) * Math.PI) / 180) * 35);
        ctx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * 15, -Math.sin(((54 + s * 72) * Math.PI) / 180) * 15);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // B. Số hiệu chiến thuật 565 màu trắng khuôn tô
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 110px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 8;
      ctx.fillText('565', 330, 128);

      // Khe hở khuôn tô quân sự (Stencil cutouts)
      ctx.strokeStyle = '#3f5438';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(195, 125);
      ctx.lineTo(465, 125);
      ctx.stroke();

      const tex = new THREE.CanvasTexture(canvas);
      return tex;
    };

    // =========================================================================
    // HÀM DỰNG XE TĂNG 3D PROCEDURAL T-54B XE 565 DUYỆT BINH CHÂN THỰC
    // =========================================================================
    const buildProceduralTank = () => {
      const camoTexture = createCamouflageTexture();
      const turretMarkingTexture = createTurretMarkingTexture();

      // Vật liệu thép sơn rằn ri quân sự PBR
      const camoArmorMat = new THREE.MeshStandardMaterial({
        map: camoTexture,
        roughness: 0.45,
        metalness: 0.55,
      });

      // Thép đậm / bánh xích / khung giá
      const darkSteelMat = new THREE.MeshStandardMaterial({
        color: 0x1f2421,
        roughness: 0.7,
        metalness: 0.8,
      });

      // Kim loại nòng pháo / súng máy
      const gunMetalMat = new THREE.MeshStandardMaterial({
        color: 0x24282a,
        roughness: 0.3,
        metalness: 0.85,
      });

      // 1. THÂN XE TĂNG (HULL)
      const hullGeom = new THREE.BoxGeometry(2.4, 0.75, 4.4);
      const hull = new THREE.Mesh(hullGeom, camoArmorMat);
      hull.position.y = 0.65;
      hull.castShadow = true;
      hull.receiveShadow = true;
      tankRoot.add(hull);

      // Mũi xe vát nghiêng phía trước (Upper Sloped Glacis)
      const glacisGeom = new THREE.BoxGeometry(2.38, 0.2, 1.1);
      const glacis = new THREE.Mesh(glacisGeom, camoArmorMat);
      glacis.position.set(0, 0.88, 1.85);
      glacis.rotation.x = -0.38;
      glacis.castShadow = true;
      tankRoot.add(glacis);

      // Hàng giáp phản ứng nổ (ERA Bricks) trên mũi xe giống ảnh xe 565
      for (let e = 0; e < 6; e++) {
        const eraGeom = new THREE.BoxGeometry(0.34, 0.12, 0.38);
        const era = new THREE.Mesh(eraGeom, camoArmorMat);
        era.position.set(-0.9 + e * 0.36, 0.98, 1.85);
        era.rotation.x = -0.38;
        era.castShadow = true;
        tankRoot.add(era);
      }

      // Tấm chắn bùn hai bên sườn (Fenders)
      const fenderLGeom = new THREE.BoxGeometry(0.25, 0.08, 4.5);
      const fenderL = new THREE.Mesh(fenderLGeom, camoArmorMat);
      fenderL.position.set(-1.3, 0.65, 0);
      tankRoot.add(fenderL);

      const fenderR = fenderL.clone();
      fenderR.position.x = 1.3;
      tankRoot.add(fenderR);

      // Cụm đèn pha trước có khung bảo vệ hai bên
      for (let side = -1; side <= 1; side += 2) {
        const lightBoxGeom = new THREE.BoxGeometry(0.14, 0.12, 0.12);
        const lightBox = new THREE.Mesh(lightBoxGeom, darkSteelMat);
        lightBox.position.set(side * 1.15, 0.82, 2.2);
        tankRoot.add(lightBox);

        const bulbGeom = new THREE.SphereGeometry(0.045, 10, 10);
        const bulbMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfacc15,
          emissiveIntensity: 0.8,
        });
        const bulb = new THREE.Mesh(bulbGeom, bulbMat);
        bulb.position.set(side * 1.15, 0.82, 2.27);
        tankRoot.add(bulb);
      }

      // 2. THÁP PHÁO TRÒN T-54B (TURRET DOME)
      const turretGeom = new THREE.CylinderGeometry(1.08, 1.38, 0.65, 24);
      const turret = new THREE.Mesh(turretGeom, camoArmorMat);
      turret.position.set(0, 1.25, -0.15);
      turret.castShadow = true;
      tankRoot.add(turret);

      // Phiến giáp vát nghiêng mặt trước tháp pháo (Front Applique Wedge Armor)
      for (let side = -1; side <= 1; side += 2) {
        const wedgeGeom = new THREE.BoxGeometry(0.55, 0.45, 0.95);
        const wedge = new THREE.Mesh(wedgeGeom, camoArmorMat);
        wedge.position.set(side * 0.82, 1.28, 0.65);
        wedge.rotation.y = -side * 0.42;
        wedge.castShadow = true;
        tankRoot.add(wedge);
      }

      // Tấm bảng số hiệu chiến thuật "565" & Phù hiệu QĐNDVN hai bên hông tháp pháo
      const turretSideGeom = new THREE.PlaneGeometry(1.35, 0.62);
      const turretSideMat = new THREE.MeshStandardMaterial({
        map: turretMarkingTexture,
        roughness: 0.45,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });

      const numberPlateL = new THREE.Mesh(turretSideGeom, turretSideMat);
      numberPlateL.position.set(-1.18, 1.32, -0.15);
      numberPlateL.rotation.y = -Math.PI / 2;
      tankRoot.add(numberPlateL);

      const numberPlateR = new THREE.Mesh(turretSideGeom, turretSideMat);
      numberPlateR.position.set(1.18, 1.32, -0.15);
      numberPlateR.rotation.y = Math.PI / 2;
      tankRoot.add(numberPlateR);

      // Cửa hầm chỉ huy tròn (Commander Cupola)
      const cupolaGeom = new THREE.CylinderGeometry(0.35, 0.38, 0.18, 16);
      const cupola = new THREE.Mesh(cupolaGeom, darkSteelMat);
      cupola.position.set(-0.48, 1.62, -0.3);
      tankRoot.add(cupola);

      // Cửa hầm nạp đạn bên phải
      const loaderHatchGeom = new THREE.CylinderGeometry(0.3, 0.32, 0.14, 16);
      const loaderHatch = new THREE.Mesh(loaderHatchGeom, darkSteelMat);
      loaderHatch.position.set(0.48, 1.6, -0.3);
      tankRoot.add(loaderHatch);

      // 3. ĐỒNG CHÍ TRƯỞNG XE ĐỨNG CHÀO DUYỆT BINH (COMMANDER SALUTE)
      const commanderGroup = new THREE.Group();
      commanderGroup.position.set(-0.48, 1.72, -0.3);

      // Thân áo rằn ri
      const bodyGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.46, 12);
      const commanderBody = new THREE.Mesh(bodyGeom, camoArmorMat);
      commanderBody.position.y = 0.2;
      commanderGroup.add(commanderBody);

      // Đầu & Mũ công tác xe tăng (Soviet/VN Tanker Helmet)
      const headGeom = new THREE.SphereGeometry(0.13, 14, 14);
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.5 });
      const commanderHead = new THREE.Mesh(headGeom, skinMat);
      commanderHead.position.set(0, 0.5, 0);
      commanderGroup.add(commanderHead);

      const helmetMat = new THREE.MeshStandardMaterial({ color: 0x1e271c, roughness: 0.65 });
      const helmetGeom = new THREE.SphereGeometry(0.148, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.7);
      const helmet = new THREE.Mesh(helmetGeom, helmetMat);
      helmet.position.set(0, 0.52, 0);
      commanderGroup.add(helmet);

      // Gân đệm trên mũ xe tăng
      for (let r = -1; r <= 1; r++) {
        const ribGeom = new THREE.BoxGeometry(0.038, 0.045, 0.22);
        const rib = new THREE.Mesh(ribGeom, helmetMat);
        rib.position.set(r * 0.065, 0.63, 0);
        commanderGroup.add(rib);
      }

      // Cánh tay chào quân lễ với găng tay trắng
      const armGeom = new THREE.CylinderGeometry(0.045, 0.055, 0.26, 8);
      const saluteArm = new THREE.Mesh(armGeom, camoArmorMat);
      saluteArm.position.set(0.16, 0.34, 0.06);
      saluteArm.rotation.set(-0.3, 0.2, -1.05);
      commanderGroup.add(saluteArm);

      const foreArmGeom = new THREE.CylinderGeometry(0.04, 0.048, 0.24, 8);
      const foreArm = new THREE.Mesh(foreArmGeom, camoArmorMat);
      foreArm.position.set(0.24, 0.46, 0.1);
      foreArm.rotation.set(0.2, -0.35, 1.4);
      commanderGroup.add(foreArm);

      const gloveGeom = new THREE.BoxGeometry(0.065, 0.08, 0.03);
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const glove = new THREE.Mesh(gloveGeom, gloveMat);
      glove.position.set(0.14, 0.58, 0.1);
      glove.rotation.set(0.1, -0.2, 0.45);
      commanderGroup.add(glove);

      tankRoot.add(commanderGroup);

      // 4. NÒNG PHÁO CHÍNH 100mm & BẦU HÚT KHÓI (BORE EVACUATOR)
      const barrelGeom = new THREE.CylinderGeometry(0.08, 0.11, 3.4, 18);
      const barrel = new THREE.Mesh(barrelGeom, gunMetalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 1.32, 2.1);
      barrel.castShadow = true;
      tankRoot.add(barrel);

      // Bầu hút khói thuốc súng (Bore Evacuator) ở 2/3 nòng pháo
      const evacuatorGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.65, 18);
      const evacuator = new THREE.Mesh(evacuatorGeom, camoArmorMat);
      evacuator.rotation.x = Math.PI / 2;
      evacuator.position.set(0, 1.32, 2.65);
      evacuator.castShadow = true;
      tankRoot.add(evacuator);

      // Loa giảm giật đầu nòng
      const muzzleGeom = new THREE.CylinderGeometry(0.13, 0.13, 0.28, 16);
      const muzzle = new THREE.Mesh(muzzleGeom, gunMetalMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(0, 1.32, 3.8);
      tankRoot.add(muzzle);

      // Đèn pha hồng ngoại tròn L-2G bên phải nòng pháo
      const irLightGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 16);
      const irLight = new THREE.Mesh(irLightGeom, darkSteelMat);
      irLight.rotation.x = Math.PI / 2;
      irLight.position.set(0.42, 1.48, 1.35);
      irLight.castShadow = true;
      tankRoot.add(irLight);

      const lensGeom = new THREE.CircleGeometry(0.16, 16);
      const lensMat = new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        emissive: 0x60a5fa,
        emissiveIntensity: 0.35,
        roughness: 0.15,
      });
      const lens = new THREE.Mesh(lensGeom, lensMat);
      lens.position.set(0.42, 1.48, 1.5);
      tankRoot.add(lens);

      // Súng máy 12.7mm DShK trên nóc tháp pháo bên phải
      const mgGroup = new THREE.Group();
      mgGroup.position.set(0.48, 1.62, -0.25);

      const mgMountGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8);
      const mgMount = new THREE.Mesh(mgMountGeom, gunMetalMat);
      mgMount.position.y = 0.11;
      mgGroup.add(mgMount);

      const mgBodyGeom = new THREE.BoxGeometry(0.1, 0.14, 0.42);
      const mgBody = new THREE.Mesh(mgBodyGeom, gunMetalMat);
      mgBody.position.set(0, 0.24, 0);
      mgBody.rotation.x = -0.32;
      mgGroup.add(mgBody);

      const drumGeom = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14);
      const mgDrum = new THREE.Mesh(drumGeom, darkSteelMat);
      mgDrum.position.set(-0.09, 0.24, 0.02);
      mgDrum.rotation.z = Math.PI / 2;
      mgGroup.add(mgDrum);

      const mgBarrelGeom = new THREE.CylinderGeometry(0.018, 0.022, 0.78, 8);
      const mgBarrel = new THREE.Mesh(mgBarrelGeom, gunMetalMat);
      mgBarrel.rotation.x = Math.PI / 2;
      mgBarrel.position.set(0, 0.36, 0.55);
      mgGroup.add(mgBarrel);

      tankRoot.add(mgGroup);

      // 5. BÁNH XÍCH & BÁNH TÌ ĐÔI CHỊU LỰC (10 BÁNH HAI BÊN)
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 5; i++) {
          const wheelGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 18);
          const wheel = new THREE.Mesh(wheelGeom, darkSteelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(side * 1.3, 0.35, (i - 2) * 0.88);
          wheel.castShadow = true;
          tankRoot.add(wheel);
          wheelsList.push(wheel);

          // Nắp trục moay-ơ hình sao đặc trưng T-54
          const capGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.26, 12);
          const cap = new THREE.Mesh(capGeom, camoArmorMat);
          cap.rotation.z = Math.PI / 2;
          cap.position.copy(wheel.position);
          tankRoot.add(cap);
        }

        // Bánh chủ động & dẫn hướng
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

      // 6. HAI THÙNG PHUY NHIÊN LIỆU PHỤ 200L PHÍA SAU ĐUÔI XE (AUXILIARY FUEL DRUMS)
      for (let d = -1; d <= 1; d += 2) {
        const fuelDrumGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.9, 18);
        const fuelDrum = new THREE.Mesh(fuelDrumGeom, camoArmorMat);
        fuelDrum.rotation.z = Math.PI / 2;
        fuelDrum.position.set(d * 0.55, 0.78, -2.4);
        fuelDrum.castShadow = true;
        tankRoot.add(fuelDrum);

        // Đai kẹp thép cố định
        for (let s = -1; s <= 1; s += 2) {
          const strapGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 18);
          const strap = new THREE.Mesh(strapGeom, darkSteelMat);
          strap.rotation.z = Math.PI / 2;
          strap.position.set(d * 0.55 + s * 0.32, 0.78, -2.4);
          tankRoot.add(strap);
        }
      }

      // 7. CỘT CỜ ĂNG-TEN & CỜ ĐỎ SAO VÀNG LỤA 3D
      const poleGeom = new THREE.CylinderGeometry(0.02, 0.02, 2.3, 8);
      const pole = new THREE.Mesh(poleGeom, gunMetalMat);
      pole.position.set(0.55, 2.45, -0.6);
      tankRoot.add(pole);

      const flagGeom = new THREE.PlaneGeometry(1.65, 1.1, 24, 16);

      const flagCanvas = document.createElement('canvas');
      flagCanvas.width = 512;
      flagCanvas.height = 340;
      const fCtx = flagCanvas.getContext('2d');
      fCtx.fillStyle = '#da251d';
      fCtx.fillRect(0, 0, 512, 340);
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
      flagMesh.position.set(1.38, 2.9, -0.6);
      flagMesh.castShadow = true;
      tankRoot.add(flagMesh);

      // 8. ĐỐM KHÓI XẢ 3D
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

      // 9. Mặt đất đổ bóng 3D
      const shadowPlaneGeom = new THREE.PlaneGeometry(6, 6);
      const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.45 });
      const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = 0;
      shadowPlane.receiveShadow = true;
      scene.add(shadowPlane);
    };

    // =========================================================================
    // NẠP MODEL .GLB TÙY BIẾN TỪ MẠNG HOẶC DÙNG XE TĂNG 565 PROCEDURAL
    // =========================================================================
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        // Tải thành công file .glb của người dùng
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.6 / maxDim;
        model.scale.set(scale, scale, scale);

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
        // Chưa có file .glb -> Tự động dựng Xe tăng 565 chân thực
        buildProceduralTank();
        setModelTypeLoaded('procedural');
      }
    );

    // =========================================================================
    // ĐIỀU KHIỂN CHUYỂN ĐỘNG & TƯƠNG TÁC
    // =========================================================================
    let startTime = Date.now();
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotY = 0.45;
    let targetRotX = 0.15;

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

      // 1. Sóng cờ lụa 3D
      if (flagMesh && flagMesh.geometry) {
        const posAttr = flagMesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          const waveZ =
            Math.sin(elapsed * 6.5 + x * 4.2) * 0.14 * (x + 0.8) +
            Math.cos(elapsed * 4.2 + y * 3.1) * 0.06;
          posAttr.setZ(i, waveZ);
        }
        posAttr.needsUpdate = true;
      }

      // 2. Quay bánh xích
      wheelsList.forEach((w) => {
        w.rotation.x += 0.06;
      });

      // 3. Khói xả động cơ
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

      // 4. Hoạt cảnh theo MODE
      if (mode === 'showcase') {
        tankRoot.rotation.y += (targetRotY - tankRoot.rotation.y) * 0.08;
        tankRoot.rotation.x += (targetRotX - tankRoot.rotation.x) * 0.08;
        tankRoot.position.y = Math.sin(elapsed * 3) * 0.04;
      } else if (mode === 'parade') {
        const paradeX = -7 + (elapsed * 3.5) % 15;
        tankRoot.position.set(paradeX, Math.sin(elapsed * 5) * 0.05, 0);
        tankRoot.rotation.set(0, Math.PI / 2, 0);
      } else if (mode === 'vortex_suction') {
        suctionProgress = Math.min(1, suctionProgress + 0.016);

        if (suctionProgress < 0.3) {
          const t1 = suctionProgress / 0.3;
          tankRoot.position.z = 5 - t1 * 4;
          tankRoot.position.y = Math.sin(elapsed * 12) * 0.06;
          tankRoot.rotation.y = 0.35 * (1 - t1);
          tankRoot.scale.setScalar(1.0 + t1 * 0.15);
        } else {
          const t2 = (suctionProgress - 0.3) / 0.7;

          let tx = 0;
          let ty = -0.5;
          if (targetPoint) {
            const ndcX = (targetPoint.x / w) * 2 - 1;
            const ndcY = -(targetPoint.y / h) * 2 + 1;
            tx = ndcX * 4.2;
            ty = ndcY * 2.6;
          }

          const angle = t2 * Math.PI * 8;
          const spiralRadius = (1 - t2) * 3.2;

          tankRoot.position.x = tx + Math.cos(angle) * spiralRadius;
          tankRoot.position.y = ty + Math.sin(angle) * spiralRadius * 0.6;
          tankRoot.position.z = (1 - t2) * 2.5 - t2 * 2;

          tankRoot.rotation.z += 0.28;
          tankRoot.rotation.y += 0.35;
          tankRoot.rotation.x = t2 * Math.PI * 2;

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
