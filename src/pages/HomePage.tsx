import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Eye, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name: "새 프로젝트", image_url: "" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      navigate(`/editor/${data.id}`);
    },
    onError: () => toast.error("프로젝트 생성 실패"),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("프로젝트가 삭제되었습니다");
    },
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Tag & Explore</h1>
          <button
            onClick={() => createProject.mutate()}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            <Plus size={18} /> 새 프로젝트
          </button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">로딩 중...</p>
        ) : !projects?.length ? (
          <p className="text-muted-foreground">프로젝트가 없습니다. 새 프로젝트를 만들어보세요!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-secondary rounded-xl p-4 flex flex-col gap-3"
              >
                <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.background_type}</p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => navigate(`/editor/${p.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
                  >
                    편집
                  </button>
                  <button
                    onClick={() => navigate(`/view/${p.id}`)}
                    className="flex items-center justify-center p-1.5 text-sm bg-muted text-foreground rounded-md hover:opacity-80"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("정말 삭제하시겠습니까?")) deleteProject.mutate(p.id);
                    }}
                    className="flex items-center justify-center p-1.5 text-sm bg-destructive/20 text-destructive rounded-md hover:opacity-80"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
