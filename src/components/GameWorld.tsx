import React, { useRef, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls, Environment, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useGameContext } from '../context/GameContext';
import Territory from './Territory';
import { useHoneycomb } from '../services/honeycomb/HoneycombProvider';
import MissionsPanel from './MissionsPanel';
import { useFrame } from '@react-three/fiber';
import ParticleSystem from './effects/ParticleSystem';
import * as THREE from 'three';
import { CombatSystem } from '../services/CombatSystem';
import { LeverageService } from '../services/LeverageService';
import { HoneycombService } from '../services/honeycomb';
import { ResourceManager } from '../services/ResourceManager';
import { WEBGL_CONFIG } from '../config/appConfig';

type ActionEffect = { id: string; type: string; position: [number, number, number]; start: number } | null;

type Flight = {
  id: string;
  start: number;
  durationMs: number;
  from: [number, number, number];
  to: [number, number, number];
  count: number;
  owner: string;
  fromId?: string;
  toId?: string;
  amount?: number;
};

type BattleParticle = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
};

type LocalBattle = {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  attackers: { count: number, owner: string };
  defenders: { count: number, owner: string };
  attackerParticles: BattleParticle[];
  defenderParticles: BattleParticle[];
  sparks: BattleParticle[];
  createdAt: number;
  lastUpdated: number;
};

const ARENA_RADIUS = 2.5;

const checkWebGLSupport = () => {
  if (typeof window === 'undefined') return true;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported, enabling safe mode');
      localStorage.setItem('webgl_safe_mode', 'true');
      return false;
    }
    return true;
  } catch (e) {
    console.warn('WebGL check failed, enabling safe mode:', e);
    localStorage.setItem('webgl_safe_mode', 'true');
    return false;
  }
};

