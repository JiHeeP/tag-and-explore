import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { ArrowLeft, Plus, Share2, Save, Trash2 } from "lucide-react";
import ModelViewer from "@/components/ModelViewer";
import PanoramaViewer from "@/components/PanoramaViewer";
import HotspotSlidePanel from "@/components/HotspotSlidePanel";

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  worldX?: number;
  worldY?: number;
  worldZ?: number;
  label: string;
  slides: Slide[];
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
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

  const hotspots: Hotspot[] = project?.hotspots
    ? (project.hotspots as unknown as Hotspot[])
    : [];

  const saveHotspots = useMutation({
    mutationFn: async (newHotspots: Hotspot[]) => {
      const { error } = await supabase
        .from("projects")
        .update({ hotspots: newHotspots as unknown as Record<string, unknown>[], updated_at: new Date().toISOString() })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("저장되었습니다");
    },
  });

  const updateProject = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", id] }),
  });

  const addHotspot = useCallback(
    (x: number, y: number, worldX?: number, worldY?: number, worldZ?: number) => {
      const newHotspot: Hotspot = {
        id: crypto.randomUUID(),
        x,
        y,
        worldX,
        worldY,
        worldZ,
        label: `핫스팟 ${hotspots.length + 1}`,
        slides: [],
      };
      const updated = [...hotspots, newHotspot];
      saveHotspots.mutate(updated);
    },
    [hotspots, saveHotspots]
  );

  const deleteHotspot = (hotspotId: string) => {
    const updated = hotspots.filter((h) => h.id !== hotspotId);
    saveHotspots.mutate(updated);
    if (selectedHotspot?.id === hotspotId) setSelectedHotspot(null);
  };

  const updateHotspot = (updated: Hotspot) => {
    const newList = hotspots.map((h) => (h.id === updated.id ? updated : h));
    saveHotspots.mutate(newList);
    setSelectedHotspot(updated);
  };

  const handleResolveWorldPosition = (hotspotId: string, worldX: number, worldY: number, worldZ: number) => {
    const newList = hotspots.map((h) =>
      h.id === hotspotId ? { ...h, worldX, worldY, worldZ } : h
    );
    saveHotspots.mutate(newList);
  };

  const shareProject = async () => {
    await updateProject.mutateAsync({ is_public: true });
    const url = `${window.location.origin}/view/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("공유 링크가 복사되었습니다!");
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("project-assets").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("project-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    let bgType = "image";
    if (ext === "glb" || ext === "gltf") bgType = "3d";
    else if (file.type.includes("image") && file.name.includes("360")) bgType = "360";

    try {
      const url = await handleImageUpload(file);
      await updateProject.mutateAsync({
        image_url: url,
        background_type: bgType,
      });
      toast.success("배경이 업로드되었습니다");
    } catch {
      toast.error("업로드 실패");
    }
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">로딩 중...</div>;
  if (!project) return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">프로젝트를 찾을 수 없습니다</div>;

  const bgType = project.background_type;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 p-3 bg-secondary border-b border-border">
        <button onClick={() => navigate("/")} className="p-1.5 hover:bg-muted rounded-md">
          <ArrowLeft size={18} />
        </button>
        <input
          className="bg-transparent text-foreground font-semibold text-lg outline-none flex-1"
          value={project.name}
          onChange={(e) => updateProject.mutate({ name: e.target.value })}
        />
        <label className="flex items-center gap-1 px-3 py-1.5 bg-muted text-foreground text-sm rounded-md cursor-pointer hover:opacity-80">
          배경 업로드
          <input type="file" className="hidden" onChange={handleBackgroundUpload} accept="image/*,.glb,.gltf" />
        </label>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md ${
            isEditing ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"
          }`}
        >
          <Plus size={14} /> {isEditing ? "핫스팟 추가 중" : "핫스팟 추가"}
        </button>
        <button onClick={shareProject} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md">
          <Share2 size={14} /> 공유
        </button>
      </header>

      {/* Main */}
      <div className="flex-1 flex relative">
        <div className="flex-1 relative">
          {bgType === "3d" && project.image_url ? (
            <ModelViewer
              url={project.image_url}
              hotspots={hotspots}
              isEditing={isEditing}
              onClickCanvas={addHotspot}
              onHotspotClick={setSelectedHotspot}
              onResolveWorldPosition={handleResolveWorldPosition}
            />
          ) : bgType === "360" && project.image_url ? (
            <PanoramaViewer
              url={project.image_url}
              hotspots={hotspots}
              isEditing={isEditing}
              onClickCanvas={addHotspot}
              onHotspotClick={setSelectedHotspot}
              onResolveWorldPosition={handleResolveWorldPosition}
            />
          ) : project.image_url ? (
            <div
              className="w-full h-full bg-cover bg-center relative"
              style={{ backgroundImage: `url(${project.image_url})` }}
              onClick={
                isEditing
                  ? (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      addHotspot(
                        ((e.clientX - rect.left) / rect.width) * 100,
                        ((e.clientY - rect.top) / rect.height) * 100
                      );
                    }
                  : undefined
              }
            >
              {isEditing && <div className="absolute inset-0 cursor-crosshair" />}
              {hotspots.map((h) => (
                <button
                  key={h.id}
                  className="absolute w-6 h-6 bg-primary rounded-full border-2 border-primary-foreground transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition z-10"
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHotspot(h);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              배경 이미지를 업로드해주세요
            </div>
          )}
        </div>

        {/* Slide Panel */}
        {selectedHotspot && (
          <HotspotSlidePanel
            hotspot={selectedHotspot}
            onUpdate={updateHotspot}
            onDelete={() => deleteHotspot(selectedHotspot.id)}
            onClose={() => setSelectedHotspot(null)}
            onImageUpload={handleImageUpload}
          />
        )}
      </div>
    </div>
  );
}
