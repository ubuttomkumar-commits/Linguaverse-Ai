import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { TransferScenarioCategory } from '../../types/domain';
import { useLanguage } from '../../i18n/LanguageContext';

export interface TransferRealmSummary {
  id: TransferScenarioCategory;
  labelEn: string;
  labelBn: string;
  accentHex: string;
  totalScenarios: number;
  completedScenarios: number;
  inProgressCount: number;
}

interface TransferLabCanvas3DProps {
  realms: TransferRealmSummary[];
  selectedCategory: TransferScenarioCategory | 'all';
  onSelectCategory: (category: TransferScenarioCategory | 'all') => void;
  onSwitchTo2D: () => void;
}

type CameraPreset = 'orbital' | 'overhead';

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createHubFloorTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 10, cx, cx, cx);
    grad.addColorStop(0, 'rgba(0, 217, 255, 0.28)');
    grad.addColorStop(0.45, 'rgba(8, 123, 255, 0.14)');
    grad.addColorStop(0.76, 'rgba(135, 59, 255, 0.06)');
    grad.addColorStop(1, 'rgba(5, 9, 31, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(0, 217, 255, 0.22)';
    ctx.lineWidth = 1.4;
    for (const r of [34, 68, 104]) {
      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRealmLabelSprite(
  title: string,
  progressText: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 88;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(6, 12, 34, 0.88)';
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;

    const x = 12;
    const y = 10;
    const w = canvas.width - 24;
    const h = canvas.height - 20;
    const r = 14;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const shortTitle = title.length > 22 ? `${title.slice(0, 20)}…` : title;
    ctx.fillText(shortTitle, canvas.width / 2, 34);

    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillStyle = accentHex;
    ctx.fillText(progressText, canvas.width / 2, 58);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, maxAnisotropy);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.35, 0.62, 1);
  return sprite;
}

