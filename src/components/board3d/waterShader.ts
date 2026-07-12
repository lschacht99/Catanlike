import * as THREE from "three";

/**
 * Cheap layered-wave water shader: deep-water base color, a slow large swell
 * plus two faster smaller ripple layers (different direction/frequency/speed
 * each, so nothing tiles or repeats visibly), and a soft height-based
 * lightening pass standing in for foam/highlights instead of a specular
 * flare (keeps it a painterly sea, not a glossy plastic one). A handful of
 * trig ops per vertex/fragment, no textures, no loops — cheap enough for an
 * older iPhone's GPU without any separate low-power code path.
 */

export const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;
  varying vec2 vWorldXY;

  // Slow, large swell (direction, frequency, speed, amplitude) plus two
  // smaller/faster ripple layers on different, non-aligned directions.
  const vec2 SWELL_DIR = normalize(vec2(1.0, 0.35));
  const vec2 RIPPLE1_DIR = normalize(vec2(-0.6, 1.0));
  const vec2 RIPPLE2_DIR = normalize(vec2(0.25, -0.85));

  float waveHeight(vec2 p, float t) {
    float swell = sin(dot(p, SWELL_DIR) * 0.35 + t * 0.35) * 0.05;
    float ripple1 = sin(dot(p, RIPPLE1_DIR) * 0.9 + t * 0.7) * 0.018;
    float ripple2 = sin(dot(p, RIPPLE2_DIR) * 1.7 + t * 1.15) * 0.01;
    return swell + ripple1 + ripple2;
  }

  void main() {
    vec3 pos = position;
    float h = waveHeight(pos.xy, uTime);
    pos.z += h;
    vHeight = h;
    vWorldXY = pos.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uHighlightColor;
  varying float vHeight;
  varying vec2 vWorldXY;

  // A finer, faster-moving micro-ripple purely for color texture (not
  // vertex displacement) so the surface reads as textured water rather than
  // a smooth tinted plane, without adding more geometry-shifting waves.
  float microRipple(vec2 p, float t) {
    return sin(p.x * 2.3 + p.y * 1.6 + t * 1.6) * 0.5 + 0.5;
  }

  void main() {
    float crest = clamp(vHeight * 9.0 + 0.5, 0.0, 1.0);
    float micro = microRipple(vWorldXY, uTime) * 0.12;
    vec3 color = mix(uDeepColor, uHighlightColor, crest * 0.5 + micro);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export type WaterUniforms = { [key: string]: THREE.IUniform } & {
  uTime: THREE.IUniform<number>;
  uDeepColor: THREE.IUniform<THREE.Color>;
  uHighlightColor: THREE.IUniform<THREE.Color>;
};

export function waterUniforms(deepColor = "#124b68", highlightColor = "#3f9dc4"): WaterUniforms {
  return {
    uTime: { value: 0 },
    uDeepColor: { value: new THREE.Color(deepColor) },
    uHighlightColor: { value: new THREE.Color(highlightColor) },
  };
}
