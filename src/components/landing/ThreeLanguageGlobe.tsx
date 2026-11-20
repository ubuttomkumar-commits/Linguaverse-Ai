import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GlobeStaticFallback } from './GlobeStaticFallback';

interface ThreeLanguageGlobeProps {
  activeFocusIndex: number;
  pointerX: number;
  pointerY: number;
  ariaLabel: string;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
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

function createProceduralGlobeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Rich midnight sapphire gradient
    const bg = ctx.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, '#0d1b3e');
    bg.addColorStop(0.5, '#172e6b');
    bg.addColorStop(1, '#0b1636');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);

    // Crisp glowing meridian & latitude grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
    ctx.lineWidth = 1.25;
    for (let x = 0; x <= 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 24; y < 256; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Luminous global linguistic hub clusters (high-contrast dots + soft halos)
    const hubs = [
      { x: 356, y: 114, r: 28, c: 'rgba(56, 189, 248, 0.92)' }, // South Asia / Dhaka
      { x: 256, y: 88, r: 30, c: 'rgba(96, 165, 250, 0.78)' },  // Europe
      { x: 132, y: 98, r: 32, c: 'rgba(167, 139, 250, 0.8)' },  // North America
      { x: 416, y: 102, r: 26, c: 'rgba(56, 189, 248, 0.75)' }, // East Asia
      { x: 422, y: 176, r: 24, c: 'rgba(232, 121, 249, 0.74)' },// Oceania
      { x: 268, y: 148, r: 28, c: 'rgba(79, 139, 255, 0.68)' }, // MENA / Africa
      { x: 170, y: 168, r: 24, c: 'rgba(139, 109, 255, 0.72)' },// South America
    ];

    for (const hub of hubs) {
      const grad = ctx.createRadialGradient(hub.x, hub.y, 2, hub.x, hub.y, hub.r);
      grad.addColorStop(0, hub.c);
      grad.addColorStop(0.45, hub.c.replace(/0\.\d+\)/, '0.35)'));
      grad.addColorStop(1, 'rgba(11, 22, 54, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hub.r, 0, Math.PI * 2);
      ctx.fill();

      // Bright core beacon dot
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Luminous cross-continental communication arcs
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(356, 114);
    ctx.quadraticCurveTo(300, 56, 256, 88);
    ctx.quadraticCurveTo(192, 48, 132, 98);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.beginPath();
    ctx.moveTo(356, 114);
    ctx.quadraticCurveTo(392, 78, 416, 102);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Lazy-loaded Three.js 3D Language Globe with composite 8-part procedural geometry,
 * RoomEnvironment PBR reflections, instanced orbital linguistic particles,
 * software-WebGL pacing (afterDraw), IntersectionObserver auto-pause,
 * and automatic static fallback for mobile / no-WebGL devices.
 */
export default function ThreeLanguageGlobe({
  activeFocusIndex,
  pointerX,
  pointerY,
  ariaLabel,
}: ThreeLanguageGlobeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const focusRef = useRef(activeFocusIndex);
  const pointerRef = useRef({ x: pointerX, y: pointerY });
  const [useFallback, setUseFallback] = useState(false);

  focusRef.current = activeFocusIndex;
  pointerRef.current = { x: pointerX, y: pointerY };

  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === 'undefined') return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCompactMobile = window.innerWidth < 640;
    const glProbe = detectSoftwareWebGL();

    if (!glProbe.supported || isCompactMobile) {
      setUseFallback(true);
      return;
    }

    const { isSoftwareGl } = glProbe;
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

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const width = Math.max(240, container.clientWidth || 440);
    const height = Math.max(220, container.clientHeight || 268);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(0, 0.22, 5.45);
    camera.lookAt(0, 0, 0);

    // Mandatory Studio PBR Environment Map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // Balanced 3-point + Hemisphere lighting rig
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e1b4b, 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
    keyLight.position.set(4.5, 4.2, 5.2);
    scene.add(keyLight);

    const rimViolet = new THREE.PointLight(0x8b6dff, 6.5, 18);
    rimViolet.position.set(-3.6, -1.6, 3.0);
    scene.add(rimViolet);

    const rimMagenta = new THREE.PointLight(0xd946ef, 4.5, 16);
    rimMagenta.position.set(3.2, -2.0, -2.0);
    scene.add(rimMagenta);

    // Composite Multi-Part 3D Language Globe Group (8 distinct parts)
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const globeGroup = new THREE.Group();
    rootGroup.add(globeGroup);

    // Part 1: Procedural luminous metallic globe core (PBR Standard + emissive map)
    const globeTex = createProceduralGlobeTexture(renderer.capabilities.getMaxAnisotropy());
    const coreGeo = new THREE.SphereGeometry(1.16, 36, 28);
    const coreMat = new THREE.MeshStandardMaterial({
      map: globeTex,
      emissiveMap: globeTex,
      color: 0xaad4ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.72,
      metalness: 0.55,
      roughness: 0.24,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreMesh);

    // Part 2: Outer geodesic luminous cyan wireframe lattice
    const icoBase = new THREE.IcosahedronGeometry(1.3, 2);
    const latticeGeo = new THREE.WireframeGeometry(icoBase);
    icoBase.dispose();
    const latticeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });
    const latticeLines = new THREE.LineSegments(latticeGeo, latticeMat);
    globeGroup.add(latticeLines);

    // Part 3: North & South polar precision metallic collars
    const collarGeo = new THREE.TorusGeometry(0.45, 0.018, 10, 48);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      metalness: 0.85,
      roughness: 0.16,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.55,
    });
    const northCollar = new THREE.Mesh(collarGeo, collarMat);
    northCollar.position.y = 1.09;
    northCollar.rotation.x = Math.PI / 2;
    globeGroup.add(northCollar);

    const southCollar = new THREE.Mesh(collarGeo, collarMat);
    southCollar.position.y = -1.09;
    southCollar.rotation.x = Math.PI / 2;
    globeGroup.add(southCollar);

    // Part 4, 5, 6: Three inclined layered orbital light rings (Cyan/Blue, Violet, Magenta)
    const ring1Geo = new THREE.TorusGeometry(1.72, 0.022, 12, 96);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.1,
      metalness: 0.45,
      roughness: 0.2,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.set(1.18, 0.25, 0.15);
    rootGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(1.98, 0.017, 10, 96);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      emissive: 0x8b6dff,
      emissiveIntensity: 1.1,
      metalness: 0.45,
      roughness: 0.24,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.set(1.36, -0.45, -0.2);
    rootGroup.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(2.2, 0.012, 10, 96);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0xf0abfc,
      emissive: 0xd946ef,
      emissiveIntensity: 0.95,
      metalness: 0.4,
      roughness: 0.28,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.set(0.92, 0.55, 0.35);
    rootGroup.add(ring3);

    // Part 7: 14 Surface Communication Hub Beacons (InstancedMesh)
    const beaconCount = 14;
    const beaconGeo = new THREE.SphereGeometry(0.055, 12, 10);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x7dd3fc,
      emissiveIntensity: 1.3,
      roughness: 0.18,
      metalness: 0.25,
    });
    const beacons = new THREE.InstancedMesh(beaconGeo, beaconMat, beaconCount);
    const beaconPalette = [0x38bdf8, 0x4f8bff, 0xa78bfa, 0xe879f9];
    for (let i = 0; i < beaconCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / beaconCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.31;
      _dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      const s = 0.88 + (i % 3) * 0.16;
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      beacons.setMatrixAt(i, _dummy.matrix);
      _color.setHex(beaconPalette[i % beaconPalette.length]);
      beacons.setColorAt(i, _color);
    }
    beacons.instanceMatrix.needsUpdate = true;
    if (beacons.instanceColor) beacons.instanceColor.needsUpdate = true;
    beacons.computeBoundingSphere();
    globeGroup.add(beacons);

    // Part 8: 56 Orbital Linguistic Light Particles (InstancedMesh, zero GC per frame)
    const particleCount = 56;
    const particleGeo = new THREE.OctahedronGeometry(0.03, 0);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x7dd3fc,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.2,
    });
    const particles = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
    const particleData = Array.from({ length: particleCount }, (_, i) => ({
      radius: 1.62 + (i % 7) * 0.13,
      angle: (i / particleCount) * Math.PI * 2,
      speed: (i % 2 === 0 ? 1 : -1) * (0.14 + (i % 5) * 0.045),
      tilt: ((i % 9) - 4) * 0.16,
      scale: 0.78 + (i % 4) * 0.22,
    }));
    for (let i = 0; i < particleCount; i++) {
      _color.setHex(beaconPalette[i % beaconPalette.length]);
      particles.setColorAt(i, _color);
    }
    if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
    particles.frustumCulled = false;
    rootGroup.add(particles);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const updateParticles = (elapsed: number) => {
      for (let i = 0; i < particleCount; i++) {
        const p = particleData[i];
        const a = p.angle + elapsed * p.speed;
        _dummy.position.set(
          Math.cos(a) * p.radius,
          Math.sin(a * 1.4 + p.tilt) * 0.58 + p.tilt * 0.65,
          Math.sin(a) * p.radius
        );
        _dummy.rotation.set(a, a * 0.7, 0);
        _dummy.scale.setScalar(p.scale);
        _dummy.updateMatrix();
        particles.setMatrixAt(i, _dummy.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;
    };

    // Initial synchronous draw so frame 1 is immediately painted
    globeGroup.rotation.y = 0.7;
    updateParticles(0);
    renderer.render(scene, camera);

    // ResizeObserver — ALWAYS re-render immediately after setSize so buffer is never left blank!
    let lastW = width;
    let lastH = height;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(240, Math.floor(entry.contentRect.width));
      const h = Math.max(220, Math.floor(entry.contentRect.height));
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    // Pause animation when scrolled offscreen
    let isVisible = true;
    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext();
      if ('fenceSync' in gl && typeof gl.fenceSync === 'function') {
        const gl2 = gl as WebGL2RenderingContext;
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl2.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl2.deleteSync(sync);
            return;
          }
          const state = sync && gl2.getSyncParameter(sync, gl2.SYNC_STATUS);
          if (state === gl2.UNSIGNALED) {
            frameId = window.setTimeout(poll, 6);
          } else {
            if (sync) gl2.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 6);
      } else {
        frameId = window.setTimeout(cb, 90);
      }
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (isVisible && !document.hidden) {
        elapsed += delta;

        const targetRotX = pointerRef.current.y * 0.24 + (focusRef.current - 1.5) * 0.09;
        const targetRotZ = pointerRef.current.x * 0.16;
        rootGroup.rotation.x = THREE.MathUtils.damp(rootGroup.rotation.x, targetRotX, 4, delta);
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, targetRotZ, 4, delta);

        globeGroup.rotation.y += delta * 0.24;
        latticeLines.rotation.y -= delta * 0.09;
        ring1.rotation.z += delta * 0.28;
        ring2.rotation.z -= delta * 0.22;
        ring3.rotation.z += delta * 0.16;

        rootGroup.position.y = Math.sin(elapsed * 1.1) * 0.05;

        updateParticles(elapsed);
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    if (!reducedMotion) {
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      io.disconnect();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      globeTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  if (useFallback) {
    return <GlobeStaticFallback ariaLabel={ariaLabel} />;
  }

  return (
    <div
      ref={mountRef}
      role="img"
      aria-label={ariaLabel}
      className="h-full w-full"
    />
  );
}
