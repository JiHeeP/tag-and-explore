import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useRef, useCallback, useState, useEffect } from "react";
import * as THREE from "three";
import type { Hotspot } from "@/pages/EditorPage";

interface Props {
  url: string;
  hotspots: Hotspot[];
  isEditing: boolean;
  onClickCanvas: (x: number, y: number, worldX?: number, worldY?: number, worldZ?: number) => void;
  onHotspotClick: (h: Hotspot) => void;
  onResolveWorldPosition?: (id: string, wx: number, wy: number, wz: number) => void;
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function ClickHandler({ onClickCanvas, isEditing, url }: { onClickCanvas: Props["onClickCanvas"]; isEditing: boolean; url: string }) {
  const { camera, scene, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isEditing) return;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const screenPos = point.clone().project(camera);
        const x = ((screenPos.x + 1) / 2) * 100;
        const y = ((1 - screenPos.y) / 2) * 100;
        onClickCanvas(x, y, point.x, point.y, point.z);
      }
    },
    [isEditing, camera, scene, gl, onClickCanvas]
  );

  useEffect(() => {
    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [handleClick, gl]);

  return null;
}

function HotspotProjector({ hotspot, onClick }: { hotspot: Hotspot; onClick: () => void }) {
  const { camera, size } = useThree();
  const [pos, setPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  useFrame(() => {
    if (hotspot.worldX == null || hotspot.worldY == null || hotspot.worldZ == null) return;
    const vec = new THREE.Vector3(hotspot.worldX, hotspot.worldY, hotspot.worldZ);
    vec.project(camera);
    const x = ((vec.x + 1) / 2) * size.width;
    const y = ((1 - vec.y) / 2) * size.height;
    const visible = vec.z < 1;
    setPos({ x, y, visible });
  });

  if (!pos.visible) return null;

  return (
    <group>
      <mesh position={[0, 0, 0]} visible={false}>
        <boxGeometry args={[0, 0, 0]} />
      </mesh>
      {/* Rendered via HTML overlay */}
      <HotspotDot x={pos.x} y={pos.y} onClick={onClick} />
    </group>
  );
}

function HotspotDot(_: { x: number; y: number; onClick: () => void }) {
  return null; // We handle overlay in the parent
}

export default function ModelViewer({ url, hotspots, isEditing, onClickCanvas, onHotspotClick, onResolveWorldPosition }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [projected, setProjected] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Model url={url} />
        <OrbitControls />
        <ClickHandler onClickCanvas={onClickCanvas} isEditing={isEditing} url={url} />
        <ProjectionUpdater hotspots={hotspots} onUpdate={setProjected} />
      </Canvas>

      {/* Overlay hotspots */}
      <div className={`absolute inset-0 ${isEditing ? "cursor-crosshair" : ""}`} style={{ pointerEvents: isEditing ? "none" : "none" }}>
        {hotspots.map((h) => {
          const p = projected[h.id];
          if (!p?.visible) return null;
          return (
            <button
              key={h.id}
              className="absolute w-6 h-6 bg-primary rounded-full border-2 border-primary-foreground transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition z-10"
              style={{ left: p.x, top: p.y, pointerEvents: "auto" }}
              onClick={() => onHotspotClick(h)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ProjectionUpdater({ hotspots, onUpdate }: { hotspots: Hotspot[]; onUpdate: (p: Record<string, { x: number; y: number; visible: boolean }>) => void }) {
  const { camera, size } = useThree();

  useFrame(() => {
    const result: Record<string, { x: number; y: number; visible: boolean }> = {};
    for (const h of hotspots) {
      if (h.worldX == null || h.worldY == null || h.worldZ == null) continue;
      const vec = new THREE.Vector3(h.worldX, h.worldY, h.worldZ);
      vec.project(camera);
      result[h.id] = {
        x: ((vec.x + 1) / 2) * size.width,
        y: ((1 - vec.y) / 2) * size.height,
        visible: vec.z < 1,
      };
    }
    onUpdate(result);
  });

  return null;
}
