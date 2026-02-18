import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Generate brain-shaped point cloud
function generateBrainPoints(count: number) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const impulsePhases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Create brain-like shape using parametric equations
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    // Brain dimensions - wider than tall, with hemispheres
    const baseRadius = 2.2;
    const widthScale = 1.3;
    const heightScale = 0.95;
    const depthScale = 1.15;
    
    // Add cortical folds (wrinkles)
    const foldFreq1 = 6 + Math.random() * 4;
    const foldFreq2 = 8 + Math.random() * 3;
    const foldAmp = 0.08 + Math.random() * 0.12;
    const folds = Math.sin(theta * foldFreq1) * Math.cos(phi * foldFreq2) * foldAmp;
    
    const r = baseRadius * (0.7 + Math.random() * 0.3) + folds;
    
    let x = r * Math.sin(phi) * Math.cos(theta) * widthScale;
    let y = r * Math.cos(phi) * heightScale;
    let z = r * Math.sin(phi) * Math.sin(theta) * depthScale;
    
    // Flatten the bottom slightly (brain stem area)
    if (y < -1.2) {
      y = -1.2 + (y + 1.2) * 0.3;
      // Narrow it for brain stem
      x *= 0.4;
      z *= 0.5;
    }
    
    // Create the central fissure (gap between hemispheres)
    if (Math.abs(x) < 0.08 && y > 0) {
      y -= 0.15;
    }
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    
    // Vary point sizes
    sizes[i] = 0.02 + Math.random() * 0.06;
    
    // Random phase for impulse animation
    impulsePhases[i] = Math.random() * Math.PI * 2;
  }

  return { positions, sizes, impulsePhases };
}

