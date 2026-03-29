import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useCallback, useState, useEffect, useMemo } from "react";
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

function PanoramaSphere({ url }: { url: string }) {
  const texture = useMemo(() => new THREE.TextureLoader().load(url), [url]);
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

function PanoramaClickHandler({ onClickCanvas, isEditing }: { onClickCanvas: Props["onClickCanvas"]; isEditing: boolean }) {
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

export default function PanoramaViewer({ url, hotspots, isEditing, onClickCanvas, onHotspotClick, onResolveWorldPosition }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [projected, setProjected] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Canvas camera={{ fov: 75, position: [0, 0, 0.1] }}>
        <PanoramaSphere url={url} />
        <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={-0.3} />
        <PanoramaClickHandler onClickCanvas={onClickCanvas} isEditing={isEditing} />
        <ProjectionUpdater hotspots={hotspots} onUpdate={setProjected} />
      </Canvas>

      <div className={`absolute inset-0 ${isEditing ? "cursor-crosshair" : ""}`} style={{ pointerEvents: "none" }}>
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
