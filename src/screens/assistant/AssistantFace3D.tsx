/**
 * AssistantFace3D — a live 3D character head for Pura Assist's context card.
 *
 * This is the "Memoji-style" upgrade path: instead of the SVG wireframe
 * (`AssistantFace`), it renders a real authored GLB avatar (Ready Player Me
 * by default, but any ARKit-blendshape-rigged GLB works) inside an expo-gl
 * surface via expo-three, and animates it:
 *
 *   • STATE A (idle):     slow breathing scale, sparse blink, eyes resting
 *                         slightly to one side. `subdued` → opacity 0.6.
 *   • STATE B (thinking): scales up (~56→92px, 300ms ease-out), eyes look
 *                         left→right→down→up on a held cadence, gentle ±3°
 *                         head-tilt — curious, never frantic.
 *   • STATE C (landing):  on thinking→done, one scale pop (1.0→1.05→1.0).
 *
 * Reduced motion: breathing/blink/eye-tracking are disabled (static gaze),
 * and the thinking scale-up is replaced by an opacity pulse (0.7↔1.0).
 *
 * The avatar lives ON the porcelain card — the GL clear colour is fully
 * transparent, so there is no solid box behind the head.
 *
 * IMPORTANT — this component leaves Expo Go. expo-gl needs a custom dev
 * client (or a web/standalone build) to render. On ANY GL/load failure it
 * falls back to the SVG `AssistantFace`, so the card never breaks.
 *
 * The avatar source is swappable: pass `avatarUrl`. See `buildAvatarUrl`
 * for the RPM query params appended automatically (ARKit morphs, no
 * compression so plain GLTFLoader can parse it without a Draco decoder).
 */

import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { puraAssist } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { AssistantFace } from './AssistantFace';

export interface AssistantFace3DProps {
  /** True while a response is generating — drives the look-around + scale-up. */
  thinking: boolean;
  /** Idle rendered px (square). Thinking scales up ~1.64x from this. */
  size?: number;
  /** GLB avatar URL. ARKit morph + framing params are appended automatically. */
  avatarUrl?: string;
  /** No active scan → render at a calm 0.6 opacity. */
  subdued?: boolean;
}

// A public RPM sample avatar — a stand-in default. Replace with a Pura-themed
// avatar URL (https://models.readyplayer.me/<id>.glb) once one is authored.
const DEFAULT_AVATAR_URL =
  'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

// The GL drawing buffer is a fixed square; we scale the *view* (not the
// buffer) so the render stays crisp at both idle and thinking sizes.
const BASE = 112;
const BREATH_MS = 3500;

// Eye-look amplitudes (radians) for the RPM eye bones.
const EYE_YAW = 0.38;
const EYE_PITCH = 0.26;
// Head-tilt amplitude (radians) ≈ 3°.
const HEAD_TILT = 0.052;

// Meshes to hide so only the head/face character remains (no body/outfit).
const HIDE_MESH = /(Outfit|Body|Hands|Footwear|Bottom|Top|Legs)/i;

function buildAvatarUrl(base: string): string {
  if (base.includes('morphTargets=')) return base;
  const params =
    'morphTargets=ARKit&textureAtlas=1024&textureSizeLimit=1024&meshLod=1' +
    '&useDracoMeshCompression=false&useMeshOptCompression=false';
  return base + (base.includes('?') ? '&' : '?') + params;
}

