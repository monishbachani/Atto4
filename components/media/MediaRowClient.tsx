// components/media/MediaRowClient.tsx
"use client";

import React, { useRef } from "react";
import MediaCard from "./MediaCard";
import type { Movie, TVShow } from "@/lib/api/types";

type Media = Movie | TVShow;
type RowKind = "movie" | "tv";

interface Props {
  title?: string;
  media: Media[];
  mediaType?: RowKind;
  limit?: number;
}

export default function MediaRowClient({ title = "Featured", media = [], mediaType = "movie", limit = 12 }: Props) {
  const visible = media.slice(0, limit);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollerRef.current) return;
    const el = scrollerRef.current;
    const offset = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === "left" ? -offset : offset, behavior: "smooth" });
  };

  return (
    <section className="my-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button aria-label="scroll left" className="p-2 rounded hover:bg-neutral-800" onClick={() => scroll("left")}>◀</button>
          <button aria-label="scroll right" className="p-2 rounded hover:bg-neutral-800" onClick={() => scroll("right")}>▶</button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto py-2 scroll-smooth"
        style={{ scrollbarGutter: "stable" }}
      >
        {visible.map((m) => (
          <div key={(m as any).id} className="min-w-[160px] w-[160px]">
            <MediaCard media={m as Media} mediaType={mediaType} />
          </div>
        ))}

        {visible.length === 0 && (
          <div className="text-sm text-muted-foreground">No items to display</div>
        )}
      </div>
    </section>
  );
}
