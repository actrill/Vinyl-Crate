import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGesture } from '@use-gesture/react';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { DISC, JACKET, discBodyGeometry, jacketFaceGeometry, sleeveGeometry } from './geometry';

/** Jacket fills this fraction of the shorter side of the view at zoom 1. */
export const FIT = 0.74;
const FOV = 32;
const TAU = Math.PI * 2;

export interface InspectorTextures {
  front: THREE.Texture;
  back: THREE.Texture | null;
  labelA: THREE.Texture;
  labelB: THREE.Texture;
  groovesA: { normal: THREE.Texture; aniso: THREE.Texture };
  groovesB: { normal: THREE.Texture; aniso: THREE.Texture };
  bump: THREE.Texture;
  edgeColor: string;
  backColor: string;
}

export type Stage = 'jacket' | 'disc';

export interface InspectorControls {
  flip(): void;
  toggleRecord(): void;
  reset(): void;
  turn(dir: -1 | 1): void;
}

/** All motion lives in this mutable object so gestures never re-render React. */
interface Phys {
  rotX: number; rotY: number; velX: number; velY: number;
  targetX: number | null; targetY: number | null;
  zoom: number; zoomTarget: number;
  s: number; sVel: number; sTarget: number;
  spin: number; spinVel: number;
  discFlip: number; discFlipTarget: number;
  dragging: boolean;
  reduced: boolean;
  invalidate: () => void;
}

const nearestTurn = (a: number, base = 0) => base + Math.round((a - base) / TAU) * TAU;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

