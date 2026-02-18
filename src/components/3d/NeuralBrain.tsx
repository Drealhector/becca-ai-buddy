import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Fibonacci sphere: evenly distributed nodes on a perfect sphere ──
function fibonacciSphere(count: number, radius: number) {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts.push(new THREE.Vector3(
      Math.cos(theta) * r * radius,
      y * radius,
      Math.sin(theta) * r * radius,
    ));
  }
  return pts;
}

// ── Build adjacency list: connect each node to its N nearest neighbours ──
function buildEdges(nodes: THREE.Vector3[], maxNeighbours = 4, maxDist = 1.6) {
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const dists: { j: number; d: number }[] = [];
    for (let j = i + 1; j < nodes.length; j++) {
      const d = nodes[i].distanceTo(nodes[j]);
      if (d < maxDist) dists.push({ j, d });
    }
    dists.sort((a, b) => a.d - b.d);
    dists.slice(0, maxNeighbours).forEach(({ j }) => edges.push([i, j]));
  }
  return edges;
}

// ── Static connection lines ──────────────────────────────────────────
function ConnectionLines({ nodes, edges }: { nodes: THREE.Vector3[]; edges: [number, number][] }) {
  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    edges.forEach(([i, j]) => { pts.push(nodes[i], nodes[j]); });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [nodes, edges]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={new THREE.Color(0.15, 0.4, 0.9)}
        transparent
        opacity={0.22}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ── Node dots ────────────────────────────────────────────────────────
const nodeVertexShader = `
  attribute float phase;
  uniform float uTime;
  varying float vPulse;
  void main() {
    vPulse = 0.5 + 0.5 * sin(uTime * 2.0 + phase);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (3.5 + vPulse * 3.5) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const nodeFragmentShader = `
  varying float vPulse;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = 1.0 - d * 2.0;
    a = pow(a, 1.8);
    vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(0.8, 0.4, 1.0), vPulse);
    col = mix(col, vec3(1.0), pow(vPulse, 3.0) * 0.6);
    gl_FragColor = vec4(col, a * (0.7 + vPulse * 0.3));
  }
`;

function NodeDots({ nodes }: { nodes: THREE.Vector3[] }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { positions, phases } = useMemo(() => {
    const positions = new Float32Array(nodes.length * 3);
    const phases = new Float32Array(nodes.length);
    nodes.forEach((n, i) => {
      positions[i * 3] = n.x; positions[i * 3 + 1] = n.y; positions[i * 3 + 2] = n.z;
      phases[i] = Math.random() * Math.PI * 2;
    });
    return { positions, phases };
  }, [nodes]);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={nodes.length} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-phase" count={nodes.length} array={phases} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={nodeVertexShader}
        fragmentShader={nodeFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Signal pulse travelling along one edge ───────────────────────────
function SignalPulse({ a, b, speed, color }: {
  a: THREE.Vector3; b: THREE.Vector3; speed: number; color: THREE.Color;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = useMemo(() => Math.random(), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * speed * 0.18 + offset) % 1);
    ref.current.position.lerpVectors(a, b, t);
    const pulse = Math.sin(t * Math.PI);
    ref.current.scale.setScalar(0.4 + pulse * 0.8);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + pulse * 0.5;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.045, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function SignalPulses({ nodes, edges }: { nodes: THREE.Vector3[]; edges: [number, number][] }) {
  const signals = useMemo(() => {
    const colors = [
      new THREE.Color(0.3, 0.7, 1.0),
      new THREE.Color(0.6, 0.3, 1.0),
      new THREE.Color(0.2, 1.0, 0.9),
      new THREE.Color(1.0, 0.4, 0.8),
    ];
    // Pick a subset of edges for signals
    const picked = [...edges].sort(() => Math.random() - 0.5).slice(0, 60);
    return picked.map(([i, j]) => ({
      a: nodes[i], b: nodes[j],
      speed: 0.5 + Math.random() * 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, [nodes, edges]);

  return (
    <>
      {signals.map((s, i) => <SignalPulse key={i} {...s} />)}
    </>
  );
}

// ── Inner volumetric cloud (nebula moving inside sphere) ─────────────
const cloudVertexShader = `
  attribute float size;
  attribute float phase;
  uniform float uTime;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    // Swirling drift
    float angle = uTime * 0.12 + phase;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec3 pos = position;
    pos.xz = rot * pos.xz;
    pos.xy = rot * 0.4 * pos.xy + pos.xy * 0.6;

    float breath = 0.92 + 0.08 * sin(uTime * 0.5 + phase * 3.14);
    pos *= breath;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float pulse = 0.5 + 0.5 * sin(uTime * 1.2 + phase * 2.0);
    vAlpha = pulse * 0.18;

    // Deep blue → cyan → purple colour per particle
    float c = fract(phase / 6.28318);
    vColor = mix(vec3(0.05, 0.15, 0.6), vec3(0.4, 0.1, 0.8), c);
    vColor = mix(vColor, vec3(0.0, 0.6, 1.0), pulse * 0.4);

    gl_PointSize = size * (350.0 / -mv.z) * (0.6 + pulse * 0.6);
    gl_Position = projectionMatrix * mv;
  }
`;
const cloudFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = 1.0 - d * 2.0;
    a = pow(a, 0.7); // soft edges
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

function InnerCloud() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, sizes, phases } = useMemo(() => {
    const count = 3000;
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Random points inside unit sphere (rejection sampling-ish)
      let x, y, z, r2;
      do {
        x = (Math.random() - 0.5) * 2;
        y = (Math.random() - 0.5) * 2;
        z = (Math.random() - 0.5) * 2;
        r2 = x * x + y * y + z * z;
      } while (r2 > 1.0);
      const scale = 1.8; // radius
      pos[i * 3] = x * scale;
      pos[i * 3 + 1] = y * scale;
      pos[i * 3 + 2] = z * scale;
      sizes[i] = 0.08 + Math.random() * 0.25;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, sizes, phases };
  }, []);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-phase" count={phases.length} array={phases} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Outer glow shell ─────────────────────────────────────────────────
function OuterGlow() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.04 + 0.02 * Math.sin(clock.elapsedTime * 0.7);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[2.55, 48, 48]} />
      <meshBasicMaterial
        color={new THREE.Color(0.15, 0.35, 1.0)}
        transparent opacity={0.05}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Equator ring ─────────────────────────────────────────────────────
function EquatorRing() {
  const geo = useMemo(() => new THREE.TorusGeometry(2.22, 0.008, 6, 120), []);
  return (
    <mesh geometry={geo} rotation={[Math.PI / 2, 0, 0]}>
      <meshBasicMaterial
        color={new THREE.Color(0.3, 0.6, 1.0)}
        transparent opacity={0.15}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Root ─────────────────────────────────────────────────────────────
export default function NeuralBrain() {
  const groupRef = useRef<THREE.Group>(null);

  const nodes = useMemo(() => fibonacciSphere(180, 2.2), []);
  const edges = useMemo(() => buildEdges(nodes, 4, 1.65), [nodes]);

  // Slow gentle auto-sway (no auto-rotate — user drags)
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.06;
    groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.18) * 0.06;
  });

  return (
    <group ref={groupRef}>
      <InnerCloud />
      <ConnectionLines nodes={nodes} edges={edges} />
      <NodeDots nodes={nodes} />
      <SignalPulses nodes={nodes} edges={edges} />
      <OuterGlow />
      <EquatorRing />
    </group>
  );
}
