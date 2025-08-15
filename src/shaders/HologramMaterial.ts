import * as THREE from 'three';
import { extend } from '@react-three/fiber';

// Create the shader material implementation
const HologramMaterialImpl = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color(0.2, 0.4, 1.0) },
    alpha: { value: 0.5 },
    scanlineIntensity: { value: 0.15 },
    scanlineCount: { value: 50 },
    glowIntensity: { value: 0.5 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float alpha;
    uniform float scanlineIntensity;
    uniform float scanlineCount;
    uniform float glowIntensity;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      // Scanline effect
      float scanline = step(0.5, sin(vUv.y * scanlineCount + time * 2.0)) * scanlineIntensity;
      
      // Fresnel effect for edge glow
      vec3 viewDirection = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 3.0);
      
      // Holographic noise
      float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
      
      // Combine effects
      vec3 finalColor = color + vec3(scanline) + vec3(fresnel * glowIntensity);
      float finalAlpha = alpha * (1.0 + fresnel * 0.5 + noise * 0.1);
      
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `
};

class HologramMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      ...HologramMaterialImpl,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: THREE.UniformsUtils.clone(HologramMaterialImpl.uniforms)
    });
  }

  get time() {
    return this.uniforms.time.value;
  }

  set time(value: number) {
    this.uniforms.time.value = value;
  }

  get color() {
    return this.uniforms.color.value;
  }

  set color(value: THREE.Color) {
    this.uniforms.color.value = value;
  }

  get alpha() {
    return this.uniforms.alpha.value;
  }

  set alpha(value: number) {
    this.uniforms.alpha.value = value;
  }

  get scanlineIntensity() {
    return this.uniforms.scanlineIntensity.value;
  }

  set scanlineIntensity(value: number) {
    this.uniforms.scanlineIntensity.value = value;
  }

  get scanlineCount() {
    return this.uniforms.scanlineCount.value;
  }

  set scanlineCount(value: number) {
    this.uniforms.scanlineCount.value = value;
  }

  get glowIntensity() {
    return this.uniforms.glowIntensity.value;
  }

  set glowIntensity(value: number) {
    this.uniforms.glowIntensity.value = value;
  }
}

// Make it available to React Three Fiber
extend({ HologramMaterial });

// Add type support
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'hologramMaterial': JSX.IntrinsicElements['shaderMaterial'] & {
        time?: number;
        color?: THREE.Color;
        alpha?: number;
        scanlineIntensity?: number;
        scanlineCount?: number;
        glowIntensity?: number;
      };
    }
  }
}

export { HologramMaterial };