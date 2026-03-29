import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import ModelViewer from "@/components/ModelViewer";
import PanoramaViewer from "@/components/PanoramaViewer";
import HotspotSlidePanel from "@/components/HotspotSlidePanel";
import type { Hotspot } from "./EditorPage";

export default function ViewPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project-view", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        로딩 중...
      </div>
    );
  if (!project)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        프로젝트를 찾을 수 없습니다
      </div>
    );

  const hotspots: Hotspot[] = project.hotspots
    ? (project.hotspots as unknown as Hotspot[])
    : [];
  const bgType = project.background_type;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — NO edit button for shared view */}
      <header className="flex items-center gap-3 p-3 bg-secondary border-b border-border">
        <h1 className="text-lg font-semibold text-foreground flex-1">{project.name}</h1>
      </header>

      <div className="flex-1 flex relative">
        <div className="flex-1 relative">
          {bgType === "3d" && project.image_url ? (
            <ModelViewer
              url={project.image_url}
              hotspots={hotspots}
              isEditing={false}
              onClickCanvas={() => {}}
              onHotspotClick={setSelectedHotspot}
            />
          ) : bgType === "360" && project.image_url ? (
            <PanoramaViewer
              url={project.image_url}
              hotspots={hotspots}
              isEditing={false}
              onClickCanvas={() => {}}
              onHotspotClick={setSelectedHotspot}
            />
          ) : project.image_url ? (
            <div
              className="w-full h-full bg-cover bg-center relative"
              style={{ backgroundImage: `url(${project.image_url})` }}
            >
              {hotspots.map((h) => (
                <button
                  key={h.id}
                  className="absolute w-6 h-6 bg-primary rounded-full border-2 border-primary-foreground transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition z-10"
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  onClick={() => setSelectedHotspot(h)}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              콘텐츠가 없습니다
            </div>
          )}
        </div>

        {selectedHotspot && (
          <HotspotSlidePanel
            hotspot={selectedHotspot}
            onClose={() => setSelectedHotspot(null)}
            readOnly
          />
        )}
      </div>
    </div>
  );
}