const FlightMesh: React.FC<{ flight: Flight; onDone: (id: string) => void; speed: number, playerId: string | null }> = ({ flight, onDone, speed, playerId }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Heavier staggering to achieve Eufloria-like dribble launch
  const offsets = useMemo(() => new Array(flight.count).fill(0).map(() => Math.random() * 2000), [flight.count]);

  const bezierPoint = (t: number): [number, number, number] => {
    const [x1, y1, z1] = flight.from;
    const [x3, y3, z3] = flight.to;
    const cx = (x1 + x3) / 2;
    const cz = (z1 + z3) / 2;
    const cy = Math.max(y1, y3) + 2.5;
    const u = 1 - t;
    const x = u * u * x1 + 2 * u * t * cx + t * t * x3;
    const y = u * u * y1 + 2 * u * t * cy + t * t * y3;
    const z = u * u * z1 + 2 * u * t * cz + t * t * z3;
    return [x, y, z];
  };

  useFrame(() => {
    if (!meshRef.current) return;
    const now = performance.now();
    let anyActive = false;
    
    for (let i = 0; i < flight.count; i++) {
      // Slow animation clock slightly for smoother gliding
      const elapsed = (now - flight.start - offsets[i]) * Math.max(0.15, speed);
      const rawT = Math.min(1, Math.max(0, elapsed / flight.durationMs));
      
      if (rawT < 0.80) {
        anyActive = true;
        
        const p = bezierPoint(rawT);
        dummy.position.set(p[0], p[1], p[2]);
        const s = 0.12;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    if (!anyActive) {
      onDone(flight.id);
    }
  });

  const flightColor = ((): string => {
    const owner = flight.owner as any;
    const pid = playerId || 'guest_local';
    
    const isPlayerUnits = !owner || owner === 'player' || owner === pid || 
                         (typeof owner === 'string' && (
                           owner.startsWith('127.0.0.1:') || 
                           owner === 'localhost' ||
                           owner.includes('player') ||
                           owner === 'guest_local'
                         ));
    
    if (isPlayerUnits) return "#44ff44";
    if (owner && typeof owner === 'string' && owner.startsWith('bot_')) return "#ff4444";
    return "#4488ff";
  })();

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, flight.count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={flightColor} transparent opacity={1.0} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
};

const Trail: React.FC<{ flight: Flight, speed: number }> = ({ flight, speed }) => {
  const lineRef = useRef<any>();
  const points = useMemo(() => {
    const [x1, y1, z1] = flight.from;
    const [x3, y3, z3] = flight.to;
    const cx = (x1 + x3) / 2 + (Math.random() - 0.5) * 4;
    const cz = (z1 + z3) / 2 + (Math.random() - 0.5) * 4;
    const cy = Math.max(y1, y3) + 3.5 + (Math.random() - 0.5) * 2;
    
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3(cx, cy, cz),
      new THREE.Vector3(x3, y3, z3)
    );
    return curve.getPoints(50);
  }, [flight]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  
  useFrame(() => {
    if (lineRef.current?.material?.userData?.shader) {
      const elapsed = (performance.now() - flight.start) * Math.max(0.1, speed);
      const progress = Math.min(1.0, elapsed / flight.durationMs);
      lineRef.current.material.userData.shader.uniforms.dashOffset.value = 1 - progress;
    }
  });

  return (
    <line ref={lineRef}>
      <primitive attach="geometry" object={geometry} />
      <lineDashedMaterial
        color="#aaddff"
        dashSize={0.2}
        gapSize={0.1}
        transparent
        opacity={0.6}
        linewidth={1}
        onBeforeCompile={(shader) => {
          (lineRef.current.material as any).userData.shader = shader;
          shader.uniforms.dashOffset = { value: 1 };
          shader.fragmentShader = `
            uniform float dashOffset;
            ${shader.fragmentShader.replace(
              'if ( mod( vLineDistance, totalSize ) > dashSize ) { discard; }',
              'if ( mod( vLineDistance + dashOffset * totalSize, totalSize ) > dashSize ) { discard; }'
            )}
          `;
        }}
      />
    </line>
  );
};

const UnitFlights: React.FC<{ flights: Flight[]; onDone: (id: string) => void; speed: number, playerId: string | null }> = ({ flights, onDone, speed, playerId }) => {
  
  return (
    <group>
      {flights.map(f => (
        <group key={f.id}>
          <Trail flight={f} speed={speed} />
          <FlightMesh flight={f} onDone={onDone} speed={speed} playerId={playerId} />
        </group>
      ))}
    </group>
  );
};

const EffectsLayer: React.FC<{
  actionEffect: ActionEffect;
  effectRef: React.MutableRefObject<{ life: number }>;
  setActionEffect: React.Dispatch<React.SetStateAction<ActionEffect>>;
  speed: number;
}> = ({ actionEffect, effectRef, setActionEffect, speed }) => {
  useFrame((_, delta) => {
    if (!actionEffect) return;
    effectRef.current.life += delta * 1000 * Math.max(0.25, speed);
    if (effectRef.current.life > 2200) {
      setActionEffect(null);
      effectRef.current.life = 0;
    }
  });

  if (!actionEffect) return null;

  return (
    <group>
      {actionEffect.type === 'attack' && (
        <>
          {/* Core impact flash */}
          <mesh position={actionEffect.position}>
            <sphereGeometry args={[0.8 + effectRef.current.life / 900, 24, 24]} />
            <meshBasicMaterial color="#ff6666" transparent opacity={Math.max(0, 0.95 - effectRef.current.life / 700)} blending={THREE.AdditiveBlending} />
          </mesh>
          {/* Shockwave ring */}
          <mesh position={actionEffect.position} rotation={[Math.PI/2,0,0]}>
            <ringGeometry args={[0.6 + effectRef.current.life / 600, 0.7 + effectRef.current.life / 450, 64]} />
            <meshBasicMaterial color="#ffaa88" transparent opacity={Math.max(0, 0.8 - effectRef.current.life / 1100)} blending={THREE.AdditiveBlending} />
          </mesh>
        </>
      )}
      {(actionEffect.type === 'defend' || actionEffect.type === 'claim') && (
        <mesh position={actionEffect.position}>
          <ringGeometry args={[1.4 + effectRef.current.life / 600, 1.6 + effectRef.current.life / 600, 64]} />
          <meshBasicMaterial color={actionEffect.type === 'defend' ? '#44aaff' : '#44ff88'} transparent opacity={Math.max(0, 0.8 - effectRef.current.life / 900)} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
      {actionEffect.type === 'research' && (
        <group position={[actionEffect.position[0], actionEffect.position[1] + 1, actionEffect.position[2]]}>
          <ParticleSystem count={10} radius={0.8} speed={0.3} color="#ffee88" intensity={1.0} />
        </group>
      )}
      {actionEffect.type === 'harvest' && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                0, 0, 0,
                actionEffect.position[0], actionEffect.position[1], actionEffect.position[2]
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffff66" transparent opacity={Math.max(0, 1 - effectRef.current.life / 900)} />
        </line>
      )}
    </group>
  );
};

const SimpleRenderer: React.FC<{ territories: any[], onRefreshWorld?: () => void }> = ({ territories, onRefreshWorld }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(145deg, #0a192f, #172a45)',
      color: 'white',
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: '"Roboto Mono", monospace',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Simple World View (Dev Mode)</h2>
        <button onClick={onRefreshWorld} style={{
          background: '#64ffda',
          color: '#0a192f',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}>
          Refresh World
        </button>
      </div>
      {territories.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {territories.map(t => (
            <div key={t.id} style={{
              background: 'rgba(100, 255, 218, 0.1)',
              border: '1px solid #64ffda',
              padding: '15px',
              borderRadius: '4px',
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#ccd6f6' }}>{t.name || t.id}</h3>
              <p style={{ margin: '5px 0', fontSize: '0.9em' }}>Controlled by: {t.controlledBy || 'Neutral'}</p>
              <p style={{ margin: '5px 0', fontSize: '0.9em' }}>Defense: {t.defense}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>Loading game world...</p>
      )}
    </div>
  );
};

const GameWorld: React.FC = () => {
  const [renderMode, setRenderMode] = useState<'3d' | 'simple'>('3d');
  const [canvasKey, setCanvasKey] = useState(0);
  const [speed] = useState<number>(1);
  const [showMissions, setShowMissions] = useState<boolean>(false);

  useEffect(() => {
    const isWebGLSupported = checkWebGLSupport();
    if (WEBGL_CONFIG.FORCE_SIMPLE_RENDERER || !isWebGLSupported) {
      setRenderMode('simple');
    }
  }, []);

  const { 
    world, 
    activeCharacter, 
    playerId, 
    getWorld, 
    harvestPlanet,
    attackPlanet,
    moveUnits,
    deployResearch
  } = useGameContext();
  // Access Honeycomb at the component top level (hooks must not be called inside callbacks)
  const { client, projectAddress } = useHoneycomb();
  const [actionEffect, setActionEffect] = useState<ActionEffect>(null);
  const effectRef = useRef<{ life: number }>({ life: 0 });
  const [flights, setFlights] = useState<Flight[]>([]);
  
  const battlesRef = useRef<LocalBattle[]>([]);
  const sunRef = useRef<THREE.PointLight>(null);
  const controlsRef = useRef<any>(null);

  const [focusTarget, setFocusTarget] = useState<[number, number, number] | null>(null);
  const [focusActive, setFocusActive] = useState<boolean>(false);

  useEffect(() => {
    const onWheel = () => setFocusActive(false);
    window.addEventListener('wheel', onWheel, { passive: true } as any);
    return () => window.removeEventListener('wheel', onWheel as any);
  }, []);

  const FocusController: React.FC<{ target: [number, number, number] | null; active: boolean }>
    = ({ target, active }) => {
    const { camera } = useThree();
    const desiredOffset = useMemo(() => new THREE.Vector3(0, 4, 8), []);
    useFrame(() => {
      if (!active || !target) return;
      const goal = new THREE.Vector3(target[0], target[1], target[2]);
      const camGoal = goal.clone().add(desiredOffset);
      camera.position.lerp(camGoal, 0.08);
      if (controlsRef.current?.target) {
        controlsRef.current.target.lerp(goal, 0.12);
        controlsRef.current.update?.();
      }
    });
    return null;
  };
  

  useEffect(() => {
    const leverageService = new LeverageService();
    const honeycombService = new HoneycombService();
    if (!client || !projectAddress) return;
    const resourceManager = new ResourceManager(client, projectAddress);
    const traitSystemStub = { computeAttackBonus: () => 0, computeDefenseBonus: () => 0, evolveTraits: () => Promise.resolve(), getTraits: () => [] } as any;
    new CombatSystem(leverageService, honeycombService, traitSystemStub, resourceManager);
  }, [client, projectAddress]);

  // Request world data when component mounts
  useEffect(() => {
    // Avoid duplicate requests in React StrictMode (dev) by gating on a one-shot flag
    let requested = false;
    if (!requested) {
      requested = true;
      console.log("GameWorld mounted - requesting initial world data");
      getWorld();
    }
    return () => { requested = true; };
  }, [getWorld]);

  useEffect(() => {
    // Monitor resource changes
    if (activeCharacter?.resources) {
      console.log('Resources updated:', activeCharacter.resources);
    }
  }, [activeCharacter?.resources]);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    window.dispatchEvent(new CustomEvent('action-feedback', { detail: { message, type } }));
  }, []);

  const PostProcessingWrapper: React.FC<{ sunRef: React.RefObject<any> }> = ({ sunRef }) => {
    const [hasError, setHasError] = useState(false);
    const { gl } = useThree();

    useEffect(() => {
      const handleContextRestored = () => setHasError(false);
      const handleContextLost = () => setHasError(true);
      if (gl?.domElement) {
        gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
        gl.domElement.addEventListener('webglcontextlost', handleContextLost);
        return () => {
          gl.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
          gl.domElement.removeEventListener('webglcontextlost', handleContextLost);
        };
      }
    }, [gl]);

    // Skip post-processing if there's an error or if the sun reference isn't ready
    if (hasError || !sunRef.current) return null;
    
    // Only use Bloom effect for now to avoid GodRays issues
    try {
      return (
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.4} luminanceSmoothing={0.9} height={300} />
          {/* GodRays temporarily disabled due to errors */}
          {/* <GodRays sun={sunRef.current} /> */}
        </EffectComposer>
      );
    } catch (error) {
      console.warn('Post-processing effects disabled:', error);
      setHasError(true);
      return null;
    }
  };

  const isFriendlyOwner = useCallback((owner?: string | null) => {
    if (!owner) return false;
    const normalizedOwner = String(owner);
    // Treat server "player" sentinel and local guest/test ids as friendly
    if (normalizedOwner === 'player') return true;
    if (playerId && normalizedOwner === playerId) return true;
    if (normalizedOwner.startsWith('127.0.0.1:')) return true;
    if (normalizedOwner.startsWith('guest_')) return true;
    return false;
  }, [playerId]);

  const getPlanetById = useCallback((planetId?: string | null) => {
    if (!planetId || !world) return null;
    return (world.galaxies || []).flatMap((g: any) => g.systems || []).flatMap((s: any) => s.planets || []).find((p: any) => p.id === planetId);
  }, [world]);

  // Compute world-space position for a planet (system offset + local planet position)
  const getWorldPositionForPlanetId = useCallback((planetId?: string | null): [number, number, number] | null => {
    if (!planetId || !world) return null;
    for (const galaxy of world.galaxies || []) {
      for (const system of galaxy.systems || []) {
        const planet = (system.planets || []).find((p: any) => p.id === planetId);
        if (planet) {
          const sx = Number(system.position?.x || 0);
          const sy = Number(system.position?.y || 0);
          const sz = Number(system.position?.z || 0);
          const px = Number(planet.position?.x || 0);
          const py = Number(planet.position?.y || 0);
          const pz = Number(planet.position?.z || 0);
          return [sx + px, sy + py, sz + pz];
        }
      }
    }
    return null;
  }, [world]);

  const getWorldPositionForPlanet = useCallback((planet: any): [number, number, number] => {
    const id = planet?.id;
    const pos = getWorldPositionForPlanetId(id);
    if (pos) return pos;
    // Fallback: assume no system offset
    return [Number(planet?.position?.x || 0), Number(planet?.position?.y || 0), Number(planet?.position?.z || 0)];
  }, [getWorldPositionForPlanetId]);

  useEffect(() => {
    const onAttack = (e: any) => {
      const d = e?.detail;
      if (!d) return;
      const pos: [number, number, number] = d.position 
        ? [Number(d.position.x || 0), Number(d.position.y || 0), Number(d.position.z || 0)] as [number, number, number]
        : [0, 0, 0];
      setActionEffect({ id: d.planetId, type: d.success ? 'attack' : 'defend', position: pos, start: performance.now() });

      // If the server provided an exact source position, spawn a visible flight immediately
      const src: [number, number, number] | null = d.from_id ? (getWorldPositionForPlanetId(d.from_id) as [number, number, number] | null) : (d.source_position
        ? [Number(d.source_position.x || 0), Number(d.source_position.y || 0), Number(d.source_position.z || 0)] as [number, number, number]
        : null);
      if (src) {
        const flight: Flight = {
          id: `server-attack-${Date.now()}`,
          start: performance.now(),
          durationMs: 1600,
          from: src,
          to: pos,
          count: Math.max(10, Number(d.attacking_units || 20)),
          owner: 'player'
        };
        setFlights(prev => [...prev, flight]);
      }
      // Spawn a brief local battle swarm at target for the battle window
      try {
        const nowTs = performance.now();
        const lb: LocalBattle = {
          id: `lb-${d.planetId}-${nowTs}`,
          from: src || [pos[0] - 1.2, pos[1], pos[2] - 1.2],
          to: pos,
          attackers: { count: Math.max(80, Number(d.attacking_units || 150)), owner: 'player' },
          defenders: { count: Math.max(20, Number(d.defense || 40)), owner: 'enemy' },
          attackerParticles: [],
          defenderParticles: [],
          sparks: [],
          createdAt: nowTs,
          lastUpdated: nowTs
        };
        // seed some particles
        for (let i = 0; i < 120; i += 1) {
          lb.attackerParticles.push({ x: pos[0] + (Math.random() - 0.5), y: pos[1] + (Math.random() - 0.5), z: pos[2] + (Math.random() - 0.5), vx: 0, vy: 0, vz: 0, life: 1000, maxLife: 1000 });
          lb.defenderParticles.push({ x: pos[0] + (Math.random() - 0.5), y: pos[1] + (Math.random() - 0.5), z: pos[2] + (Math.random() - 0.5), vx: 0, vy: 0, vz: 0, life: 1000, maxLife: 1000 });
        }
        battlesRef.current = [...(battlesRef.current || []), lb];
        setTimeout(() => { battlesRef.current = (battlesRef.current || []).filter(b => b.id !== lb.id); }, 1800);
      } catch {}
      const planetName = getPlanetById(d.planetId)?.name || `Planet ${d.planetId}`;
      showNotification(d.success ? `🏆 Victory! ${planetName} captured!` : `🛡️ Defense held! Attack on ${planetName} repelled!`, d.success ? 'success' : 'info');
    };
    window.addEventListener('attack-result', onAttack as EventListener);
    return () => window.removeEventListener('attack-result', onAttack as EventListener);
  }, [getPlanetById, showNotification]);

  const allPlanets = useMemo(() => {
    if (!world || !world.galaxies) return [];
    return world.galaxies.flatMap((g: any) => g.systems.flatMap((s: any) => s.planets));
  }, [world]);

  const handleRefreshWorld = useCallback(() => {
    getWorld();
  }, [getWorld]);

  // Planet interaction handler
  const [selectedPlanet, setSelectedPlanet] = useState<any>(null);
  // Support multi-source selection
  const [selectedSourcePlanets, setSelectedSourcePlanets] = useState<any[]>([]);
  const [interactionMode, setInteractionMode] = useState<'none' | 'harvest' | 'attack' | 'move' | 'research'>('none');
  const [unitAmount, setUnitAmount] = useState<number>(10);

  const findNearestFriendlyPlanet = useCallback((targetPlanet: any | null) => {
    if (!targetPlanet) return null;
    const friendlyPlanets = (allPlanets || []).filter((p: any) => isFriendlyOwner(p.controlledBy));
    if (friendlyPlanets.length === 0) return null;
    const distanceTo = (a: any, b: any) => {
      const dx = (a?.position?.x || 0) - (b?.position?.x || 0);
      const dy = (a?.position?.y || 0) - (b?.position?.y || 0);
      const dz = (a?.position?.z || 0) - (b?.position?.z || 0);
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };
    let nearest = friendlyPlanets[0];
    let best = distanceTo(nearest, targetPlanet);
    for (let i = 1; i < friendlyPlanets.length; i += 1) {
      const d = distanceTo(friendlyPlanets[i], targetPlanet);
      if (d < best) {
        best = d;
        nearest = friendlyPlanets[i];
      }
    }
    return nearest;
  }, [allPlanets, isFriendlyOwner]);

  const computedSourceForAttack = useMemo(() => {
    if (selectedSourcePlanets.length > 0) return selectedSourcePlanets[0];
    if (!selectedPlanet) return null;
    return findNearestFriendlyPlanet(selectedPlanet);
  }, [selectedSourcePlanets, selectedPlanet, findNearestFriendlyPlanet]);

  const handlePlanetClick = useCallback((planet: any) => {
    // Always select the planet when clicked
    setSelectedPlanet(planet);
    try {
      const worldPos = getWorldPositionForPlanet(planet);
      setFocusTarget(worldPos as [number, number, number]);
      setFocusActive(true);
    } catch {}
    
    // Show planet info regardless of mode
    showNotification(`Selected planet: ${planet.name || planet.id}`, 'info');
    
    // If no interaction mode is selected, we're done
    if (interactionMode === 'none') {
      return;
    }

    // If we're in attack mode, we need a source planet first
    if (interactionMode === 'attack') {
      if (selectedSourcePlanets.length === 0) {
        if (isFriendlyOwner(planet.controlledBy)) {
          setSelectedSourcePlanets([planet]);
          showNotification(`Selected source planet for attack: ${planet.name || planet.id}`, 'info');
        } else {
          // Auto-pick nearest friendly source to streamline attack flow
          const nearest = findNearestFriendlyPlanet(planet);
      if (nearest) {
            setSelectedSourcePlanets([nearest]);
            showNotification(`Source auto-selected: ${nearest.name || nearest.id}`, 'info');
          } else {
            showNotification(`No friendly planet available to launch an attack`, 'error');
          }
      }
    } else {
        // We already have a source planet, so this is the target
        if (isFriendlyOwner(planet.controlledBy)) {
          showNotification(`Cannot attack your own planet`, 'error');
        } else {
          // Just select the planet as target, the confirmation button will handle the attack
          showNotification(`Selected target planet for attack: ${planet.name || planet.id}`, 'info');
        }
      }
      return;
    }

    // If we're in move mode, we need a source planet first
    if (interactionMode === 'move') {
      if (selectedSourcePlanets.length === 0) {
        if (isFriendlyOwner(planet.controlledBy)) {
          setSelectedSourcePlanets([planet]);
          showNotification(`Selected source planet for movement: ${planet.name || planet.id}`, 'info');
        } else {
          showNotification(`Cannot move from uncontrolled planet`, 'error');
        }
      } else {
        // Just select the planet as target, the confirmation button will handle the movement
        showNotification(`Selected target planet for movement: ${planet.name || planet.id}`, 'info');
      }
    }
  }, [interactionMode, selectedSourcePlanets, isFriendlyOwner, harvestPlanet, showNotification, findNearestFriendlyPlanet]);

  // Battle duration is now controlled by individual battle animations

const LocalBattles: React.FC = () => {
    const attackerMeshRef = useRef<THREE.InstancedMesh>(null);
    const defenderMeshRef = useRef<THREE.InstancedMesh>(null);
    const sparkRef = useRef<THREE.InstancedMesh>(null);
    const arenaRef = useRef<THREE.Points>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const arenaParticles = useMemo(() => {
      const temp = [];
      for (let i = 0; i < 150; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = ARENA_RADIUS * Math.cbrt(Math.random());
        temp.push(new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)));
      }
      return temp;
    }, []);

    useFrame((_, delta) => {
      if (!Array.isArray(battlesRef.current)) {
        battlesRef.current = [];
        return;
      }
      
      const speedMul = Math.max(0.25, speed);
      const now = performance.now();
      const updated: LocalBattle[] = [];
      if (arenaRef.current) {
        let arenaIdx = 0;
        const arenaPositions = (arenaRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (const b of battlesRef.current) {
          const progress = Math.max(0.0, Math.min(1.0, (now - b.createdAt) / 2500));
          const maxAmbient = Math.floor(arenaParticles.length * (0.2 + 0.8 * progress));
          for (let i = 0; i < maxAmbient; i++) {
            const p = arenaParticles[i];
            arenaPositions[arenaIdx * 3] = b.to[0] + p.x;
            arenaPositions[arenaIdx * 3 + 1] = b.to[1] + p.y;
            arenaPositions[arenaIdx * 3 + 2] = b.to[2] + p.z;
            arenaIdx++;
          }
        }
        arenaRef.current.geometry.attributes.position.needsUpdate = true;
        (arenaRef.current as any).count = arenaIdx;
      }

      for (const b of battlesRef.current) {
        const px = b.to[0], py = b.to[1], pz = b.to[2];
        const progress = Math.max(0.0, Math.min(1.0, (now - b.createdAt) / 2500));
        const spawnScale = Math.max(0.2, progress);

        const attackerParticleCount = Math.floor((b.attackers.count / 10) * spawnScale);
        if (attackerParticleCount > b.attackerParticles.length) {
          for (let i = 0; i < (attackerParticleCount - b.attackerParticles.length); i++) {
            const ox = (Math.random() - 0.5) * 1.2;
            const oy = (Math.random() - 0.5) * 1.2;
            const oz = (Math.random() - 0.5) * 1.2;
            const dx = px - b.from[0], dy = py - b.from[1], dz = pz - b.from[2];
            const len = Math.max(0.001, Math.hypot(dx, dy, dz));
            const vx = (dx / len) * (0.006 + Math.random() * 0.012);
            const vy = (dy / len) * (0.006 + Math.random() * 0.012);
            const vz = (dz / len) * (0.006 + Math.random() * 0.012);
            b.attackerParticles.push({ x: b.from[0] + ox, y: b.from[1] + oy, z: b.from[2] + oz, vx, vy, vz, life: 3.0, maxLife: 3.0 });
          }
        }
        const defenderParticleCount = Math.floor((b.defenders.count / 10) * spawnScale);
        if (defenderParticleCount > b.defenderParticles.length) {
          for (let i = 0; i < (defenderParticleCount - b.defenderParticles.length); i++) {
            const vx = (Math.random() - 0.5) * 0.02;
            const vy = (Math.random() - 0.5) * 0.02;
            const vz = (Math.random() - 0.5) * 0.02;
            b.defenderParticles.push({ x: px + (Math.random()-0.5)*ARENA_RADIUS, y: py + (Math.random()-0.5)*ARENA_RADIUS, z: pz + (Math.random()-0.5)*ARENA_RADIUS, vx, vy, vz, life: 3.0, maxLife: 3.0 });
          }
        }

        b.attackerParticles = b.attackerParticles.filter(p => {
          p.x += p.vx * 1000 * delta * speedMul;
          p.y += p.vy * 1000 * delta * speedMul;
          p.z += p.vz * 1000 * delta * speedMul;
          p.life -= delta * 0.2 * speedMul;
          const dx = p.x - px, dy = p.y - py, dz = p.z - pz;
          if ((dx*dx + dy*dy + dz*dz) < 1.2) {
            b.defenders.count = Math.max(0, b.defenders.count - 1);
            const sparkChance = 0.002 + 0.008 * progress;
            if (Math.random() < sparkChance) {
            b.sparks.push({ x: p.x, y: p.y, z: p.z, vx: (Math.random()-0.5)*0.04, vy: (Math.random()-0.5)*0.04, vz: (Math.random()-0.5)*0.04, life: 0.6, maxLife: 0.6 });
            }
            return false;
          }
          return p.life > 0;
        });

        b.defenderParticles = b.defenderParticles.filter(p => {
          p.x += p.vx * 1000 * delta * speedMul;
          p.y += p.vy * 1000 * delta * speedMul;
          p.z += p.vz * 1000 * delta * speedMul;
          p.life -= delta * 0.2 * speedMul;
          const dx = p.x - px, dy = p.y - py, dz = p.z - pz;
          if ((dx*dx + dy*dy + dz*dz) > (ARENA_RADIUS * 1.1)**2) {
            p.vx *= -1; p.vy *= -1; p.vz *= -1;
          }
          const sparkChance = 0.002 + 0.008 * progress;
          if (Math.random() < sparkChance) {
            b.sparks.push({ x: p.x, y: p.y, z: p.z, vx: (Math.random()-0.5)*0.04, vy: (Math.random()-0.5)*0.04, vz: (Math.random()-0.5)*0.04, life: 0.6, maxLife: 0.6 });
          }
          return p.life > 0;
        });

        b.sparks = b.sparks.filter(s => {
          s.x += s.vx * 1000 * delta * speedMul;
          s.y += s.vy * 1000 * delta * speedMul;
          s.z += s.vz * 1000 * delta * speedMul;
          s.life -= delta * 0.7 * speedMul;
          return s.life > 0;
        });

        if (now - b.lastUpdated > 500) {
          const attackerLoss = Math.floor((b.defenders.count / 50) * Math.random() * 5);
          const defenderLoss = Math.floor((b.attackers.count / 60) * Math.random() * 8);
          b.attackers.count = Math.max(0, b.attackers.count - attackerLoss);
          b.defenders.count = Math.max(0, b.defenders.count - defenderLoss);
          b.lastUpdated = now;

          b.attackerParticles.length = Math.floor((b.attackers.count / 10) * spawnScale);
          b.defenderParticles.length = Math.floor((b.defenders.count / 10) * spawnScale);

          if (b.defenders.count <= 0 || (b.attackers.count <= 0 && b.attackerParticles.length === 0)) {
            const outcome = b.defenders.count <= 0 ? 'attack' : 'defend';
            setActionEffect({ id: `battle-${b.id}`, type: outcome, position: [px, py, pz], start: performance.now() });
          } else {
            updated.push(b);
          }
        } else {
          updated.push(b);
        }
      }
      battlesRef.current = updated;

      if (attackerMeshRef.current) {
        const inst = attackerMeshRef.current;
        let idx = 0;
        for (const b of battlesRef.current) {
          if (b && Array.isArray(b.attackerParticles)) {
          for (const p of b.attackerParticles) {
              if (p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number') {
            dummy.position.set(p.x, p.y, p.z);
            dummy.scale.set(0.05, 0.05, 0.05);
            dummy.updateMatrix();
            inst.setMatrixAt(idx++, dummy.matrix);
              }
            }
          }
        }
        inst.count = idx;
        inst.instanceMatrix.needsUpdate = true;
      }
      if (defenderMeshRef.current) {
        const inst = defenderMeshRef.current;
        let idx = 0;
        for (const b of battlesRef.current) {
          if (b && Array.isArray(b.defenderParticles)) {
          for (const p of b.defenderParticles) {
              if (p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number') {
            dummy.position.set(p.x, p.y, p.z);
            dummy.scale.set(0.05, 0.05, 0.05);
            dummy.updateMatrix();
            inst.setMatrixAt(idx++, dummy.matrix);
              }
            }
          }
        }
        inst.count = idx;
        inst.instanceMatrix.needsUpdate = true;
      }
      if (sparkRef.current) {
        const inst = sparkRef.current;
        let idx = 0;
        for (const b of battlesRef.current) {
          if (b && Array.isArray(b.sparks)) {
          for (const p of b.sparks) {
              if (p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number' && 
                  typeof p.life === 'number' && typeof p.maxLife === 'number') {
            dummy.position.set(p.x, p.y, p.z);
            const s = 0.04 + (p.life / p.maxLife) * 0.06;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            inst.setMatrixAt(idx++, dummy.matrix);
              }
            }
          }
        }
        inst.count = idx;
        inst.instanceMatrix.needsUpdate = true;
      }
    });
    return (
      <group>
        <instancedMesh ref={attackerMeshRef} args={[undefined as any, undefined as any, 400]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#66ff66" transparent opacity={0.95} blending={THREE.AdditiveBlending} />
        </instancedMesh>
        <instancedMesh ref={defenderMeshRef} args={[undefined as any, undefined as any, 400]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#ff6666" transparent opacity={0.95} blending={THREE.AdditiveBlending} />
        </instancedMesh>
        <instancedMesh ref={sparkRef} args={[undefined as any, undefined as any, 400]}>
          <sphereGeometry args={[0.6, 8, 8]} />
          <meshBasicMaterial color="#ffee88" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
        </instancedMesh>
        <points ref={arenaRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={150 * 5}
              array={new Float32Array(150 * 5 * 3)}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial color="#ff8844" size={0.05} transparent opacity={0.35} blending={THREE.AdditiveBlending} />
        </points>
        {battlesRef.current.map(b => (
          <Html key={`counter-${b.id}`} position={[b.to[0], b.to[1] + 1.1, b.to[2]]} center style={{ pointerEvents:'none' }}>
            <div style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:4,padding:'2px 6px',fontSize:12,color:'#cfe9ff'}}>
              Attackers: {b.attackers.count} • Defenders: {b.defenders.count}
            </div>
          </Html>
        ))}
      </group>
    );
  };

  if (renderMode === 'simple') {
    return <SimpleRenderer territories={allPlanets} onRefreshWorld={handleRefreshWorld} />;
  }

  if (!world || !world.galaxies || world.galaxies.length === 0) {
    return <div style={{ color: 'white', textAlign: 'center', paddingTop: '20vh' }}>Loading world data...</div>;
  }
  
  return (
    <>
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 10000, display: 'flex', gap: '10px' }}>
        <button onClick={() => setRenderMode(rm => rm === '3d' ? 'simple' : '3d')}>Switch to {renderMode === '3d' ? 'Simple' : '3D'} View</button>
        <button onClick={() => setCanvasKey(k => k + 1)}>Reset Canvas</button>
            <button 
          onClick={() => setShowMissions(prev => !prev)}
              style={{
            background: showMissions ? '#44aaff' : '#333',
                color: 'white',
                border: 'none',
            padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
          Missions & Achievements
            </button>
          </div>
      
      {showMissions && <MissionsPanel onClose={() => setShowMissions(false)} />}
      
      {/* Game controls */}
      <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.7)', padding: '15px', borderRadius: '8px' }}>
        <div style={{ color: 'white', marginBottom: '10px', fontWeight: 'bold' }}>Game Controls</div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setInteractionMode('none')}
            style={{ 
              background: interactionMode === 'none' ? '#44aaff' : '#333', 
              color: 'white', 
              border: 'none', 
              padding: '8px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer'
            }}
          >
            Select
          </button>
          <button 
            onClick={() => setInteractionMode('harvest')}
            style={{ 
              background: interactionMode === 'harvest' ? '#44aaff' : '#333', 
              color: 'white', 
              border: 'none', 
              padding: '8px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer'
            }}
          >
            Harvest
          </button>
          <button 
            onClick={() => setInteractionMode('research')}
            style={{ 
              background: interactionMode === 'research' ? '#44aaff' : '#333', 
              color: 'white', 
              border: 'none', 
              padding: '8px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer'
            }}
          >
            Research
          </button>
          <button 
            onClick={() => setInteractionMode('attack')}
            style={{ 
              background: interactionMode === 'attack' ? '#44aaff' : '#333', 
              color: 'white', 
              border: 'none', 
              padding: '8px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer'
            }}
          >
            Attack
          </button>
          <button 
            onClick={() => setInteractionMode('move')}
            style={{ 
              background: interactionMode === 'move' ? '#44aaff' : '#333', 
              color: 'white', 
              border: 'none', 
              padding: '8px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer'
            }}
          >
            Move
          </button>
        </div>
      
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ color: 'white' }}>Units:</label>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={unitAmount} 
            onChange={(e) => setUnitAmount(parseInt(e.target.value))} 
            style={{ width: '100px' }}
          />
          <span style={{ color: 'white', minWidth: '30px' }}>{unitAmount}</span>
            </div>
        
        {selectedPlanet && (
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
            <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '5px' }}>
              {selectedPlanet.name || selectedPlanet.id} {isFriendlyOwner(selectedPlanet.controlledBy) ? '(Controlled)' : ''}
                </div>
            <div style={{ color: '#aaa', fontSize: '0.9em' }}>
              Defense: {selectedPlanet.defense || 0}
            </div>
            <div style={{ color: '#aaa', fontSize: '0.9em' }}>
              Resources: {selectedPlanet.resources?.map((r: any) => `${r.type}: ${r.amount}`).join(', ')}
          </div>

            {/* Contextual actions for Harvest/Research when a friendly planet is selected */}
            {/* Action buttons for the selected planet */}
            {selectedPlanet && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {/* Harvest/Research buttons for friendly planets */}
                {isFriendlyOwner(selectedPlanet.controlledBy) && interactionMode === 'harvest' && (
                  <button 
                    onClick={() => {
                      harvestPlanet(selectedPlanet.id);
                      const pos = getWorldPositionForPlanet(selectedPlanet);
                      setActionEffect({ id: selectedPlanet.id, type: 'harvest', position: pos as [number, number, number], start: performance.now() });
                      showNotification(`Harvesting resources from ${selectedPlanet.name || selectedPlanet.id}`, 'success');
                    }}
                    style={{ 
                      background: '#44aa66', 
                      color: 'white', 
                      border: 'none', 
                      padding: '8px 12px', 
                      borderRadius: 4, 
                      cursor: 'pointer'
                    }}
                  >
                    Harvest Resources
                  </button>
                )}
                {isFriendlyOwner(selectedPlanet.controlledBy) && interactionMode === 'research' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => {
                        const pos = getWorldPositionForPlanet(selectedPlanet);
                        window.dispatchEvent(new CustomEvent('seedlings-gather', { 
                          detail: { planetId: selectedPlanet.id, durationMs: 700 } 
                        }));
                        deployResearch('attack', 25);
                        showNotification(`Conducting attack research at ${selectedPlanet.name || selectedPlanet.id}`, 'success');
                        setActionEffect({ id: selectedPlanet.id, type: 'research', position: pos as [number, number, number], start: performance.now() });
                        setInteractionMode('none');
                      }}
                      style={{ 
                        flex: 1,
                        background: '#8866ff', 
                        color: 'white', 
                        border: 'none', 
                        padding: '8px 12px', 
                        borderRadius: 4, 
                        cursor: 'pointer'
                      }}
                    >
                      Research (+Attack)
                    </button>
                    <button 
                      onClick={() => {
                        const pos = getWorldPositionForPlanet(selectedPlanet);
                        window.dispatchEvent(new CustomEvent('seedlings-gather', { 
                          detail: { planetId: selectedPlanet.id, durationMs: 700 } 
                        }));
                        deployResearch('defense', 25);
                        showNotification(`Conducting defense research at ${selectedPlanet.name || selectedPlanet.id}`, 'success');
                        setActionEffect({ id: selectedPlanet.id, type: 'research', position: pos as [number, number, number], start: performance.now() });
                        setInteractionMode('none');
                      }}
                      style={{ 
                        flex: 1,
                        background: '#8866ff', 
                        color: 'white', 
                        border: 'none', 
                        padding: '8px 12px', 
                        borderRadius: 4, 
                        cursor: 'pointer'
                      }}
                    >
                      Research (+Defense)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick action row for ATTACK/MOVE so users always see the button */}
            {interactionMode === 'attack' && !isFriendlyOwner(selectedPlanet.controlledBy) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span style={{ color: '#ffcc44' }}>Source:</span>
                <span style={{ color: 'white' }}>{(selectedSourcePlanets[0] || computedSourceForAttack)?.name || (selectedSourcePlanets[0] || computedSourceForAttack)?.id || 'Select a friendly planet'}</span>
            <button 
              onClick={() => {
                    const src = selectedSourcePlanets[0] || computedSourceForAttack;
                    if (!src) { showNotification('Select a friendly source planet first', 'error'); return; }
                    // Ensure server knows exact source/target and create a flight arc from source
                    attackPlanet(src.id, selectedPlanet.id, unitAmount);
                    const fromPos = getWorldPositionForPlanet(src);
                    const toPos = getWorldPositionForPlanet(selectedPlanet);
                    // Pre-launch gather pulse
          window.dispatchEvent(new CustomEvent('seedlings-gather', { 
            detail: { planetId: src.id, durationMs: 700 } 
          }));
          
          const flight: Flight = {
            id: `attack-${Date.now()}`,
            start: performance.now(),
            durationMs: 4000, // Longer duration for more dramatic effect
            from: fromPos as [number, number, number],
            to: toPos as [number, number, number],
            count: Math.max(140, unitAmount * 2), // More particles for better visuals
            owner: 'player'
          };
                    setFlights(prev => [...prev, flight]);
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('seedlings-drain', { detail: { planetId: src.id, count: unitAmount } } as any));
                    }
                    setSelectedSourcePlanets([]);
                    setInteractionMode('none');
                  }}
                  style={{ background: '#ff4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
                >
                  Attack with {unitAmount}
            </button>
            </div>
          )}

            {interactionMode === 'move' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span style={{ color: '#9dd1ff' }}>Source:</span>
                <span style={{ color: 'white' }}>{(selectedSourcePlanets[0] || computedSourceForAttack)?.name || (selectedSourcePlanets[0] || computedSourceForAttack)?.id || 'Select a friendly planet'}</span>
              <button 
                onClick={() => {
                    const src = selectedSourcePlanets[0] || computedSourceForAttack;
                    if (!src || !isFriendlyOwner(src.controlledBy)) { showNotification('Select a friendly source planet first', 'error'); return; }
                    moveUnits(src.id, selectedPlanet.id, unitAmount);
                    const fromPos = getWorldPositionForPlanet(src);
                    const toPos = getWorldPositionForPlanet(selectedPlanet);
                    const flight: Flight = {
                      id: `move-${Date.now()}`,
                      start: performance.now(),
                      durationMs: 2000,
                      from: fromPos as [number, number, number],
                      to: toPos as [number, number, number],
                      count: unitAmount,
                      owner: 'player'
                    };
                    setFlights(prev => [...prev, flight]);
                    setSelectedSourcePlanets([]);
                    setInteractionMode('none');
                  }}
                  style={{ background: '#44aaff', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
                >
                  Move {unitAmount}
              </button>
              </div>
            )}
            </div>
          )}
        
        {selectedSourcePlanets.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '4px', marginTop: '5px' }}>
            <div style={{ color: '#ffcc44', fontWeight: 'bold', marginBottom: '5px' }}>
              Sources: {selectedSourcePlanets.map(p => p.name || p.id).join(', ')}
              </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button 
                onClick={() => setSelectedSourcePlanets([])}
                style={{ background: '#aa3333', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
              >
                Cancel
            </button>
              
              {selectedPlanet && interactionMode === 'attack' && !isFriendlyOwner(selectedPlanet.controlledBy) && (
                <button 
                  onClick={() => {
                    const sources = selectedSourcePlanets.length > 0 ? selectedSourcePlanets : (computedSourceForAttack ? [computedSourceForAttack] : []);
                    if (sources.length === 0) {
                      showNotification('Select a friendly source planet first', 'error');
                return;
              }
                    // Split the unit amount across selected sources
                    const perSource = Math.max(5, Math.floor(unitAmount / sources.length));
                    sources.forEach((src: any, idx: number) => {
                      // Pre-launch gather pulse
                if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('seedlings-gather', { detail: { planetId: src.id, durationMs: 700 } } as any));
                      }
                      attackPlanet(src.id, selectedPlanet.id, perSource);
                      const fromPos = getWorldPositionForPlanet(src);
                      const toPos = getWorldPositionForPlanet(selectedPlanet);
                      const flight: Flight = {
                        id: `attack-${src.id}->${selectedPlanet.id}-${Date.now()}-${idx}`,
                        start: performance.now(),
                        durationMs: 4000,
                        from: fromPos as [number, number, number],
                        to: toPos as [number, number, number],
                        count: Math.max(120, perSource),
                        owner: 'player'
                      };
                      setFlights(prev => [...prev, flight]);
                      // Notify territories to drain orbiters
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('seedlings-drain', { detail: { planetId: src.id, count: perSource } } as any));
                      }
                    });

                    setSelectedSourcePlanets([]);
                    setInteractionMode('none');
                  }}
                  style={{ background: '#ff4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
                >
                  Attack with {unitAmount} units
                </button>
              )}
              
              {selectedPlanet && interactionMode === 'move' && (
                <button 
                  onClick={() => {
                    const sources = selectedSourcePlanets.length > 0 ? selectedSourcePlanets : (computedSourceForAttack ? [computedSourceForAttack] : []);
                    if (sources.length === 0) {
                      showNotification('Select a friendly source planet first', 'error');
                      return;
                    }
                    const perSource = Math.max(5, Math.floor(unitAmount / sources.length));
                    sources.forEach((src: any, idx: number) => {
                      moveUnits(src.id, selectedPlanet.id, perSource);
                      const fromPos = getWorldPositionForPlanet(src);
                      const toPos = getWorldPositionForPlanet(selectedPlanet);
                      const flight: Flight = {
                        id: `move-${src.id}->${selectedPlanet.id}-${Date.now()}-${idx}`,
                        start: performance.now(),
                        durationMs: 4000,
                        from: fromPos as [number, number, number],
                        to: toPos as [number, number, number],
                        count: perSource,
                        owner: 'player'
                      };
                      setFlights(prev => [...prev, flight]);
                    });

                    setSelectedSourcePlanets([]);
                    setInteractionMode('none');
                  }}
                  style={{ background: '#44aaff', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
                >
                  Move {unitAmount} units
                </button>
          )}
          </div>
        </div>
        )}
        </div>
      <Canvas 
        key={canvasKey} 
        camera={{ position: [0, 20, 35], fov: 60 }} 
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000');
          // Set lower pixel ratio for better performance
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
          // Ensure correct color space on modern three
          try {
            (gl as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? (gl as any).outputColorSpace;
          } catch {}
        }}
        style={{ position: 'fixed', inset: 0 }}
      >
        <Suspense fallback={<Html><div style={{color: 'white'}}>Loading 3D Assets...</div></Html>}>
          <ambientLight intensity={0.1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
          <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.1} />
          <FocusController target={focusTarget} active={focusActive} />
          <Environment preset="night" />
          
          {world.galaxies.map((galaxy: any) => galaxy.systems.map((system: any) => (
            <group key={system.id} position={[system.position.x, system.position.y, system.position.z]}>
              <pointLight ref={sunRef} color={system.sun.color} intensity={system.sun.intensity * 2} distance={200} />
              <mesh>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial emissive={system.sun.color} emissiveIntensity={2} />
              </mesh>
              {system.planets.map((planet: any) => (
              <Territory
                  key={planet.id}
                  id={planet.id}
                  position={[planet.position.x, planet.position.y, planet.position.z]}
                  scale={1}
                  resources={planet.resources}
                  controlled={isFriendlyOwner(planet.controlledBy)}
                  defense={planet.defense}
                  onClick={() => handlePlanetClick(planet)}
            />
          ))}
                        </group>
          )))}
          
          <UnitFlights flights={flights} onDone={(id) => setFlights(f => f.filter(flight => flight.id !== id))} speed={speed} playerId={playerId} />
          <LocalBattles />
          <EffectsLayer actionEffect={actionEffect} effectRef={effectRef} setActionEffect={setActionEffect} speed={speed} />
          <PostProcessingWrapper sunRef={sunRef} />
        </Suspense>
      </Canvas>
    </>
  );
};

export default GameWorld;