export default function TransferLabCanvas3D({
  realms,
  selectedCategory,
  onSelectCategory,
  onSwitchTo2D,
}: TransferLabCanvas3DProps) {
  const { lang } = useLanguage();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('orbital');
  const [isPaused, setIsPaused] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });

  const realmsRef = useRef(realms);
  const selectedRef = useRef(selectedCategory);
  const onSelectRef = useRef(onSelectCategory);
  const pausedRef = useRef(isPaused);
  const presetRef = useRef<CameraPreset>(cameraPreset);
  const cameraGoalRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  realmsRef.current = realms;
  selectedRef.current = selectedCategory;
  onSelectRef.current = onSelectCategory;
  pausedRef.current = isPaused;
  presetRef.current = cameraPreset;

  useEffect(() => {
    if (cameraPreset === 'overhead') {
      cameraGoalRef.current = {
        pos: new THREE.Vector3(0, 9.4, 3.2),
        target: new THREE.Vector3(0, 0.1, 0),
      };
    } else {
      cameraGoalRef.current = {
        pos: new THREE.Vector3(0, 4.8, 11.2),
        target: new THREE.Vector3(0, 0.25, 0),
      };
    }
  }, [cameraPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(260, container.clientHeight);
    renderer.setPixelRatio(isSoftGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05091f);
    scene.fog = new THREE.FogExp2(0x05091f, 0.042);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(0, 4.8, 11.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 5.4;
    controls.maxDistance = 14.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.08;
    controls.target.set(0, 0.25, 0);

    // Balanced lighting
    const hemi = new THREE.HemisphereLight(0x88c9ff, 0x0b102c, 0.85);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 1.35);
    keyLight.position.set(6, 9, 7);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x873bff, 2.2, 22);
    rimLight.position.set(-6, 3.5, -5);
    scene.add(rimLight);
    const cyanFill = new THREE.PointLight(0x00d9ff, 1.8, 18);
    cyanFill.position.set(5, 2.4, 4);
    scene.add(cyanFill);

    // Subtle radial ground plane
    const floorTex = createHubFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(13.5, 13.5);
    const floorMat = new THREE.MeshBasicMaterial({
      map: floorTex,
      transparent: true,
      depthWrite: false,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.15;
    scene.add(floor);

    // Composite Central Transfer Core (4 parts: icosahedron core, wireframe cage, 2 gyroscopic rings)
    const hubGroup = new THREE.Group();
    hubGroup.position.set(0, 0.35, 0);
    scene.add(hubGroup);

    const coreGeo = new THREE.IcosahedronGeometry(0.92, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x087bff,
      emissive: 0x0088cc,
      emissiveIntensity: 0.55,
      metalness: 0.45,
      roughness: 0.22,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    hubGroup.add(coreMesh);

    const cageGeo = new THREE.IcosahedronGeometry(1.18, 0);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x00d9ff,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    hubGroup.add(cageMesh);

    const outerRingGeo = new THREE.TorusGeometry(1.58, 0.032, 12, 64);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x087bff,
      emissiveIntensity: 0.45,
      metalness: 0.65,
      roughness: 0.25,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 2.6;
    hubGroup.add(outerRing);

    const innerRingGeo = new THREE.TorusGeometry(1.36, 0.024, 12, 48);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x873bff,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.5,
      metalness: 0.55,
      roughness: 0.3,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.y = Math.PI / 3;
    hubGroup.add(innerRing);

    // 6 Composite Realm Nodes (one per Scenario Universe category)
    const realmNodes: Array<{
      id: TransferScenarioCategory;
      group: THREE.Group;
      hitMesh: THREE.Mesh;
      ring: THREE.Mesh;
      satellite: THREE.Mesh;
      coreMat: THREE.MeshStandardMaterial;
      baseY: number;
      angle: number;
    }> = [];

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const orbitRadius = 3.95;

    realmsRef.current.forEach((realm, idx) => {
      const angle = (idx / Math.max(1, realmsRef.current.length)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      const baseY = idx % 2 === 0 ? 0.52 : -0.05;
      const accentColor = new THREE.Color(realm.accentHex);

      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(x, baseY, z);
      scene.add(nodeGroup);

      // Part 1: Faceted crystal core
      const nodeCoreGeo = new THREE.OctahedronGeometry(0.48, 1);
      const ratio = realm.totalScenarios > 0 ? realm.completedScenarios / realm.totalScenarios : 0;
      const nodeCoreMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.24 + ratio * 0.55,
        metalness: 0.4,
        roughness: 0.28,
      });
      const nodeCore = new THREE.Mesh(nodeCoreGeo, nodeCoreMat);
      nodeCore.userData.categoryId = realm.id;
      nodeGroup.add(nodeCore);

      // Part 2: Equatorial ring
      const ringGeo = new THREE.TorusGeometry(0.74, 0.025, 10, 40);
      const ringMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.35,
        metalness: 0.6,
        roughness: 0.3,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.2;
      nodeGroup.add(ringMesh);

      // Part 3: Orbiting telemetry satellite
      const satGeo = new THREE.SphereGeometry(0.11, 12, 12);
      const satMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        emissive: accentColor,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      });
      const satellite = new THREE.Mesh(satGeo, satMat);
      satellite.position.set(0.78, 0.16, 0);
      nodeGroup.add(satellite);

      // Part 4: Pedestal energy halo disc
      const discGeo = new THREE.RingGeometry(0.46, 0.66, 28);
      const discMat = new THREE.MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = -0.64;
      nodeGroup.add(disc);

      // Part 5: Curved neural bridge to center hub
      const mid = new THREE.Vector3(x * 0.5, (baseY + 0.35) * 0.5 + 0.62, z * 0.5);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0.35, 0),
        mid,
        new THREE.Vector3(x, baseY, z)
      );
      const bridgeGeo = new THREE.TubeGeometry(curve, 22, 0.02, 6, false);
      const bridgeMat = new THREE.MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.28 + ratio * 0.35,
      });
      const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
      scene.add(bridgeMesh);

      // Floating readable label sprite
      const progressText = `${realm.completedScenarios}/${realm.totalScenarios} verified`;
      const sprite = createRealmLabelSprite(
        lang === 'bn' ? realm.labelBn : realm.labelEn,
        progressText,
        realm.accentHex,
        maxAniso
      );
      sprite.position.set(0, 1.05, 0);
      nodeGroup.add(sprite);

      realmNodes.push({
        id: realm.id,
        group: nodeGroup,
        hitMesh: nodeCore,
        ring: ringMesh,
        satellite,
        coreMat: nodeCoreMat,
        baseY,
        angle,
      });
    });

    // Subtle instanced neural particles
    const particleCount = isSoftGl ? 42 : 90;
    const particleGeo = new THREE.SphereGeometry(0.032, 6, 6);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
    });
    const particles = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
    const dummy = new THREE.Object3D();
    const particleSeeds = Array.from({ length: particleCount }, (_, idx) => ({
      radius: 2.0 + ((idx * 17) % 45) * 0.12,
      angle: (idx / particleCount) * Math.PI * 2,
      y: ((idx * 23) % 30) * 0.14 - 1.2,
      speed: 0.12 + (idx % 5) * 0.04,
    }));
    scene.add(particles);

    // Raycasting for clicking a realm node
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };
    const handlePointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
      if (dist > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(
        realmNodes.map((n) => n.hitMesh),
        false
      );
      if (hits.length > 0) {
        const hitCat = hits[0].object.userData.categoryId as TransferScenarioCategory | undefined;
        if (hitCat) {
          onSelectRef.current(selectedRef.current === hitCat ? 'all' : hitCat);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver for crisp responsive canvas
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(260, entry.contentRect.width);
        const h = Math.max(240, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // Animation loop (paced safely for software WebGL, paused when tab hidden or user paused)
    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let elapsed = 0;
    let lastTs = performance.now();

    const drawFrame = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      if (!pausedRef.current && !document.hidden) {
        elapsed += dt;
        coreMesh.rotation.y += dt * 0.32;
        cageMesh.rotation.y -= dt * 0.18;
        cageMesh.rotation.x += dt * 0.08;
        outerRing.rotation.z += dt * 0.28;
        innerRing.rotation.x -= dt * 0.35;

        realmNodes.forEach((node, idx) => {
          const isSelected = selectedRef.current === node.id;
          const targetScale = isSelected ? 1.2 : 1.0;
          node.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
          node.group.position.y = node.baseY + Math.sin(elapsed * 1.15 + idx * 1.1) * 0.12;
          node.ring.rotation.z += dt * (isSelected ? 0.9 : 0.35);
          const satAngle = elapsed * 1.4 + idx;
          node.satellite.position.set(
            Math.cos(satAngle) * 0.78,
            Math.sin(satAngle * 1.5) * 0.16,
            Math.sin(satAngle) * 0.78
          );
          node.coreMat.emissiveIntensity = isSelected ? 0.92 : 0.34;
        });

        for (let i = 0; i < particleCount; i++) {
          const p = particleSeeds[i];
          const a = p.angle + elapsed * p.speed * 0.35;
          dummy.position.set(
            Math.cos(a) * p.radius,
            p.y + Math.sin(elapsed * 0.8 + i) * 0.18,
            Math.sin(a) * p.radius
          );
          dummy.updateMatrix();
          particles.setMatrixAt(i, dummy.matrix);
        }
        particles.instanceMatrix.needsUpdate = true;
      }

      if (cameraGoalRef.current) {
        camera.position.lerp(cameraGoalRef.current.pos, 0.09);
        controls.target.lerp(cameraGoalRef.current.target, 0.09);
        if (camera.position.distanceTo(cameraGoalRef.current.pos) < 0.06) {
          cameraGoalRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftGl) {
        // Software-WebGL / low-end device pacing: avoid CPU starvation while staying smoothly animated
        timerId = window.setTimeout(() => {
          if (!disposed) rafId = window.requestAnimationFrame(drawFrame);
        }, pausedRef.current ? 900 : 420);
      } else {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    const handleControlChange = () => {
      if (isSoftGl && !disposed) {
        renderer.render(scene, camera);
      }
    };
    controls.addEventListener('change', handleControlChange);

    rafId = window.requestAnimationFrame(drawFrame);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.removeEventListener('change', handleControlChange);
      controls.dispose();
      envTex.dispose();
      pmrem.dispose();
      floorTex.dispose();
      renderer.dispose();
    };
  }, [lang]);

  if (webglError) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center rounded-2xl border border-cyan-500/20 bg-[#070E2A] p-6 text-center">
        <p className="text-sm font-medium text-slate-200">
          {lang === 'bn'
            ? 'এই ব্রাউজারে WebGL 3D রেন্ডারিং পাওয়া যায়নি। 2D ইন্টারেক্টিভ ম্যাপ ব্যবহার করুন।'
            : 'WebGL 3D rendering is unavailable in this browser. Switch to the interactive 2D Transfer Map.'}
        </p>
        <button
          type="button"
          onClick={onSwitchTo2D}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/30"
        >
          <Layers className="h-4 w-4" />
          {lang === 'bn' ? '2D ট্রান্সফার ম্যাপ খুলুন' : 'Open 2D Transfer Map'}
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="transfer-hub-3d"
      data-selected-category={selectedCategory}
      className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#05091F] sm:h-[360px]"
    >
      <div
        ref={mountRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        aria-label={
          lang === 'bn'
            ? 'ইন্টারেক্টিভ 3D কমিউনিকেশন ট্রান্সফার হাব — কোনো ক্যাটাগরি নোডে ক্লিক করে সিনারিও ফিল্টার করুন'
            : 'Interactive 3D Communication Transfer Hub — click any category realm node to filter scenarios'
        }
      />

      {/* Minimal top-left orientation caption (no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-slate-700/70 bg-[#060C24]/90 px-3 py-1.5 text-xs text-slate-300">
        <span className="font-semibold text-cyan-300">
          {lang === 'bn' ? '3D ট্রান্সফার হাব' : '3D Transfer Hub'}
        </span>
        <span className="mx-1.5 text-slate-600">·</span>
        <span>
          {lang === 'bn'
            ? 'ড্র্যাগ করে ঘোরান · নোডে ক্লিক করে ফিল্টার করুন'
            : 'Drag to orbit · Click a realm node to filter'}
        </span>
      </div>

      {/* Collapsible bottom control dock (solid dark surface — zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
        {dockOpen && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#070E28]/95 p-1.5 text-xs shadow-xl">
            <button
              type="button"
              onClick={() => setCameraPreset('orbital')}
              className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                cameraPreset === 'orbital'
                  ? 'bg-cyan-500/25 text-cyan-200'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {lang === 'bn' ? 'অরবিট' : 'Orbital'}
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('overhead')}
              className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                cameraPreset === 'overhead'
                  ? 'bg-cyan-500/25 text-cyan-200'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {lang === 'bn' ? 'টপ ম্যাপ' : 'Top Map'}
            </button>
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? 'Resume 3D motion' : 'Pause 3D motion'}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium text-slate-200 transition hover:bg-slate-800"
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {isPaused ? (lang === 'bn' ? 'চালু' : 'Play') : lang === 'bn' ? 'বিরতি' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraPreset('orbital');
                onSelectCategory('all');
                cameraGoalRef.current = {
                  pos: new THREE.Vector3(0, 4.8, 11.2),
                  target: new THREE.Vector3(0, 0.25, 0),
                };
              }}
              aria-label="Reset 3D view"
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium text-slate-300 transition hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'রিসেট' : 'Reset'}
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSwitchTo2D}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#070E28]/95 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200"
          >
            <Layers className="h-3.5 w-3.5 text-cyan-300" />
            {lang === 'bn' ? '2D ম্যাপ' : '2D Map'}
          </button>
          <button
            type="button"
            onClick={() => setDockOpen((o) => !o)}
            aria-expanded={dockOpen}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#070E28]/95 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/50"
          >
            {lang === 'bn' ? 'কন্ট্রোল' : 'Controls'}
            {dockOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
