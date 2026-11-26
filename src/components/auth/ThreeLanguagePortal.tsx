import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PortalFallbackVisual, type PortalVisualState } from './PortalFallbackVisual';

export type { PortalVisualState };

interface ThreeLanguagePortalProps {
  portalState: PortalVisualState;
  pointerX: number;
  pointerY: number;
  ariaLabel?: string;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function probeWebGLSupport(): { supported: boolean; isSoftwareGl: boolean } {
  if (typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: true };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

/**
 * THE LANGUAGE PORTAL — Custom Interactive 3D Three.js Stage
 * Composite multi-part procedural assembly:
 *  1. Outer beveled Electric Violet metallic portal ring
 *  2. Inner counter-rotating Neon Cyan energy conduit ring
 *  3. Tilted orbital harmonic ring
 *  4. 3 concentric animated Soundwave Rings
 *  5. Neural Communication Orb (faceted core + geodesic wireframe + inner nucleus)
 *  6. 72 InstancedMesh speech particles flowing in helical communication streams
 *
 * Follows software-WebGL pacing (afterDraw), RoomEnvironment PBR lighting,
 * zero GC in render loop, prefers-reduced-motion fallback, and complete cleanup.
 */
export default function ThreeLanguagePortal({
  portalState,
  pointerX,
  pointerY,
  ariaLabel = 'Interactive 3D Language Portal',
}: ThreeLanguagePortalProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<PortalVisualState>(portalState);
  const pointerRef = useRef({ x: pointerX, y: pointerY });
  const [useFallback, setUseFallback] = useState(false);

  stateRef.current = portalState;
  pointerRef.current = { x: pointerX, y: pointerY };

  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isNarrowMobile = window.innerWidth < 768;
    const probe = probeWebGLSupport();

    if (!probe.supported || prefersReduced || isNarrowMobile) {
      setUseFallback(true);
      return;
    }

    const { isSoftwareGl } = probe;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: isSoftwareGl,
      });
    } catch {
      setUseFallback(true);
      return;
    }

    const initW = Math.max(260, container.clientWidth || 440);
    const initH = Math.max(260, container.clientHeight || 440);
    renderer.setSize(initW, initH);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(0x05091f, 0);

    container.innerHTML = '';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05091f, 0.055);

    const camera = new THREE.PerspectiveCamera(42, initW / initH, 0.1, 60);
    camera.position.set(0, 0.15, 7.2);

    // Studio environment map for crisp metallic & crystalline highlights
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // Three-point calibrated cinematic lighting rig (controlled glow, no blowout)
    const hemiLight = new THREE.HemisphereLight(0x88d4ff, 0x160c38, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xa78bfa, 2.2);
    keyLight.position.set(4.5, 5.0, 5.5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x00d9ff, 3.2, 16);
    rimLight.position.set(-4.0, -2.5, 4.0);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight(0x7c3aed, 2.6, 10);
    coreLight.position.set(0, 0, 1.4);
    scene.add(coreLight);

    // Master Composite Portal Group
    const portalGroup = new THREE.Group();
    scene.add(portalGroup);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Part 1: Outer Holographic Portal Gate (brushed violet titanium torus)
    const outerRingGeo = new THREE.TorusGeometry(2.12, 0.085, 24, 96);
    const outerRingMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b2678,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.65,
      metalness: 0.88,
      roughness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    portalGroup.add(outerRing);
    geometries.push(outerRingGeo);
    materials.push(outerRingMat);

    // Part 2: Inner Counter-Rotating Neon Cyan Conduit Ring
    const innerRingGeo = new THREE.TorusGeometry(1.74, 0.048, 20, 88);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x00d9ff,
      emissiveIntensity: 0.9,
      metalness: 0.6,
      roughness: 0.18,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = 0.24;
    portalGroup.add(innerRing);
    geometries.push(innerRingGeo);
    materials.push(innerRingMat);

    // Part 3: Tilted Gyroscopic Accent Ring
    const gyroRingGeo = new THREE.TorusGeometry(2.44, 0.022, 14, 96);
    const gyroRingMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.55,
      metalness: 0.75,
      roughness: 0.28,
      transparent: true,
      opacity: 0.78,
    });
    const gyroRing = new THREE.Mesh(gyroRingGeo, gyroRingMat);
    gyroRing.rotation.set(0.68, -0.35, 0.2);
    portalGroup.add(gyroRing);
    geometries.push(gyroRingGeo);
    materials.push(gyroRingMat);

    // Part 4: 12 Cardinal Precision Tick Nodes around Outer Gate (InstancedMesh)
    const tickGeo = new THREE.BoxGeometry(0.05, 0.16, 0.05);
    const tickMat = new THREE.MeshStandardMaterial({
      color: 0x00d9ff,
      emissive: 0x00d9ff,
      emissiveIntensity: 0.85,
      metalness: 0.4,
      roughness: 0.25,
    });
    const tickMesh = new THREE.InstancedMesh(tickGeo, tickMat, 12);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      _dummy.position.set(Math.cos(angle) * 2.12, Math.sin(angle) * 2.12, 0.08);
      _dummy.rotation.set(0, 0, angle + Math.PI / 2);
      _dummy.scale.set(1, i % 3 === 0 ? 1.35 : 0.8, 1);
      _dummy.updateMatrix();
      tickMesh.setMatrixAt(i, _dummy.matrix);
    }
    tickMesh.instanceMatrix.needsUpdate = true;
    tickMesh.computeBoundingSphere();
    outerRing.add(tickMesh);
    geometries.push(tickGeo);
    materials.push(tickMat);

    // Part 5: 3 Concentric Animated Soundwave Rings
    const soundwaves: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }> = [];
    for (let i = 0; i < 3; i++) {
      const swGeo = new THREE.TorusGeometry(1.18 + i * 0.26, 0.012, 10, 72);
      const swMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00d9ff : 0xa78bfa,
        transparent: true,
        opacity: 0.38 - i * 0.08,
        depthWrite: false,
      });
      const swMesh = new THREE.Mesh(swGeo, swMat);
      portalGroup.add(swMesh);
      soundwaves.push({ mesh: swMesh, mat: swMat, phase: (i / 3) * Math.PI * 2 });
      geometries.push(swGeo);
      materials.push(swMat);
    }

    // Part 6: Neural Communication Orb (Core + Geodesic Wireframe + Luminous Nucleus)
    const orbGroup = new THREE.Group();
    portalGroup.add(orbGroup);

    const orbCoreGeo = new THREE.IcosahedronGeometry(0.68, 1);
    const orbCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x16245c,
      emissive: 0x5b21b6,
      emissiveIntensity: 0.72,
      metalness: 0.35,
      roughness: 0.16,
      clearcoat: 1.0,
      flatShading: true,
    });
    const orbCore = new THREE.Mesh(orbCoreGeo, orbCoreMat);
    orbGroup.add(orbCore);
    geometries.push(orbCoreGeo);
    materials.push(orbCoreMat);

    const orbWireGeo = new THREE.IcosahedronGeometry(0.84, 1);
    const orbWireMat = new THREE.MeshBasicMaterial({
      color: 0x00d9ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const orbWire = new THREE.Mesh(orbWireGeo, orbWireMat);
    orbGroup.add(orbWire);
    geometries.push(orbWireGeo);
    materials.push(orbWireMat);

    const nucleusGeo = new THREE.SphereGeometry(0.32, 20, 20);
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.78,
    });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    orbGroup.add(nucleus);
    geometries.push(nucleusGeo);
    materials.push(nucleusMat);

    // Part 7: 72 Floating Speech Particles (InstancedMesh in helical streams)
    const PARTICLE_COUNT = 72;
    const particleGeo = new THREE.OctahedronGeometry(0.042, 0);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
    });
    const particles = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
    particles.frustumCulled = false;

    const particleSeeds = Array.from({ length: PARTICLE_COUNT }, (_, idx) => ({
      radius: 1.45 + (idx % 9) * 0.18,
      angleOffset: (idx / PARTICLE_COUNT) * Math.PI * 2,
      speed: 0.22 + (idx % 5) * 0.08,
      zAmp: 0.55 + (idx % 4) * 0.22,
      scale: 0.65 + (idx % 4) * 0.24,
    }));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (i % 3 === 0) _color.setHex(0x00d9ff);
      else if (i % 3 === 1) _color.setHex(0xa78bfa);
      else _color.setHex(0xe0f2fe);
      particles.setColorAt(i, _color);
    }
    if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
    portalGroup.add(particles);
    geometries.push(particleGeo);
    materials.push(particleMat);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // State interpolation trackers (zero React re-renders during rAF)
    let animFocus = 0;
    let animSuccess = 0;
    let animError = 0;
    let smoothPtrX = 0;
    let smoothPtrY = 0;
    let frameId = 0;
    let disposed = false;
    let isVisible = true;
    const clock = new THREE.Clock();

    const onContextLost = (e: Event) => {
      e.preventDefault();
      if (!disposed) setUseFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const resizeObserver = new ResizeObserver((entries) => {
      if (disposed) return;
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(240, Math.floor(entry.contentRect.width));
      const h = Math.max(240, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisible = Boolean(entries[0]?.isIntersecting);
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 90);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 8);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 85);
        }
      };
      frameId = window.setTimeout(poll, 8);
    };

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      if (isVisible) {
        const current = stateRef.current;
        const targetFocus = current === 'focused' || current === 'submitting' ? 1 : 0;
        const targetSuccess = current === 'success' ? 1 : 0;
        const targetError = current === 'error' ? 1 : 0;
        const speedBoost = current === 'submitting' ? 2.1 : current === 'success' ? 1.55 : 1.0;

        animFocus = THREE.MathUtils.damp(animFocus, targetFocus, 4.5, delta);
        animSuccess = THREE.MathUtils.damp(animSuccess, targetSuccess, 3.2, delta);
        animError = THREE.MathUtils.damp(animError, targetError, 5.0, delta);

        smoothPtrX = THREE.MathUtils.damp(smoothPtrX, pointerRef.current.x, 4.0, delta);
        smoothPtrY = THREE.MathUtils.damp(smoothPtrY, pointerRef.current.y, 4.0, delta);

        // Gentle floating + pointer parallax
        portalGroup.position.y = Math.sin(elapsed * 0.9) * 0.14;
        portalGroup.rotation.y = smoothPtrX * 0.32 + Math.sin(elapsed * 0.35) * 0.08;
        portalGroup.rotation.x = -smoothPtrY * 0.24 + Math.cos(elapsed * 0.28) * 0.05;

        // Open-portal expansion on authentication success
        const gateScale = 1 + animSuccess * 0.34;
        outerRing.scale.setScalar(gateScale);
        outerRing.rotation.z += delta * 0.18 * speedBoost;
        outerRing.position.z = -animSuccess * 0.4;

        innerRing.scale.setScalar(1 + animSuccess * 0.22);
        innerRing.rotation.z -= delta * 0.34 * speedBoost;
        innerRing.rotation.x = 0.24 + Math.sin(elapsed * 0.6) * 0.12;
        innerRing.position.z = animSuccess * 0.35;

        gyroRing.rotation.y += delta * 0.22 * speedBoost;
        gyroRing.rotation.z += delta * 0.12 * speedBoost;

        // Neural Communication Orb transforms smoothly when portal opens
        const orbScale = 1 - animSuccess * 0.42 + animFocus * 0.08 + Math.sin(elapsed * 2.1) * 0.025;
        orbGroup.scale.setScalar(Math.max(0.35, orbScale));
        orbCore.rotation.y += delta * 0.38 * speedBoost;
        orbCore.rotation.x += delta * 0.21 * speedBoost;
        orbWire.rotation.y -= delta * 0.28 * speedBoost;

        // Dynamic reactive illumination on focus / error / success
        outerRingMat.emissiveIntensity = 0.62 + animFocus * 0.55 + animSuccess * 0.7;
        innerRingMat.emissiveIntensity = 0.85 + animFocus * 0.65 + animSuccess * 0.8;
        orbCoreMat.emissiveIntensity = 0.68 + animFocus * 0.55 + animSuccess * 0.75;
        coreLight.intensity = 2.4 + animFocus * 1.4 + animSuccess * 2.2;

        if (animSuccess > 0.15) {
          outerRingMat.emissive.setHex(0x10b981);
          innerRingMat.emissive.setHex(0x22d3ee);
          coreLight.color.setHex(0x16e58b);
        } else if (animError > 0.15) {
          outerRingMat.emissive.setHex(0xf43f5e);
          innerRingMat.emissive.setHex(0xf59e0b);
          coreLight.color.setHex(0xf43f5e);
        } else {
          outerRingMat.emissive.setHex(0x7c3aed);
          innerRingMat.emissive.setHex(0x00d9ff);
          coreLight.color.setHex(animFocus > 0.3 ? 0x00d9ff : 0x7c3aed);
        }

        // Animated Soundwave Rings
        for (let i = 0; i < soundwaves.length; i++) {
          const sw = soundwaves[i];
          const waveCycle = (elapsed * (0.55 + animFocus * 0.3) + sw.phase) % (Math.PI * 2);
          const norm = waveCycle / (Math.PI * 2);
          const s = 0.82 + norm * (0.62 + animSuccess * 0.35);
          sw.mesh.scale.setScalar(s);
          sw.mat.opacity = Math.sin(norm * Math.PI) * (0.34 + animFocus * 0.24 + animSuccess * 0.22);
        }

        // Floating helical speech particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const seed = particleSeeds[i];
          const theta = seed.angleOffset + elapsed * seed.speed * speedBoost;
          const r = seed.radius * (1 + animSuccess * 0.26);
          const x = Math.cos(theta) * r;
          const y = Math.sin(theta) * r;
          const z = Math.sin(theta * 2 + elapsed) * seed.zAmp;
          _dummy.position.set(x, y, z);
          _dummy.rotation.set(theta, elapsed * 0.8, 0);
          _dummy.scale.setScalar(seed.scale * (1 + animFocus * 0.22));
          _dummy.updateMatrix();
          particles.setMatrixAt(i, _dummy.matrix);
        }
        particles.instanceMatrix.needsUpdate = true;

        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  if (useFallback) {
    return <PortalFallbackVisual portalState={portalState} ariaLabel={ariaLabel} />;
  }

  return (
    <div
      ref={mountRef}
      role="img"
      aria-label={ariaLabel}
      data-testid="language-portal-canvas"
      data-portal-state={portalState}
      className="h-full w-full"
    />
  );
}