function cameraDistance(width: number, height: number): number {
  const f = (FIT * Math.min(width, height)) / height;
  return JACKET.size / (f * 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
}

function Scene({ tex, phys, onStage, onReady }: {
  tex: InspectorTextures; phys: MutableRefObject<Phys>; onStage: (s: Stage) => void; onReady: () => void;
}) {
  const { camera, size, invalidate, gl } = useThree();
  const jacket = useRef<THREE.Group>(null);
  const sleeve = useRef<THREE.Group>(null);
  const discPos = useRef<THREE.Group>(null);
  const discTilt = useRef<THREE.Group>(null);
  const discFlip = useRef<THREE.Group>(null);
  const discSpin = useRef<THREE.Group>(null);
  const lastStage = useRef<Stage>('jacket');

  const faceGeo = useMemo(() => jacketFaceGeometry(), []);
  const sleeveGeo = useMemo(() => sleeveGeometry(), []);
  const bodyGeo = useMemo(() => discBodyGeometry(), []);
  useEffect(() => () => { faceGeo.dispose(); sleeveGeo.dispose(); bodyGeo.dispose(); }, [faceGeo, sleeveGeo, bodyGeo]);

  useEffect(() => { phys.current.invalidate = invalidate; invalidate(); }, [invalidate, phys]);
  useEffect(() => {
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(onReady); });
    return () => cancelAnimationFrame(raf);
  }, [onReady]);
  useEffect(() => { gl.toneMappingExposure = 1.05; }, [gl]);

  useFrame((_, rawDt) => {
    const p = phys.current;
    const dt = Math.min(rawDt, 1 / 30);
    let moving = p.dragging;

    // Jacket rotation: inertia when free, damped approach when a target is set.
    if (p.targetX !== null || p.targetY !== null) {
      if (p.targetX !== null) p.rotX = p.reduced ? p.targetX : THREE.MathUtils.damp(p.rotX, p.targetX, 9, dt);
      if (p.targetY !== null) p.rotY = p.reduced ? p.targetY : THREE.MathUtils.damp(p.rotY, p.targetY, 9, dt);
      const done = (p.targetX === null || Math.abs(p.rotX - p.targetX) < 1e-3) && (p.targetY === null || Math.abs(p.rotY - p.targetY) < 1e-3);
      if (done) {
        if (p.targetX !== null) p.rotX = p.targetX;
        if (p.targetY !== null) p.rotY = p.targetY;
        p.targetX = p.targetY = null;
      } else moving = true;
    } else if (!p.dragging && (Math.abs(p.velX) > 1e-3 || Math.abs(p.velY) > 1e-3)) {
      p.rotX = clamp(p.rotX + p.velX * dt, -1.35, 1.35);
      p.rotY += p.velY * dt;
      const k = Math.exp(-3.2 * dt);
      p.velX *= k; p.velY *= k;
      moving = true;
    }

    // Zoom.
    if (Math.abs(p.zoom - p.zoomTarget) > 1e-4) {
      p.zoom = p.reduced ? p.zoomTarget : THREE.MathUtils.damp(p.zoom, p.zoomTarget, 12, dt);
      moving = true;
    }

    // Record stage: a slightly under-damped spring gives the slide a physical feel.
    if (!p.dragging && (Math.abs(p.s - p.sTarget) > 1e-4 || Math.abs(p.sVel) > 1e-4)) {
      if (p.reduced) { p.s = p.sTarget; p.sVel = 0; }
      else {
        const k = 70, c = 2 * Math.sqrt(k) * 0.82;
        p.sVel += (k * (p.sTarget - p.s) - c * p.sVel) * dt;
        p.s += p.sVel * dt;
      }
      moving = true;
    }

    // Disc spin slows naturally: drag proportional to speed plus a little friction.
    if (!p.dragging && Math.abs(p.spinVel) > 1e-3) {
      p.spin += p.spinVel * dt;
      const decel = 0.18 * Math.sign(p.spinVel) * dt;
      p.spinVel = Math.abs(p.spinVel) < Math.abs(decel) ? 0 : (p.spinVel - decel) * Math.exp(-0.35 * dt);
      moving = true;
    }
    if (Math.abs(p.discFlip - p.discFlipTarget) > 1e-3) {
      p.discFlip = p.reduced ? p.discFlipTarget : THREE.MathUtils.damp(p.discFlip, p.discFlipTarget, 8, dt);
      moving = true;
    } else p.discFlip = p.discFlipTarget;

    // Apply to the scene.
    const out = easeOut(Math.min(p.s, 1));
    const t = clamp(p.s - 1, 0, 1.15);
    camera.position.set(0, 0, cameraDistance(size.width, size.height) / p.zoom);
    camera.lookAt(0, 0, 0);
    if (jacket.current) {
      jacket.current.rotation.set(p.rotX, p.rotY, 0);
      jacket.current.position.set(0, -0.62 * t, -0.55 * t);
    }
    if (sleeve.current) {
      sleeve.current.position.y = 1.02 * out * (1 - clamp(t, 0, 1));
      sleeve.current.visible = p.s > 0.002;
    }
    if (discPos.current) {
      // Disc follows the sleeve out of the jacket, then lifts free toward the camera.
      const sleeveY = 1.02 * out;
      const jy = -0.62 * t, jz = -0.55 * t;
      discPos.current.position.set(0, THREE.MathUtils.lerp(sleeveY, 0, clamp(t, 0, 1)) - jy, 0.12 * t - jz);
      discPos.current.visible = p.s > 0.002;
    }
    if (discTilt.current) discTilt.current.rotation.x = -0.32 * clamp(t, 0, 1);
    if (discFlip.current) discFlip.current.rotation.y = p.discFlip;
    if (discSpin.current) discSpin.current.rotation.z = p.spin;

    const stage: Stage = p.sTarget > 1 ? 'disc' : 'jacket';
    if (stage !== lastStage.current) { lastStage.current = stage; onStage(stage); }
    if (moving) invalidate();
  });

  return (
    <>
      {/* One warm key light, like a lamp in a listening room, plus a faint fill. */}
      <ambientLight intensity={0.3} color="#fff0de" />
      <hemisphereLight args={['#fff4e6', '#17130f', 0.3]} />
      <spotLight
        position={[-1.3, 1.7, 2.8]} angle={0.6} penumbra={1} intensity={34} decay={2} color="#ffe1bf"
        castShadow shadow-mapSize={[1024, 1024]} shadow-radius={14} shadow-blurSamples={16} shadow-bias={-0.0006}
      />
      {/* A subtle, offline environment (no HDR download) for sheen on the vinyl. */}
      <Environment resolution={128} frames={1} environmentIntensity={0.5}>
        <Lightformer form="rect" intensity={2.2} color="#ffe6c8" position={[-3, 2.5, 3]} scale={[4, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#dfe6ff" position={[3, -1, 2]} scale={[3, 3, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, 4, -2]} scale={2} />
      </Environment>

      <mesh position={[0, 0, -0.5]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <shadowMaterial transparent opacity={0.22} />
      </mesh>

      <group ref={jacket}>
        <RoundedBox args={[JACKET.size - 0.002, JACKET.size - 0.002, JACKET.depth]} radius={JACKET.depth / 2.2} smoothness={3} castShadow>
          <meshStandardMaterial color={tex.edgeColor} roughness={0.85} bumpMap={tex.bump} bumpScale={0.4} />
        </RoundedBox>
        <mesh geometry={faceGeo} position={[0, 0, JACKET.depth / 2 + 0.0004]}>
          <meshStandardMaterial map={tex.front} roughness={0.62} bumpMap={tex.bump} bumpScale={0.25} />
        </mesh>
        <mesh geometry={faceGeo} position={[0, 0, -JACKET.depth / 2 - 0.0004]} rotation={[0, Math.PI, 0]}>
          <meshStandardMaterial map={tex.back ?? undefined} color={tex.back ? '#ffffff' : tex.backColor} roughness={0.66} bumpMap={tex.bump} bumpScale={0.25} />
        </mesh>

        <group ref={sleeve}>
          {[1, -1].map((side) => (
            <mesh key={side} geometry={sleeveGeo} position={[0, 0, side * (DISC.half + 0.0016)]} rotation={[0, side < 0 ? Math.PI : 0, 0]} castShadow>
              <meshStandardMaterial color="#efe9dd" roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>

        <group ref={discPos}>
          <group ref={discTilt}>
            <group ref={discFlip}>
              <group ref={discSpin}>
                <mesh geometry={bodyGeo} castShadow>
                  <meshPhysicalMaterial color="#060607" roughness={0.3} clearcoat={0.3} clearcoatRoughness={0.25} envMapIntensity={0.6} />
                </mesh>
                {(['A', 'B'] as const).map((side) => {
                  const g = side === 'A' ? tex.groovesA : tex.groovesB;
                  return (
                    <group key={side} rotation={[0, side === 'A' ? 0 : Math.PI, 0]}>
                      <mesh position={[0, 0, DISC.half * 0.82 + 0.00025]}>
                        <ringGeometry args={[DISC.grooveIn, DISC.grooveOut, 160, 1]} />
                        <meshPhysicalMaterial
                          color="#050506" roughness={0.16} metalness={0} clearcoat={0.2} clearcoatRoughness={0.1} envMapIntensity={0.5}
                          normalMap={g.normal} normalScale={new THREE.Vector2(0.55, 0.55)}
                          anisotropy={0.85} anisotropyMap={g.aniso}
                        />
                      </mesh>
                      <mesh position={[0, 0, DISC.half + 0.0007]}>
                        <ringGeometry args={[DISC.hole, DISC.label, 96, 1]} />
                        <meshStandardMaterial map={side === 'A' ? tex.labelA : tex.labelB} roughness={0.72} />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}

export function Inspector({ tex, reduced, controlsRef, onStage, onReady, onTapEmpty }: {
  tex: InspectorTextures;
  reduced: boolean;
  controlsRef: MutableRefObject<InspectorControls | null>;
  onStage: (s: Stage) => void;
  onReady: () => void;
  onTapEmpty?: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const phys = useRef<Phys>({
    rotX: 0, rotY: 0, velX: 0, velY: 0, targetX: null, targetY: null, zoom: 1, zoomTarget: 1,
    s: 0, sVel: 0, sTarget: 0, spin: 0, spinVel: 0, discFlip: 0, discFlipTarget: 0, dragging: false, reduced, invalidate: () => undefined,
  });
  phys.current.reduced = reduced;
  const gesture = useRef<{ mode: 'pending' | 'rotate' | 'slide' | 'spin' | null; s0: number; lastAngle: number; lastT: number; omega: number; lastTap: number }>({
    mode: null, s0: 0, lastAngle: 0, lastT: 0, omega: 0, lastTap: 0,
  });

  useEffect(() => {
    const p = phys.current;
    const kick = () => p.invalidate();
    controlsRef.current = {
      flip() {
        if (p.sTarget > 1) p.discFlipTarget = p.discFlipTarget === 0 ? Math.PI : 0;
        else { p.velX = p.velY = 0; p.targetX = 0; p.targetY = Math.round(p.rotY / Math.PI) * Math.PI + Math.PI; }
        kick();
      },
      toggleRecord() {
        if (p.sTarget > 1) { p.sTarget = 0; p.discFlipTarget = 0; }
        else { p.velX = p.velY = 0; p.targetX = 0; p.targetY = nearestTurn(p.rotY); p.sTarget = 2; p.zoomTarget = 1; }
        kick();
      },
      reset() {
        p.velX = p.velY = 0; p.targetX = 0; p.targetY = nearestTurn(p.rotY); p.zoomTarget = 1; p.spinVel = 0; p.discFlipTarget = 0;
        kick();
      },
      turn(dir) {
        p.velX = p.velY = 0; p.targetX = 0; p.targetY = (p.targetY ?? p.rotY) + (dir * Math.PI) / 4;
        kick();
      },
    };
    return () => { controlsRef.current = null; };
  }, [controlsRef]);

  useGesture(
    {
      onDrag: ({ first, last, tap, xy: [x, y], delta: [dx, dy], movement: [mx, my], velocity: [vx, vy], direction: [dirX, dirY], initial: [ix, iy], timeStamp }) => {
        const p = phys.current;
        const g = gesture.current;
        const el = wrap.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        if (tap) {
          if (timeStamp - g.lastTap < 320) { controlsRef.current?.reset(); g.lastTap = 0; }
          else { g.lastTap = timeStamp; onTapEmpty?.(); }
          return;
        }
        if (first) {
          p.dragging = true;
          p.targetX = p.targetY = null;
          const jacketPx = FIT * Math.min(rect.width, rect.height) * p.zoom;
          const top = cy - jacketPx / 2;
          const facingFront = Math.abs(p.rotX) < 0.45 && Math.abs(p.rotY - nearestTurn(p.rotY)) < 0.5;
          if (p.sTarget > 1) {
            g.mode = 'spin';
            g.lastAngle = Math.atan2(iy - cy, ix - cx);
            g.lastT = timeStamp;
            g.omega = 0;
            p.spinVel = 0;
          } else if (facingFront && iy > top - 28 && iy < top + jacketPx * 0.28 && Math.abs(ix - cx) < jacketPx / 2) {
            g.mode = 'pending'; // near the opening: an upward drag pulls the record out
            g.s0 = p.s;
          } else g.mode = 'rotate';
        }
        if (g.mode === 'pending' && Math.hypot(mx, my) > 8) g.mode = my < 0 && Math.abs(my) > Math.abs(mx) ? 'slide' : 'rotate';

        if (g.mode === 'rotate') {
          p.rotY += dx * 0.0085;
          p.rotX = clamp(p.rotX + dy * 0.0085, -1.35, 1.35);
          if (last) {
            p.velY = p.reduced ? 0 : clamp(vx * dirX * 8.5, -14, 14);
            p.velX = p.reduced ? 0 : clamp(vy * dirY * 8.5, -14, 14);
          }
        } else if (g.mode === 'slide') {
          const jacketPx = FIT * Math.min(rect.width, rect.height) * p.zoom;
          p.s = clamp(g.s0 + -my / (jacketPx * 0.95), 0, 1.05);
          p.sTarget = p.s;
          p.sVel = 0;
          if (last) p.sTarget = p.s > 0.38 || (vy > 0.4 && dirY < 0) ? 2 : 0;
        } else if (g.mode === 'spin') {
          const a = Math.atan2(y - cy, x - cx);
          let d = a - g.lastAngle;
          if (d > Math.PI) d -= TAU;
          if (d < -Math.PI) d += TAU;
          // Screen y points down, so a clockwise finger is a negative rotation about +z.
          p.spin -= d;
          const dt = Math.max(1, timeStamp - g.lastT) / 1000;
          g.omega = g.omega * 0.6 + (-d / dt) * 0.4;
          g.lastAngle = a;
          g.lastT = timeStamp;
          if (last) p.spinVel = p.reduced ? 0 : clamp(g.omega, -40, 40);
        }
        if (last) { p.dragging = false; g.mode = null; }
        p.invalidate();
      },
      onPinch: ({ offset: [scale] }) => {
        const p = phys.current;
        p.zoomTarget = clamp(scale, 0.7, 2.6);
        p.invalidate();
      },
    },
    {
      target: wrap,
      eventOptions: { passive: false },
      drag: { filterTaps: true },
      pinch: { scaleBounds: { min: 0.7, max: 2.6 }, from: () => [phys.current.zoomTarget, 0] },
    },
  );

  return (
    <div ref={wrap} className="inspector-canvas" style={{ touchAction: 'none' }}>
      <Canvas
        frameloop="demand"
        shadows={{ type: THREE.VSMShadowMap }}
        dpr={[1, 2]}
        camera={{ fov: FOV, near: 0.05, far: 20, position: [0, 0, 3] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping }}
        aria-hidden
      >
        <Scene tex={tex} phys={phys} onStage={onStage} onReady={onReady} />
      </Canvas>
    </div>
  );
}