export function AssistantFace3D({
  thinking,
  size = 56,
  avatarUrl = DEFAULT_AVATAR_URL,
  subdued = false,
}: AssistantFace3DProps) {
  const reduce = useReduceMotion();
  const [failed, setFailed] = useState(false);

  const idlePx = size;
  const thinkPx = Math.round(size * 1.64);

  // ---- Container animation (reanimated, JS-thread-safe shared values) ----
  const visScale = useSharedValue(idlePx / BASE);
  const breath = useSharedValue(1);
  const pop = useSharedValue(1);
  const opacity = useSharedValue(subdued ? 0.6 : 1);
  const prevThinking = useRef(thinking);

  // ---- Refs the GL render loop reads (so it never needs re-creation) ----
  const thinkingRef = useRef(thinking);
  const reduceRef = useRef(reduce);
  const mountedRef = useRef(true);
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);

  useEffect(() => {
    thinkingRef.current = thinking;
  }, [thinking]);
  useEffect(() => {
    reduceRef.current = reduce;
  }, [reduce]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const gl = glRef.current as (ExpoWebGLRenderingContext & {
        __pura_cleanup?: () => void;
      }) | null;
      gl?.__pura_cleanup?.();
    };
  }, []);

  // ---- Container state machine ----
  useEffect(() => {
    const idleScale = idlePx / BASE;
    const thinkScale = thinkPx / BASE;

    cancelAnimation(opacity);
    if (reduce && thinking) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      opacity.value = withTiming(subdued ? 0.6 : 1, { duration: 300 });
    }

    cancelAnimation(visScale);
    visScale.value = thinking
      ? withTiming(thinkScale, { duration: 300, easing: Easing.out(Easing.cubic) })
      : withTiming(idleScale, { duration: 400, easing: Easing.inOut(Easing.ease) });

    cancelAnimation(breath);
    if (!thinking && !reduce) {
      breath.value = withRepeat(
        withSequence(
          withTiming(1.025, {
            duration: BREATH_MS / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: BREATH_MS / 2,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );
    } else {
      breath.value = withTiming(1, { duration: 300 });
    }

    // Response landing: pop on the thinking→done falling edge.
    if (prevThinking.current && !thinking && !reduce) {
      cancelAnimation(pop);
      pop.value = withSequence(
        withTiming(1.05, { duration: 175, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 175, easing: Easing.inOut(Easing.ease) }),
      );
    }
    prevThinking.current = thinking;
  }, [thinking, reduce, subdued, idlePx, thinkPx, opacity, visScale, breath, pop]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: visScale.value * breath.value * pop.value }],
  }));

  // ---- GL scene ----
  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    try {
      glRef.current = gl;
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      const renderer = new Renderer({ gl, width, height });
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0); // transparent: lives on the card
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(24, width / height, 0.01, 100);

      // Soft, warm key + faint Pura-blue rim. No harsh clinical specular.
      scene.add(new THREE.AmbientLight(0xffffff, 1.7));
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(0.5, 1.0, 2.0);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x147cff, 0.28);
      rim.position.set(-1.6, 0.6, 1.0);
      scene.add(rim);

      // Live animation state (plain JS — read by the rAF loop).
      const morphMap: Record<string, Array<{ mesh: THREE.Mesh; index: number }>> = {};
      const setMorph = (name: string, v: number) => {
        const entries = morphMap[name];
        if (!entries) return;
        for (const e of entries) {
          if (e.mesh.morphTargetInfluences) e.mesh.morphTargetInfluences[e.index] = v;
        }
      };

      let headBone: THREE.Object3D | null = null;
      let leftEye: THREE.Object3D | null = null;
      let rightEye: THREE.Object3D | null = null;
      const base = {
        headZ: 0,
        leftY: 0,
        leftX: 0,
        rightY: 0,
        rightX: 0,
      };

      let raf = 0;
      const disposeScene = () => {
        cancelAnimationFrame(raf);
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if ((m as unknown as { isMesh?: boolean }).isMesh) {
            m.geometry?.dispose?.();
            const mat = m.material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose?.());
            else mat?.dispose?.();
          }
        });
        renderer.dispose?.();
      };
      (gl as ExpoWebGLRenderingContext & { __pura_cleanup?: () => void }).__pura_cleanup =
        disposeScene;

      const loader = new GLTFLoader();
      loader.load(
        buildAvatarUrl(avatarUrl),
        (gltf) => {
          if (!mountedRef.current) {
            disposeScene();
            return;
          }
          const model = gltf.scene;

          model.traverse((obj) => {
            // Hide body/outfit so only the face character shows.
            if (HIDE_MESH.test(obj.name)) obj.visible = false;

            // Collect ARKit morph influences across every mesh that has them.
            const mesh = obj as THREE.Mesh;
            if (
              (mesh as unknown as { isMesh?: boolean }).isMesh &&
              mesh.morphTargetDictionary &&
              mesh.morphTargetInfluences
            ) {
              for (const [name, idx] of Object.entries(mesh.morphTargetDictionary)) {
                (morphMap[name] ||= []).push({ mesh, index: idx as number });
              }
            }

            // Eye + head bones for look-around / tilt.
            if (obj.name === 'Head' || obj.name === 'head') headBone = obj;
            if (obj.name === 'LeftEye') leftEye = obj;
            if (obj.name === 'RightEye') rightEye = obj;
          });

          if (headBone) base.headZ = (headBone as THREE.Object3D).rotation.z;
          if (leftEye) {
            base.leftY = (leftEye as THREE.Object3D).rotation.y;
            base.leftX = (leftEye as THREE.Object3D).rotation.x;
          }
          if (rightEye) {
            base.rightY = (rightEye as THREE.Object3D).rotation.y;
            base.rightX = (rightEye as THREE.Object3D).rotation.x;
          }

          if (__DEV__) {
            // Device-log breadcrumb: confirms the rig matched our assumptions
            // (ARKit morphs present, Head/eye bones found). If morphs===0 or
            // the bones are missing, the avatar isn't ARKit-rigged — re-export
            // with ?morphTargets=ARKit.
            // eslint-disable-next-line no-console
            console.log('[AssistantFace3D] avatar loaded', {
              morphs: Object.keys(morphMap).length,
              headBone: !!headBone,
              eyeBones: !!(leftEye && rightEye),
            });
          }

          scene.add(model);
          model.updateMatrixWorld(true);

          // Auto-frame the VISIBLE meshes (body hidden → head + hair + stub).
          const box = new THREE.Box3();
          model.traverse((o) => {
            const m = o as THREE.Mesh;
            if (
              (m as unknown as { isMesh?: boolean }).isMesh &&
              m.visible &&
              m.geometry
            ) {
              m.geometry.computeBoundingBox?.();
              const gb = m.geometry.boundingBox;
              if (gb) box.union(gb.clone().applyMatrix4(m.matrixWorld));
            }
          });

          const center = box.getCenter(new THREE.Vector3());
          const dims = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(dims.x, dims.y, 0.001);
          const fovRad = (camera.fov * Math.PI) / 180;
          const dist = (maxDim / 2 / Math.tan(fovRad / 2)) * 1.35;
          // Bias the framing toward the top of the bbox (the face).
          camera.position.set(center.x, center.y + dims.y * 0.16, center.z + dist);
          camera.lookAt(center.x, center.y + dims.y * 0.06, center.z);

          // ---- Animation loop ----
          const clock = new THREE.Clock();
          let gx = 0.22;
          let gy = 0;
          let tgx = 0.22;
          let tgy = 0;
          const SCRIPT: Array<[number, number]> = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];
          let scriptIdx = 0;
          let scriptT = 0;

          let blinkVal = 0;
          let blinkState: 'open' | 'closing' | 'opening' = 'open';
          let blinkTimer = 0;
          let nextBlink = 4 + Math.random() * 2;

          const renderLoop = () => {
            raf = requestAnimationFrame(renderLoop);
            const dt = Math.min(clock.getDelta(), 0.05);
            const t = clock.elapsedTime;
            const thinkingNow = thinkingRef.current;
            const reduceNow = reduceRef.current;

            // ---- gaze target ----
            if (reduceNow) {
              tgx = 0.25;
              tgy = 0;
            } else if (thinkingNow) {
              scriptT += dt;
              if (scriptT > 1.0) {
                scriptT = 0;
                scriptIdx = (scriptIdx + 1) % SCRIPT.length;
                if (blinkState === 'open') blinkState = 'closing'; // blink on saccade
              }
              tgx = SCRIPT[scriptIdx][0] * 0.65;
              tgy = SCRIPT[scriptIdx][1] * 0.55;
            } else {
              tgx = 0.22;
              tgy = 0;
            }
            const k = reduceNow ? 1 : 0.12;
            gx += (tgx - gx) * k;
            gy += (tgy - gy) * k;

            // Eye bones (reliable on the RPM rig); morph fallback if absent.
            if (leftEye && rightEye) {
              const yaw = gx * EYE_YAW;
              const pitch = -gy * EYE_PITCH;
              (leftEye as THREE.Object3D).rotation.y = base.leftY + yaw;
              (rightEye as THREE.Object3D).rotation.y = base.rightY + yaw;
              (leftEye as THREE.Object3D).rotation.x = base.leftX + pitch;
              (rightEye as THREE.Object3D).rotation.x = base.rightX + pitch;
            } else {
              setMorph('eyeLookOutLeft', gx < 0 ? -gx : 0);
              setMorph('eyeLookInRight', gx < 0 ? -gx : 0);
              setMorph('eyeLookInLeft', gx > 0 ? gx : 0);
              setMorph('eyeLookOutRight', gx > 0 ? gx : 0);
              setMorph('eyeLookUpLeft', gy > 0 ? gy : 0);
              setMorph('eyeLookUpRight', gy > 0 ? gy : 0);
              setMorph('eyeLookDownLeft', gy < 0 ? -gy : 0);
              setMorph('eyeLookDownRight', gy < 0 ? -gy : 0);
            }

            // ---- blink (disabled under reduced motion) ----
            if (!reduceNow) {
              blinkTimer += dt;
              if (blinkState === 'open' && blinkTimer >= nextBlink) {
                blinkState = 'closing';
              }
              if (blinkState === 'closing') {
                blinkVal += dt / 0.06;
                if (blinkVal >= 1) {
                  blinkVal = 1;
                  blinkState = 'opening';
                }
              } else if (blinkState === 'opening') {
                blinkVal -= dt / 0.1;
                if (blinkVal <= 0) {
                  blinkVal = 0;
                  blinkState = 'open';
                  blinkTimer = 0;
                  nextBlink = thinkingNow
                    ? 0.8 + Math.random() * 0.6
                    : 4 + Math.random() * 2;
                }
              }
            } else {
              blinkVal = 0;
            }
            setMorph('eyeBlinkLeft', blinkVal);
            setMorph('eyeBlinkRight', blinkVal);

            // ---- head tilt (thinking only) ----
            if (headBone) {
              const targetZ =
                !reduceNow && thinkingNow ? Math.sin(t * 0.9) * HEAD_TILT : 0;
              const hb = headBone as THREE.Object3D;
              hb.rotation.z += (base.headZ + targetZ - hb.rotation.z) * 0.1;
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
          };
          renderLoop();
        },
        undefined,
        (err: unknown) => {
          // Surfaced in device logs so an on-device load failure (bad URL,
          // offline, Draco/compression, CORS) is diagnosable rather than a
          // silent fallback to the SVG face.
          // eslint-disable-next-line no-console
          console.warn(
            '[AssistantFace3D] avatar GLB failed to load:',
            buildAvatarUrl(avatarUrl),
            err instanceof Error ? err.message : err,
          );
          if (mountedRef.current) setFailed(true);
        },
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[AssistantFace3D] GL init failed:', e);
      if (mountedRef.current) setFailed(true);
    }
  };

  // ---- Fallback: the SVG wireframe face, never a broken card ----
  if (failed) {
    return (
      <View
        style={{
          width: thinkPx,
          height: thinkPx,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: subdued ? 0.6 : 1,
        }}
      >
        <AssistantFace thinking={thinking} size={idlePx} />
      </View>
    );
  }

  return (
    <View
      style={{
        width: thinkPx,
        height: thinkPx,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[{ width: BASE, height: BASE, position: 'absolute' }, containerStyle]}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <GLView
          key={avatarUrl}
          style={{ width: BASE, height: BASE }}
          onContextCreate={onContextCreate}
        />
      </Animated.View>
    </View>
  );
}
