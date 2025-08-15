import * as THREE from 'three';
import { LeverageOptimizer } from './LeverageOptimizer';
import { Character, Territory } from '../types/game';

interface VisualEffect {
  mesh: THREE.Mesh | THREE.Points;
  duration: number;
  startTime: number;
  type: 'combat' | 'craft' | 'resource' | 'territory' | 'trait';
  intensity: number;
}

export class LeverageVisualizer {
  private scene: THREE.Scene;
  private optimizer: LeverageOptimizer;
  private activeEffects: Map<string, VisualEffect>;
  private particleSystems: Map<string, THREE.Points>;
  private glowMaterials: Map<string, THREE.ShaderMaterial>;

  constructor(scene: THREE.Scene, optimizer: LeverageOptimizer) {
    this.scene = scene;
    this.optimizer = optimizer;
    this.activeEffects = new Map();
    this.particleSystems = new Map();
    this.glowMaterials = new Map();
    this.initializeShaders();
  }

  private initializeShaders() {
    // Glow shader for leverage effects
    const glowVertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const glowFragmentShader = `
      uniform vec3 color;
      uniform float intensity;
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        float pulse = (sin(time * 2.0) + 1.0) * 0.5;
        float rim = 1.0 - max(dot(normalize(-vPosition), vNormal), 0.0);
        rim = pow(rim, 3.0) * intensity * (0.8 + 0.2 * pulse);
        gl_FragColor = vec4(color, rim);
      }
    `;

    // Create materials for different effect types
    const effectColors = {
      combat: new THREE.Color(0xff0000),
      craft: new THREE.Color(0x00ff00),
      resource: new THREE.Color(0x0000ff),
      territory: new THREE.Color(0xffff00),
      trait: new THREE.Color(0xff00ff)
    };

    Object.entries(effectColors).forEach(([type, color]) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: color },
          intensity: { value: 1.0 },
          time: { value: 0.0 }
        },
        vertexShader: glowVertexShader,
        fragmentShader: glowFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide
      });

      this.glowMaterials.set(type, material);
    });
  }

  async visualizeLeverageEffect(
    type: 'combat' | 'craft' | 'resource' | 'territory' | 'trait',
    position: THREE.Vector3,
    character: Character,
    context: any
  ) {
    // Get optimization data
    const optimization = await this.optimizer.optimizeAction(type, character, context);
    const intensity = optimization.leverageMultiplier;

    // Create effect geometry based on type
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    let mesh: THREE.Mesh | THREE.Points;

    switch (type) {
      case 'combat':
        geometry = new THREE.TorusGeometry(2, 0.2, 16, 100);
        material = this.glowMaterials.get('combat')!.clone();
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        break;

      case 'craft':
        geometry = new THREE.OctahedronGeometry(1);
        material = this.glowMaterials.get('craft')!.clone();
        mesh = new THREE.Mesh(geometry, material);
        break;

      case 'resource':
        geometry = new THREE.DodecahedronGeometry(1);
        material = this.glowMaterials.get('resource')!.clone();
        mesh = new THREE.Mesh(geometry, material);
        break;

      case 'territory':
        // Create territory influence particles
        const particleCount = 1000;
        geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
          const radius = 5 + Math.random() * 5;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;

          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = radius * Math.cos(phi);

          const color = new THREE.Color(0xffff00);
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;

          sizes[i] = Math.random() * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        material = new THREE.PointsMaterial({
          size: 0.1,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          transparent: true
        });

        mesh = new THREE.Points(geometry, material);
        break;

      case 'trait':
        geometry = new THREE.IcosahedronGeometry(1);
        material = this.glowMaterials.get('trait')!.clone();
        mesh = new THREE.Mesh(geometry, material);
        break;

      default:
        return;
    }

    // Position the effect
    mesh.position.copy(position);

    // Add to scene and active effects
    this.scene.add(mesh);
    const effectId = `${type}_${Date.now()}`;
    this.activeEffects.set(effectId, {
      mesh,
      duration: 2000, // 2 seconds
      startTime: Date.now(),
      type,
      intensity
    });

    // Set initial uniforms for shader materials
    if (material instanceof THREE.ShaderMaterial) {
      material.uniforms.intensity.value = intensity;
    }

    // Create particle system for additional effect
    this.createParticleSystem(position, type, intensity);

    return effectId;
  }

  private createParticleSystem(
    position: THREE.Vector3,
    type: string,
    intensity: number
  ) {
    const particleCount = Math.floor(100 * intensity);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color = new THREE.Color();
    switch (type) {
      case 'combat':
        color.setHex(0xff0000);
        break;
      case 'craft':
        color.setHex(0x00ff00);
        break;
      case 'resource':
        color.setHex(0x0000ff);
        break;
      case 'territory':
        color.setHex(0xffff00);
        break;
      case 'trait':
        color.setHex(0xff00ff);
        break;
    }

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = position.x + radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = position.y + radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = position.z + radius * Math.cos(phi);

      velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 1] = Math.random() * 0.1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    const particleId = `particles_${type}_${Date.now()}`;
    this.particleSystems.set(particleId, particles);

    // Remove particles after duration
    setTimeout(() => {
      this.scene.remove(particles);
      this.particleSystems.delete(particleId);
    }, 2000);
  }

  update(deltaTime: number) {
    const currentTime = Date.now();

    // Update active effects
    this.activeEffects.forEach((effect, id) => {
      const age = currentTime - effect.startTime;
      if (age > effect.duration) {
        this.scene.remove(effect.mesh);
        this.activeEffects.delete(id);
      } else {
        const progress = age / effect.duration;
        const scale = 1 + Math.sin(progress * Math.PI) * 0.2;
        effect.mesh.scale.setScalar(scale);

        if (effect.mesh.material instanceof THREE.ShaderMaterial) {
          effect.mesh.material.uniforms.time.value = age * 0.001;
          effect.mesh.material.uniforms.intensity.value = 
            effect.intensity * (1 - progress);
        }

        // Rotate effects
        switch (effect.type) {
          case 'combat':
            effect.mesh.rotation.z += deltaTime * 2;
            break;
          case 'craft':
            effect.mesh.rotation.y += deltaTime;
            effect.mesh.rotation.x += deltaTime * 0.5;
            break;
          case 'resource':
            effect.mesh.rotation.y -= deltaTime * 1.5;
            break;
          case 'trait':
            effect.mesh.rotation.y += deltaTime * 0.8;
            effect.mesh.rotation.z += deltaTime * 0.5;
            break;
        }
      }
    });

    // Update particle systems
    this.particleSystems.forEach((particles) => {
      const positions = particles.geometry.attributes.position;
      const velocities = particles.geometry.attributes.velocity;

      for (let i = 0; i < positions.count; i++) {
        positions.setXYZ(
          i,
          positions.getX(i) + velocities.getX(i),
          positions.getY(i) + velocities.getY(i),
          positions.getZ(i) + velocities.getZ(i)
        );
      }

      positions.needsUpdate = true;
    });
  }

  visualizeTerritoryInfluence(territory: Territory, influence: number) {
    const position = new THREE.Vector3(
      territory.position.x,
      territory.position.y,
      territory.position.z
    );

    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.2 + (influence * 0.3)
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);

    this.scene.add(sphere);

    // Pulse effect
    const startScale = 1;
    const pulseAnimation = () => {
      const time = Date.now() * 0.001;
      const scale = startScale + Math.sin(time * 2) * 0.1;
      sphere.scale.setScalar(scale);
      requestAnimationFrame(pulseAnimation);
    };

    pulseAnimation();

    return sphere;
  }

  clearEffects() {
    this.activeEffects.forEach((effect) => {
      this.scene.remove(effect.mesh);
    });
    this.activeEffects.clear();

    this.particleSystems.forEach((particles) => {
      this.scene.remove(particles);
    });
    this.particleSystems.clear();
  }
}