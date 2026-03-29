import { useState } from "react";
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Hotspot, Slide } from "@/pages/EditorPage";

interface Props {
  hotspot: Hotspot;
  onUpdate?: (h: Hotspot) => void;
  onDelete?: () => void;
  onClose: () => void;
  onImageUpload?: (file: File) => Promise<string>;
  readOnly?: boolean;
}

export default function HotspotSlidePanel({ hotspot, onUpdate, onDelete, onClose, onImageUpload, readOnly }: Props) {
  const [slideIdx, setSlideIdx] = useState(0);
  const slides = hotspot.slides || [];
  const slide = slides[slideIdx];

  const addSlide = () => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      title: "",
      content: "",
    };
    const updated = { ...hotspot, slides: [...slides, newSlide] };
    onUpdate?.(updated);
    setSlideIdx(slides.length);
  };

  const updateSlide = (field: keyof Slide, value: string) => {
    const newSlides = slides.map((s, i) =>
      i === slideIdx ? { ...s, [field]: value } : s
    );
    onUpdate?.({ ...hotspot, slides: newSlides });
  };

  const deleteSlide = () => {
    const newSlides = slides.filter((_, i) => i !== slideIdx);
    onUpdate?.({ ...hotspot, slides: newSlides });
    setSlideIdx(Math.max(0, slideIdx - 1));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;
    try {
      const url = await onImageUpload(file);
      updateSlide("imageUrl", url);
    } catch {
      // handled upstream
    }
  };

  const isYouTube = (url?: string) => url && (url.includes("youtube.com") || url.includes("youtu.be"));
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
    return match?.[1] || "";
  };

  const hasVideoOnly = slide && isYouTube(slide.videoUrl) && !slide.title && !slide.content;

  return (
    <div className="w-80 bg-secondary border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <input
          className="bg-transparent text-foreground font-semibold outline-none flex-1"
          value={hotspot.label}
          readOnly={readOnly}
          onChange={(e) => onUpdate?.({ ...hotspot, label: e.target.value })}
        />
        <div className="flex gap-1">
          {!readOnly && onDelete && (
            <button onClick={onDelete} className="p-1 text-destructive hover:opacity-80">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Slides */}
      {slides.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
          <p className="text-sm mb-3">슬라이드가 없습니다</p>
          {!readOnly && (
            <button onClick={addSlide} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md">
              <Plus size={14} /> 슬라이드 추가
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navigation */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <button
              disabled={slideIdx === 0}
              onClick={() => setSlideIdx(slideIdx - 1)}
              className="p-1 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-muted-foreground">{slideIdx + 1} / {slides.length}</span>
            <button
              disabled={slideIdx >= slides.length - 1}
              onClick={() => setSlideIdx(slideIdx + 1)}
              className="p-1 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Slide content */}
          <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
            {slide && hasVideoOnly ? (
              /* Full-screen YouTube */
              <div className="flex-1 flex items-center justify-center">
                <iframe
                  className="w-full aspect-video rounded-md"
                  src={`https://www.youtube.com/embed/${getYouTubeId(slide.videoUrl!)}?autoplay=1`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            ) : slide ? (
              <>
                {readOnly ? (
                  <h3 className="text-foreground font-semibold">{slide.title}</h3>
                ) : (
                  <input
                    className="bg-muted text-foreground rounded-md px-2 py-1.5 text-sm outline-none"
                    placeholder="슬라이드 제목"
                    value={slide.title}
                    onChange={(e) => updateSlide("title", e.target.value)}
                  />
                )}
                {readOnly ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{slide.content}</p>
                ) : (
                  <textarea
                    className="bg-muted text-foreground rounded-md px-2 py-1.5 text-sm outline-none resize-none flex-1 min-h-[80px]"
                    placeholder="내용을 입력하세요"
                    value={slide.content}
                    onChange={(e) => updateSlide("content", e.target.value)}
                  />
                )}

                {/* Image */}
                {slide.imageUrl && (
                  <img src={slide.imageUrl} alt="" className="w-full rounded-md" />
                )}
                {!readOnly && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      📷 이미지 업로드
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    <input
                      className="bg-muted text-foreground rounded-md px-2 py-1.5 text-xs outline-none"
                      placeholder="이미지 URL"
                      value={slide.imageUrl || ""}
                      onChange={(e) => updateSlide("imageUrl", e.target.value)}
                    />
                  </div>
                )}

                {/* Video */}
                {!readOnly && (
                  <input
                    className="bg-muted text-foreground rounded-md px-2 py-1.5 text-xs outline-none"
                    placeholder="YouTube URL"
                    value={slide.videoUrl || ""}
                    onChange={(e) => updateSlide("videoUrl", e.target.value)}
                  />
                )}
                {slide.videoUrl && isYouTube(slide.videoUrl) && !hasVideoOnly && (
                  <iframe
                    className="w-full aspect-video rounded-md"
                    src={`https://www.youtube.com/embed/${getYouTubeId(slide.videoUrl)}`}
                    allow="encrypted-media"
                    allowFullScreen
                  />
                )}
              </>
            ) : null}
          </div>

          {/* Bottom actions */}
          {!readOnly && (
            <div className="flex items-center gap-2 p-3 border-t border-border">
              <button onClick={addSlide} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-md">
                <Plus size={12} /> 추가
              </button>
              <button onClick={deleteSlide} className="flex items-center gap-1 px-2 py-1 bg-destructive/20 text-destructive text-xs rounded-md">
                <Trash2 size={12} /> 삭제
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