// Generate neural pathways (lines connecting points)
function generateNeuralPathways(count: number) {
  const paths: { points: THREE.Vector3[]; speed: number; color: THREE.Color }[] = [];
  
  const colors = [
    new THREE.Color(0.3, 0.6, 1.0),   // Blue
    new THREE.Color(0.6, 0.3, 1.0),   // Purple
    new THREE.Color(0.2, 0.9, 1.0),   // Cyan
    new THREE.Color(1.0, 0.5, 0.8),   // Pink
    new THREE.Color(0.4, 1.0, 0.6),   // Green
    new THREE.Color(1.0, 0.8, 0.2),   // Gold
  ];

  for (let i = 0; i < count; i++) {
    const numPoints = 8 + Math.floor(Math.random() * 12);
    const points: THREE.Vector3[] = [];
    
    // Start from a random brain surface point
    const startTheta = Math.random() * Math.PI * 2;
    const startPhi = Math.random() * Math.PI;
    const startR = 1.8 + Math.random() * 0.4;
    
    let cx = startR * Math.sin(startPhi) * Math.cos(startTheta) * 1.3;
    let cy = startR * Math.cos(startPhi) * 0.95;
    let cz = startR * Math.sin(startPhi) * Math.sin(startTheta) * 1.15;
    
    for (let j = 0; j < numPoints; j++) {
      points.push(new THREE.Vector3(cx, cy, cz));
      cx += (Math.random() - 0.5) * 0.8;
      cy += (Math.random() - 0.5) * 0.6;
      cz += (Math.random() - 0.5) * 0.7;
      
      // Keep within brain bounds
      const dist = Math.sqrt(cx * cx / 1.69 + cy * cy / 0.9 + cz * cz / 1.32);
      if (dist > 2.2) {
        cx *= 0.85;
        cy *= 0.85;
        cz *= 0.85;
      }
    }
    
    paths.push({
      points,
      speed: 0.3 + Math.random() * 1.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  
  return paths;
}

// Vertex shader for brain particles
const brainVertexShader = `
  attribute float size;
  attribute float impulsePhase;
  uniform float uTime;
  varying float vImpulse;
  varying float vDepth;
  
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Calculate impulse brightness - waves moving through the brain
    float wave1 = sin(position.x * 2.0 + position.y * 1.5 + uTime * 1.8 + impulsePhase) * 0.5 + 0.5;
    float wave2 = sin(position.z * 3.0 - position.y * 2.0 + uTime * 2.5 + impulsePhase * 1.3) * 0.5 + 0.5;
    float wave3 = sin(length(position.xy) * 4.0 - uTime * 3.0 + impulsePhase * 0.7) * 0.5 + 0.5;
    
    // Sporadic bright flashes
    float flash = pow(sin(uTime * 4.0 + impulsePhase * 6.28) * 0.5 + 0.5, 8.0);
    
    vImpulse = wave1 * wave2 * 0.6 + wave3 * 0.3 + flash * 0.4;
    vDepth = -mvPosition.z;
    
    gl_PointSize = size * (280.0 / -mvPosition.z) * (0.6 + vImpulse * 0.8);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const brainFragmentShader = `
  varying float vImpulse;
  varying float vDepth;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = 1.0 - dist * 2.0;
    alpha = pow(alpha, 1.5);
    
    // Color based on impulse intensity
    vec3 baseColor = vec3(0.15, 0.25, 0.55);
    vec3 impulseColor1 = vec3(0.3, 0.6, 1.0);
    vec3 impulseColor2 = vec3(0.7, 0.3, 1.0);
    vec3 hotColor = vec3(1.0, 0.9, 0.95);
    
    vec3 color = mix(baseColor, impulseColor1, vImpulse);
    color = mix(color, impulseColor2, vImpulse * vImpulse);
    color = mix(color, hotColor, pow(vImpulse, 4.0));
    
    alpha *= 0.4 + vImpulse * 0.6;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

function BrainParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, sizes, impulsePhases } = useMemo(() => generateBrainPoints(18000), []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.08;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-impulsePhase"
          count={impulsePhases.length}
          array={impulsePhases}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={brainVertexShader}
        fragmentShader={brainFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Animated impulse traveling along a neural pathway
function NeuralImpulse({ path, speed, color }: { path: THREE.Vector3[]; speed: number; color: THREE.Color }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Line>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(path), [path]);
  
  const trailLine = useMemo(() => {
    const points = curve.getPoints(60);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(geometry, material);
    return line;
  }, [curve, color]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = (clock.elapsedTime * speed * 0.15) % 1;
      const pos = curve.getPoint(t);
      meshRef.current.position.copy(pos);
    }
    if (trailLine.material instanceof THREE.LineBasicMaterial) {
      trailLine.material.opacity = 0.08 + Math.sin(clock.elapsedTime * speed) * 0.05;
    }
  });

  return (
    <group>
      <primitive object={trailLine} ref={trailRef} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function NeuralPathways() {
  const groupRef = useRef<THREE.Group>(null);
  const paths = useMemo(() => generateNeuralPathways(40), []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {paths.map((p, i) => (
        <NeuralImpulse key={i} path={p.points} speed={p.speed} color={p.color} />
      ))}
    </group>
  );
}

// Outer glow shell
function BrainGlow() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.elapsedTime * 0.08;
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.03 + Math.sin(clock.elapsedTime * 0.5) * 0.015;
    }
  });

  return (
    <mesh ref={meshRef} scale={[1.35, 1.0, 1.2]}>
      <sphereGeometry args={[2.5, 32, 32]} />
      <meshBasicMaterial 
        color={new THREE.Color(0.2, 0.4, 1.0)} 
        transparent 
        opacity={0.04} 
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function NeuralBrain() {
  return (
    <group>
      <BrainParticles />
      <NeuralPathways />
      <BrainGlow />
      {/* Ambient particles around brain */}
      <AmbientParticles />
    </group>
  );
}

function AmbientParticles() {
  const ref = useRef<THREE.Points>(null);
  
  const { positions, sizes } = useMemo(() => {
    const count = 500;
    const pos = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      s[i] = Math.random() * 0.03;
    }
    return { positions: pos, sizes: s };
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={new THREE.Color(0.3, 0.5, 1.0)} size={0.03} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}
