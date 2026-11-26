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
import type {
  DnaNodeVisualState,
  DnaSkillId,
  DnaSkillNode,
} from '../../../domain/communicationDnaLabEngine';
import { useLanguage } from '../../../i18n/LanguageContext';

export type DnaCameraPreset = 'helix' | 'orbital' | 'focus';

interface CommunicationDnaCanvas3DProps {
  skills: DnaSkillNode[];
  selectedSkillId: DnaSkillId;
  onSelectSkill: (id: DnaSkillId) => void;
  onSwitchTo2D: () => void;
}

const STATE_HEX: Record<DnaNodeVisualState, number> = {
  strong: 0x00d9ff,
  developing: 0x3b82f6,
  needs_attention: 0xf59e0b,
  insufficient: 0x64748b,
};

const STATE_EMISSIVE: Record<DnaNodeVisualState, number> = {
  strong: 0x0088b8,
  developing: 0x1d4ed8,
  needs_attention: 0xb45309,
  insufficient: 0x1e293b,
};

const STATE_TEXT_HEX: Record<DnaNodeVisualState, string> = {
  strong: '#67E8F9',
  developing: '#93C5FD',
  needs_attention: '#FCD34D',
  insufficient: '#94A3B8',
};

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

function createRadialFloorTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 8, cx, cx, cx);
    grad.addColorStop(0, 'rgba(0, 217, 255, 0.32)');
    grad.addColorStop(0.45, 'rgba(56, 100, 255, 0.14)');
    grad.addColorStop(0.78, 'rgba(128, 80, 255, 0.06)');
    grad.addColorStop(1, 'rgba(6, 12, 36, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(0, 217, 255, 0.24)';
    ctx.lineWidth = 1.5;
    for (const r of [42, 78, 112]) {
      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createNodeLabelSprite(
  label: string,
  scoreText: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 88;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle dark capsule backing for legible 3D contrast
    ctx.fillStyle = 'rgba(7, 13, 38, 0.84)';
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    const rx = 14;
    const x = 14;
    const y = 10;
    const w = canvas.width - 28;
    const h = canvas.height - 20;
    ctx.beginPath();
    ctx.moveTo(x + rx, y);
    ctx.lineTo(x + w - rx, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rx);
    ctx.lineTo(x + w, y + h - rx);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
    ctx.lineTo(x + rx, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rx);
    ctx.lineTo(x, y + rx);
    ctx.quadraticCurveTo(x, y, x + rx, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F5F7FF';
    ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 18), canvas.width / 2, 34);

    ctx.fillStyle = accentHex;
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(scoreText, canvas.width / 2, 60);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.max(1, maxAnisotropy);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.48, 0.41, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// Reusable scratch math objects outside the animation loop (Zero GC)
const _scratchVec = new THREE.Vector3();
const _scratchTargetPos = new THREE.Vector3();
const _scratchLookTarget = new THREE.Vector3();
const _scratchDummy = new THREE.Object3D();
const _scratchMouse = new THREE.Vector2();

export function CommunicationDnaCanvas3D({
  skills,
  selectedSkillId,
  onSelectSkill,
  onSwitchTo2D,
}: CommunicationDnaCanvas3DProps) {
  const { lang } = useLanguage();
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [cameraPreset, setCameraPreset] = useState<DnaCameraPreset>('helix');
  const [paused, setPaused] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [hoveredSkillId, setHoveredSkillId] = useState<DnaSkillId | null>(null);
  const [webglError, setWebglError] = useState(false);

  // Refs to keep Three.js lifecycle mounted once without teardown on React state updates
  const skillsRef = useRef(skills);
  const selectedRef = useRef(selectedSkillId);
  const onSelectRef = useRef(onSelectSkill);
  const presetRef = useRef<DnaCameraPreset>(cameraPreset);
  const pausedRef = useRef(paused);
  const langRef = useRef(lang);
  const transitionActiveRef = useRef(false);
  const triggerResetRef = useRef<(() => void) | null>(null);
  const syncVisualsRef = useRef<(() => void) | null>(null);

  skillsRef.current = skills;
  selectedRef.current = selectedSkillId;
  onSelectRef.current = onSelectSkill;
  presetRef.current = cameraPreset;
  pausedRef.current = paused;
  langRef.current = lang;

  useEffect(() => {
    transitionActiveRef.current = true;
    syncVisualsRef.current?.();
  }, [skills, selectedSkillId, cameraPreset, lang]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 360);

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x060c24, 1);

    container.innerHTML = '';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D Communication DNA Neural Network');
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Scene + Fog + Procedural Studio Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c24);
    scene.fog = new THREE.FogExp2(0x060c24, 0.048);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // Camera + OrbitControls (framed slightly higher & wider to leave clear margin above bottom dock)
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0.2, 0.45, 10.3);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 4.8;
    controls.maxDistance = 14.5;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.autoRotate = false;
    controls.target.set(0, -0.42, 0);

    controls.addEventListener('start', () => {
      // Cancel scripted preset glide when user manually drags/zooms
      transitionActiveRef.current = false;
    });

    // Balanced Warm/Cool Studio Lighting Rig (same intensities on GPU & software GL)
    const hemiLight = new THREE.HemisphereLight(0x64d2ff, 0x1a1040, 1.0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.85);
    keyLight.position.set(5.5, 7.5, 6.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 25;
      keyLight.shadow.camera.left = -5;
      keyLight.shadow.camera.right = 5;
      keyLight.shadow.camera.top = 5;
      keyLight.shadow.camera.bottom = -5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const cyanRimLight = new THREE.PointLight(0x00d9ff, 3.2, 16, 1.6);
    cyanRimLight.position.set(-4.2, 2.2, 3.4);
    scene.add(cyanRimLight);

    const violetFillLight = new THREE.PointLight(0x9b5cff, 3.0, 16, 1.6);
    violetFillLight.position.set(4.4, -1.8, -2.6);
    scene.add(violetFillLight);

    // Master rotating neural group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Grounded radial holographic projection disc below the DNA column
    const floorTex = createRadialFloorTexture();
    const floorGeo = new THREE.CircleGeometry(3.8, 48);
    const floorMat = new THREE.MeshBasicMaterial({
      map: floorTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    });
    const floorDisc = new THREE.Mesh(floorGeo, floorMat);
    floorDisc.rotation.x = -Math.PI / 2;
    floorDisc.position.y = -3.02;
    scene.add(floorDisc);

    // Disposables tracker
    const disposables: Array<{ dispose: () => void }> = [floorTex, floorGeo, floorMat, envRT];

    // -----------------------------------------------------------------------
    // 1. Composite Central Communication DNA Double Helix + Intelligence Core
    // -----------------------------------------------------------------------
    const helixGroup = new THREE.Group();
    rootGroup.add(helixGroup);

    const strandAPoints: THREE.Vector3[] = [];
    const strandBPoints: THREE.Vector3[] = [];
    const helixHeight = 4.9;
    const helixRadius = 0.78;
    const turns = 2.15;
    const segments = 72;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = (t - 0.5) * helixHeight;
      const angle = t * Math.PI * 2 * turns;
      strandAPoints.push(new THREE.Vector3(Math.cos(angle) * helixRadius, y, Math.sin(angle) * helixRadius));
      strandBPoints.push(
        new THREE.Vector3(
          Math.cos(angle + Math.PI) * helixRadius,
          y,
          Math.sin(angle + Math.PI) * helixRadius
        )
      );
    }

    const strandACurve = new THREE.CatmullRomCurve3(strandAPoints);
    const strandBCurve = new THREE.CatmullRomCurve3(strandBPoints);

    const strandAGeo = new THREE.TubeGeometry(strandACurve, 96, 0.068, 12, false);
    const strandBGeo = new THREE.TubeGeometry(strandBCurve, 96, 0.068, 12, false);

    const strandAMat = new THREE.MeshPhysicalMaterial({
      color: 0x00d9ff,
      emissive: 0x0077b6,
      emissiveIntensity: 0.55,
      metalness: 0.55,
      roughness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    });
    const strandBMat = new THREE.MeshPhysicalMaterial({
      color: 0x9b5cff,
      emissive: 0x5b21b6,
      emissiveIntensity: 0.55,
      metalness: 0.62,
      roughness: 0.22,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
    });

    const strandAMesh = new THREE.Mesh(strandAGeo, strandAMat);
    const strandBMesh = new THREE.Mesh(strandBGeo, strandBMat);
    helixGroup.add(strandAMesh, strandBMesh);
    disposables.push(strandAGeo, strandBGeo, strandAMat, strandBMat);

    // 16 Nucleotide base-pair rungs + metallic end caps
    const rungGeo = new THREE.CylinderGeometry(0.024, 0.024, 1, 8);
    const rungCapGeo = new THREE.SphereGeometry(0.056, 12, 12);
    const rungMatCyan = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      metalness: 0.72,
      roughness: 0.28,
    });
    const rungMatViolet = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.4,
      metalness: 0.72,
      roughness: 0.28,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.3,
      metalness: 0.85,
      roughness: 0.16,
    });
    disposables.push(rungGeo, rungCapGeo, rungMatCyan, rungMatViolet, capMat);

    const rungCount = 16;
    const upAxis = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < rungCount; i++) {
      const t = (i + 0.5) / rungCount;
      const pA = strandACurve.getPoint(t);
      const pB = strandBCurve.getPoint(t);
      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(pB, pA);
      const len = dir.length();

      const rung = new THREE.Mesh(rungGeo, i % 2 === 0 ? rungMatCyan : rungMatViolet);
      rung.position.copy(mid);
      rung.scale.set(1, len, 1);
      rung.quaternion.setFromUnitVectors(upAxis, dir.normalize());
      helixGroup.add(rung);

      const capA = new THREE.Mesh(rungCapGeo, capMat);
      capA.position.copy(pA);
      const capB = new THREE.Mesh(rungCapGeo, capMat);
      capB.position.copy(pB);
      helixGroup.add(capA, capB);
    }

    // Central luminous intelligence core + 3 inclined orbital rings
    const coreGroup = new THREE.Group();
    helixGroup.add(coreGroup);

    const innerCoreGeo = new THREE.IcosahedronGeometry(0.42, 1);
    const innerCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x00d9ff,
      emissive: 0x2864ff,
      emissiveIntensity: 0.85,
      metalness: 0.2,
      roughness: 0.14,
      clearcoat: 1.0,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    coreGroup.add(innerCoreMesh);

    const cageGeo = new THREE.IcosahedronGeometry(0.56, 1);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.45,
      wireframe: true,
      metalness: 0.8,
      roughness: 0.2,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    coreGroup.add(cageMesh);
    disposables.push(innerCoreGeo, innerCoreMat, cageGeo, cageMat);

    const orbitRingConfigs = [
      { radius: 2.85, tube: 0.012, color: 0x00d9ff, rx: Math.PI * 0.42, ry: 0.25, opacity: 0.34 },
      { radius: 3.25, tube: 0.01, color: 0x8050ff, rx: -Math.PI * 0.34, ry: -0.4, opacity: 0.28 },
      { radius: 3.6, tube: 0.008, color: 0x2864ff, rx: Math.PI * 0.16, ry: 0.72, opacity: 0.2 },
    ];
    const orbitRings: THREE.Mesh[] = [];
    for (const cfg of orbitRingConfigs) {
      const ringGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 12, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(cfg.rx, cfg.ry, 0);
      rootGroup.add(ring);
      orbitRings.push(ring);
      disposables.push(ringGeo, ringMat);
    }

    // -----------------------------------------------------------------------
    // 2. 10 Composite Skill Nodes (4-Part Group + Raycast Proxy + Sprite Label)
    // -----------------------------------------------------------------------
    const nodeCoreGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const nodeRingGeo = new THREE.TorusGeometry(0.35, 0.022, 12, 36);
    const nodeHaloGeo = new THREE.TorusGeometry(0.44, 0.014, 10, 36);
    const proxyGeo = new THREE.SphereGeometry(0.5, 12, 12);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    disposables.push(nodeCoreGeo, nodeRingGeo, nodeHaloGeo, proxyGeo, proxyMat);

    interface SkillNodeRig {
      id: DnaSkillId;
      group: THREE.Group;
      coreMat: THREE.MeshPhysicalMaterial;
      ringMesh: THREE.Mesh;
      ringMat: THREE.MeshStandardMaterial;
      haloMesh: THREE.Mesh;
      haloMat: THREE.MeshBasicMaterial;
      proxyMesh: THREE.Mesh;
      labelSprite: THREE.Sprite;
      basePos: THREE.Vector3;
    }

    const nodeRigs = new Map<DnaSkillId, SkillNodeRig>();
    const interactables: THREE.Object3D[] = [];

    const initialSkills = skillsRef.current;
    for (const skill of initialSkills) {
      const nodeGroup = new THREE.Group();
      const basePos = new THREE.Vector3(skill.position3D[0], skill.position3D[1], skill.position3D[2]);
      nodeGroup.position.copy(basePos);

      const stateColor = STATE_HEX[skill.visualState];
      const stateEmissive = STATE_EMISSIVE[skill.visualState];

      const coreMat = new THREE.MeshPhysicalMaterial({
        color: stateColor,
        emissive: stateEmissive,
        emissiveIntensity: skill.visualState === 'insufficient' ? 0.18 : 0.62,
        metalness: 0.25,
        roughness: 0.16,
        clearcoat: 0.9,
      });
      const coreMesh = new THREE.Mesh(nodeCoreGeo, coreMat);
      nodeGroup.add(coreMesh);

      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        emissive: stateColor,
        emissiveIntensity: 0.45,
        metalness: 0.88,
        roughness: 0.22,
      });
      const ringMesh = new THREE.Mesh(nodeRingGeo, ringMat);
      ringMesh.rotation.set(Math.PI * 0.35, Math.PI * 0.2, 0);
      nodeGroup.add(ringMesh);

      const haloMat = new THREE.MeshBasicMaterial({
        color: stateColor,
        transparent: true,
        opacity: 0.28,
      });
      const haloMesh = new THREE.Mesh(nodeHaloGeo, haloMat);
      haloMesh.rotation.set(-Math.PI * 0.28, 0.3, 0);
      nodeGroup.add(haloMesh);

      const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
      proxyMesh.userData = { skillId: skill.id };
      nodeGroup.add(proxyMesh);
      interactables.push(proxyMesh);

      const scoreText =
        skill.scorePercent !== null ? `${skill.scorePercent}%` : `${skill.sampleSize}/3`;
      const labelSprite = createNodeLabelSprite(
        langRef.current === 'bn' ? skill.shortLabelBn : skill.shortLabelEn,
        scoreText,
        STATE_TEXT_HEX[skill.visualState],
        maxAnisotropy
      );
      labelSprite.position.set(0, -0.56, 0);
      nodeGroup.add(labelSprite);

      rootGroup.add(nodeGroup);
      disposables.push(coreMat, ringMat, haloMat);

      nodeRigs.set(skill.id, {
        id: skill.id,
        group: nodeGroup,
        coreMat,
        ringMesh,
        ringMat,
        haloMesh,
        haloMat,
        proxyMesh,
        labelSprite,
        basePos,
      });
    }

    // -----------------------------------------------------------------------
    // 3. Curved Neural Pathways + Animated Energy Pulses (InstancedMesh)
    // -----------------------------------------------------------------------
    const pulseCurves: THREE.CatmullRomCurve3[] = [];
    const seenEdges = new Set<string>();
    const pathwayMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.26,
    });
    const coreSpokeMat = new THREE.LineBasicMaterial({
      color: 0x8050ff,
      transparent: true,
      opacity: 0.32,
    });
    disposables.push(pathwayMat, coreSpokeMat);

    for (const skill of initialSkills) {
      const rigA = nodeRigs.get(skill.id);
      if (!rigA) continue;

      // Spoke from central helix axis to each skill node
      const helixAnchor = new THREE.Vector3(0, rigA.basePos.y * 0.55, 0);
      const midSpoke = new THREE.Vector3()
        .addVectors(helixAnchor, rigA.basePos)
        .multiplyScalar(0.5);
      midSpoke.y += 0.22;
      const spokeCurve = new THREE.CatmullRomCurve3([helixAnchor, midSpoke, rigA.basePos.clone()]);
      const spokeGeo = new THREE.BufferGeometry().setFromPoints(spokeCurve.getPoints(20));
      rootGroup.add(new THREE.Line(spokeGeo, coreSpokeMat));
      disposables.push(spokeGeo);
      pulseCurves.push(spokeCurve);

      // Inter-skill neural connections
      for (const targetId of skill.connectedTo) {
        const edgeKey = [skill.id, targetId].sort().join('--');
        if (seenEdges.has(edgeKey)) continue;
        seenEdges.add(edgeKey);
        const rigB = nodeRigs.get(targetId);
        if (!rigB) continue;

        const mid = new THREE.Vector3()
          .addVectors(rigA.basePos, rigB.basePos)
          .multiplyScalar(0.5);
        mid.multiplyScalar(0.84);
        const edgeCurve = new THREE.CatmullRomCurve3([
          rigA.basePos.clone(),
          mid,
          rigB.basePos.clone(),
        ]);
        const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgeCurve.getPoints(20));
        rootGroup.add(new THREE.Line(edgeGeo, pathwayMat));
        disposables.push(edgeGeo);
        if (pulseCurves.length < 18) pulseCurves.push(edgeCurve);
      }
    }

    // Energy Pulse Orbs along pathways
    const pulseGeo = new THREE.SphereGeometry(0.048, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const pulseMesh = new THREE.InstancedMesh(pulseGeo, pulseMat, pulseCurves.length);
    pulseMesh.frustumCulled = false;
    rootGroup.add(pulseMesh);
    disposables.push(pulseGeo, pulseMat);

    // Instanced Ambient Neural Dust Particles (140 particles)
    const particleCount = 140;
    const particleGeo = new THREE.SphereGeometry(0.024, 6, 6);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
    });
    const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
    particleMesh.frustumCulled = false;
    const particleSeeds: Array<{
      angle: number;
      radius: number;
      y: number;
      speed: number;
      scale: number;
    }> = [];
    const cyanColor = new THREE.Color(0x00d9ff);
    const violetColor = new THREE.Color(0xa855f7);
    const blueColor = new THREE.Color(0x3b82f6);

    for (let i = 0; i < particleCount; i++) {
      // Deterministic pseudo-random distribution
      const s1 = Math.sin(i * 12.9898) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const s2 = Math.sin(i * 78.233) * 24634.6345;
      const r2 = s2 - Math.floor(s2);
      const s3 = Math.sin(i * 45.164) * 19384.231;
      const r3 = s3 - Math.floor(s3);

      const seed = {
        angle: r1 * Math.PI * 2,
        radius: 1.4 + r2 * 3.4,
        y: (r3 - 0.5) * 5.6,
        speed: 0.08 + r2 * 0.14,
        scale: 0.65 + r1 * 0.9,
      };
      particleSeeds.push(seed);
      _scratchDummy.position.set(
        Math.cos(seed.angle) * seed.radius,
        seed.y,
        Math.sin(seed.angle) * seed.radius
      );
      _scratchDummy.scale.setScalar(seed.scale);
      _scratchDummy.updateMatrix();
      particleMesh.setMatrixAt(i, _scratchDummy.matrix);
      particleMesh.setColorAt(i, i % 3 === 0 ? cyanColor : i % 3 === 1 ? violetColor : blueColor);
    }
    particleMesh.instanceMatrix.needsUpdate = true;
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
    particleMesh.computeBoundingSphere();
    rootGroup.add(particleMesh);
    disposables.push(particleGeo, particleMat);

    // Sync skill colors/labels whenever React state updates
    const syncNodeVisuals = () => {
      const currentSkills = skillsRef.current;
      const selId = selectedRef.current;
      for (const skill of currentSkills) {
        const rig = nodeRigs.get(skill.id);
        if (!rig) continue;
        const isSelected = skill.id === selId;
        const stateColor = STATE_HEX[skill.visualState];
        const stateEmissive = STATE_EMISSIVE[skill.visualState];

        rig.coreMat.color.setHex(stateColor);
        rig.coreMat.emissive.setHex(isSelected ? stateColor : stateEmissive);
        rig.coreMat.emissiveIntensity = isSelected
          ? 1.15
          : skill.visualState === 'insufficient'
            ? 0.2
            : 0.62;

        rig.ringMat.emissive.setHex(stateColor);
        rig.ringMat.emissiveIntensity = isSelected ? 0.95 : 0.45;
        rig.haloMat.color.setHex(isSelected ? 0x00f0ff : stateColor);
        rig.haloMat.opacity = isSelected ? 0.82 : 0.28;

        const targetScale = isSelected ? 1.24 : 1.0;
        rig.group.scale.setScalar(targetScale);

        // Refresh sprite label cleanly
        const scoreText =
          skill.scorePercent !== null ? `${skill.scorePercent}%` : `${skill.sampleSize}/3`;
        const nextSprite = createNodeLabelSprite(
          langRef.current === 'bn' ? skill.shortLabelBn : skill.shortLabelEn,
          scoreText,
          STATE_TEXT_HEX[skill.visualState],
          maxAnisotropy
        );
        nextSprite.position.copy(rig.labelSprite.position);
        const oldMat = rig.labelSprite.material;
        if (oldMat.map) oldMat.map.dispose();
        oldMat.dispose();
        rig.group.remove(rig.labelSprite);
        rig.group.add(nextSprite);
        rig.labelSprite = nextSprite;
      }
    };
    syncVisualsRef.current = syncNodeVisuals;
    syncNodeVisuals();

    triggerResetRef.current = () => {
      presetRef.current = 'helix';
      setCameraPreset('helix');
      transitionActiveRef.current = true;
    };

    // Raycasting (throttled pointermove + click selection)
    const raycaster = new THREE.Raycaster();
    let pointerDownPos = { x: 0, y: 0 };
    let lastMoveCheck = 0;
    let activeHoverId: DnaSkillId | null = null;

    const updateMouseFromEvent = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _scratchMouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      _scratchMouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveCheck < 55) return;
      lastMoveCheck = now;

      updateMouseFromEvent(ev);
      raycaster.setFromCamera(_scratchMouse, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      const hitId = (hits[0]?.object.userData?.skillId as DnaSkillId | undefined) ?? null;

      if (hitId !== activeHoverId) {
        activeHoverId = hitId;
        renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
        setHoveredSkillId(hitId);
      }
    };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dx = ev.clientX - pointerDownPos.x;
      const dy = ev.clientY - pointerDownPos.y;
      // Ignore orbit drags; only select on clean tap/click
      if (Math.hypot(dx, dy) > 6) return;

      updateMouseFromEvent(ev);
      raycaster.setFromCamera(_scratchMouse, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      const hitId = hits[0]?.object.userData?.skillId as DnaSkillId | undefined;
      if (hitId) {
        onSelectRef.current(hitId);
        transitionActiveRef.current = true;
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // WebGL context loss safety
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const onContextRestored = () => {
      setWebglError(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 300);
        const h = Math.max(entry.contentRect.height, 340);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // Pre-warm shaders on real GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation loop (strict afterDraw pacing on Software WebGL, rAF on GPU)
    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function stepScene(dt: number) {
      const animateMotion = !pausedRef.current && !prefersReducedMotion;
      if (animateMotion) {
        elapsed += dt;
        helixGroup.rotation.y += dt * 0.34;
        innerCoreMesh.rotation.x += dt * 0.45;
        cageMesh.rotation.y -= dt * 0.55;
        orbitRings[0].rotation.z += dt * 0.14;
        orbitRings[1].rotation.z -= dt * 0.11;
        orbitRings[2].rotation.y += dt * 0.08;
        rootGroup.rotation.y = Math.sin(elapsed * 0.18) * 0.22;
      }

      // Subtle ring spin & bob per skill node
      let idx = 0;
      nodeRigs.forEach((rig) => {
        if (animateMotion) {
          rig.ringMesh.rotation.z += dt * (0.45 + (idx % 3) * 0.15);
          rig.haloMesh.rotation.y -= dt * 0.35;
          rig.group.position.y = rig.basePos.y + Math.sin(elapsed * 1.15 + idx * 0.9) * 0.07;
        }
        idx += 1;
      });

      // Update neural pulses traveling along pathways
      for (let i = 0; i < pulseCurves.length; i++) {
        const t = ((elapsed * 0.26 + i * 0.17) % 1 + 1) % 1;
        pulseCurves[i].getPoint(t, _scratchVec);
        _scratchDummy.position.copy(_scratchVec);
        const pulseScale = 0.8 + Math.sin(elapsed * 4 + i) * 0.25;
        _scratchDummy.scale.setScalar(pulseScale);
        _scratchDummy.updateMatrix();
        pulseMesh.setMatrixAt(i, _scratchDummy.matrix);
      }
      pulseMesh.instanceMatrix.needsUpdate = true;

      // Gently drift ambient neural particles
      if (animateMotion) {
        for (let i = 0; i < particleCount; i++) {
          const seed = particleSeeds[i];
          const a = seed.angle + elapsed * seed.speed;
          _scratchDummy.position.set(
            Math.cos(a) * seed.radius,
            seed.y + Math.sin(elapsed * 0.5 + i) * 0.14,
            Math.sin(a) * seed.radius
          );
          _scratchDummy.scale.setScalar(seed.scale);
          _scratchDummy.updateMatrix();
          particleMesh.setMatrixAt(i, _scratchDummy.matrix);
        }
        particleMesh.instanceMatrix.needsUpdate = true;
      }

      // Exponentially damped camera preset transition
      if (transitionActiveRef.current) {
        const preset = presetRef.current;
        if (preset === 'orbital') {
          _scratchTargetPos.set(0, 6.8, 7.2);
          _scratchLookTarget.set(0, -0.35, 0);
        } else if (preset === 'focus') {
          const selRig = nodeRigs.get(selectedRef.current);
          if (selRig) {
            selRig.group.getWorldPosition(_scratchLookTarget);
            _scratchTargetPos.copy(_scratchLookTarget).add(new THREE.Vector3(0.4, 0.45, 4.3));
          } else {
            _scratchTargetPos.set(0.2, 0.45, 10.3);
            _scratchLookTarget.set(0, -0.42, 0);
          }
        } else {
          _scratchTargetPos.set(0.2, 0.45, 10.3);
          _scratchLookTarget.set(0, -0.42, 0);
        }

        const k = isSoftwareGl ? 6 : 4.2;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _scratchTargetPos.x, k, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _scratchTargetPos.y, k, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _scratchTargetPos.z, k, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _scratchLookTarget.x, k, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _scratchLookTarget.y, k, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _scratchLookTarget.z, k, dt);

        if (
          camera.position.distanceTo(_scratchTargetPos) < 0.04 &&
          controls.target.distanceTo(_scratchLookTarget) < 0.04
        ) {
          transitionActiveRef.current = false;
        }
      }

      controls.update();
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      stepScene(dt);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      nodeRigs.forEach((rig) => {
        if (rig.labelSprite.material.map) rig.labelSprite.material.map.dispose();
        rig.labelSprite.material.dispose();
      });
      for (const item of disposables) {
        item.dispose();
      }
      renderer.dispose();
    };
  }, []);

  const hoveredSkill = hoveredSkillId
    ? skills.find((s) => s.id === hoveredSkillId) ?? null
    : null;
  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? skills[0];

  if (webglError) {
    return (
      <div className="flex h-[460px] flex-col items-center justify-center rounded-2xl border border-cyan-400/25 bg-[#060C24] p-6 text-center">
        <p className="font-portal text-base font-bold text-white">
          {lang === 'bn'
            ? '3D WebGL বর্তমানে পাওয়া যাচ্ছে না'
            : '3D WebGL Preview Unavailable on This Device'}
        </p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
          {lang === 'bn'
            ? 'আপনি ইন্টারেক্টিভ 2D নিউরাল ম্যাপ ব্যবহার করে আপনার সমস্ত দক্ষতা অন্বেষণ করতে পারেন।'
            : 'Switch to the interactive 2D Neural Skill Map for full keyboard and touch exploration.'}
        </p>
        <button
          type="button"
          onClick={onSwitchTo2D}
          className="lv-portal-btn mt-4 rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          {lang === 'bn' ? '2D নিউরাল ম্যাপ খুলুন' : 'Open 2D Accessible Map'}
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="dna-3d-canvas-container"
      data-selected-skill={selectedSkillId}
      className="relative h-[440px] w-full overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#060C24] sm:h-[510px]"
    >
      {/* Dedicated isolated WebGL mount ref — never wraps HUD overlays */}
      <div ref={mountRef} className="h-full w-full" />

      {/* Minimal Top-Left Contextual Spec (solid dark surface — zero backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute left-3.5 top-3.5 z-10 rounded-xl border border-cyan-400/20 bg-[#070E2A]/92 px-3 py-2">
        <p className="text-[11px] font-semibold text-cyan-300">
          {lang === 'bn' ? 'ইন্টারেক্টিভ 3D নিউরাল DNA' : 'Interactive 3D Neural DNA'}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-300">
          {lang === 'bn' ? 'ঘোরাতে টেনে নিন · নোডে ক্লিক করুন' : 'Drag to orbit · Click any node'}
        </p>
      </div>

      {/* Minimal Top-Right Hover / Focus Readout (solid dark surface, zero occlusion of center helix) */}
      <div className="pointer-events-none absolute right-4 top-4 z-10 hidden rounded-xl border border-slate-700/80 bg-[#070E2A]/92 px-3.5 py-2.5 text-right sm:block">
        <p className="text-[11px] text-slate-400">
          {hoveredSkill
            ? lang === 'bn'
              ? 'হোভার করা দক্ষতা'
              : 'Hovering'
            : lang === 'bn'
              ? 'নির্বাচিত দক্ষতা'
              : 'Selected Node'}
        </p>
        <p className="mt-0.5 text-xs font-bold text-white">
          {lang === 'bn'
            ? (hoveredSkill ?? selectedSkill)?.titleBn
            : (hoveredSkill ?? selectedSkill)?.titleEn}
          {' · '}
          <span className="font-mono text-cyan-300 tabular-nums">
            {(hoveredSkill ?? selectedSkill)?.scorePercent !== null
              ? `${(hoveredSkill ?? selectedSkill)?.scorePercent}%`
              : lang === 'bn'
                ? 'অপরিমাপকৃত'
                : 'Unmeasured'}
          </span>
        </p>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Zero Mid-Side Viewport Occlusion) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 flex flex-col items-center px-3">
        <button
          type="button"
          onClick={() => setDockOpen((prev) => !prev)}
          aria-expanded={dockOpen}
          className="pointer-events-auto mb-1 inline-flex items-center gap-1 rounded-lg border border-cyan-400/25 bg-[#070E2A]/95 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300 hover:border-cyan-400/50 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
        >
          {dockOpen ? (
            <>
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
              <span>{lang === 'bn' ? 'নিয়ন্ত্রণ লুকান' : 'Hide Controls'}</span>
            </>
          ) : (
            <>
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
              <span>{lang === 'bn' ? 'নিয়ন্ত্রণ দেখান' : 'Show Controls'}</span>
            </>
          )}
        </button>

        {dockOpen && (
          <div
            role="toolbar"
            aria-label={lang === 'bn' ? '3D DNA নিয়ন্ত্রণ' : '3D DNA viewport controls'}
            className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-xl border border-cyan-400/25 bg-[#070E2A]/95 px-1.5 py-1 shadow-[0_14px_40px_rgba(2,5,20,0.85)]"
          >
            {(
              [
                { id: 'helix', labelEn: 'Helix', labelBn: 'হেলিক্স' },
                { id: 'orbital', labelEn: 'Orbital', labelBn: 'অরবিটাল' },
                { id: 'focus', labelEn: 'Focus', labelBn: 'ফোকাস' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setCameraPreset(preset.id);
                  transitionActiveRef.current = true;
                }}
                aria-pressed={cameraPreset === preset.id}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  cameraPreset === preset.id
                    ? 'bg-[#2864FF] text-white'
                    : 'text-slate-300 hover:bg-[#101C45] hover:text-white'
                }`}
              >
                {lang === 'bn' ? preset.labelBn : preset.labelEn}
              </button>
            ))}

            <span aria-hidden="true" className="mx-0.5 hidden h-3.5 w-px bg-slate-700 sm:inline-block" />

            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-[#101C45] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              {paused ? (
                <>
                  <Play className="h-3 w-3 text-cyan-400" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'চালান' : 'Resume'}</span>
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 text-cyan-400" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'থামান' : 'Pause'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => triggerResetRef.current?.()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-[#101C45] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span>{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
            </button>

            <button
              type="button"
              onClick={onSwitchTo2D}
              data-testid="toggle-2d-dna-map"
              className="inline-flex items-center gap-1 rounded-lg border border-violet-400/35 bg-[#121C4A] px-2.5 py-1 text-[11px] font-semibold text-violet-200 hover:border-cyan-400/50 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Layers className="h-3 w-3 text-violet-300" aria-hidden="true" />
              <span>{lang === 'bn' ? '2D ম্যাপ' : '2D Accessible Map'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
