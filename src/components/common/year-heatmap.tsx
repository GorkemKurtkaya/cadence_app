import { useState } from "react";
import { createPortal } from "react-dom";
import { activityLevel } from "@/services/stats";
import { LEVEL_BG } from "@/components/common/contribution-heatmap";
import { cn } from "@/lib/utils";
import type { YearCalendar } from "@/types";

// Hücre boyutu (px) ve boşluk — sütun adımı = CELL + GAP.
const CELL = 11;
const GAP = 3;
const PITCH = CELL + GAP;
const ROW_TEMPLATE = `repeat(7, ${CELL}px)`;

// Sol tarafta seyrek gün etiketleri (Pzt/Çar/Cum), tek satırlar boş.
const WEEKDAYS = ["Pzt", "", "Çar", "", "Cum", "", ""] as const;

const MONTHS_FULL = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
] as const;

/** "2026-08-11" → "11 Ağustos 2026". */
function humanDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS_FULL[Number(m) - 1]} ${y}`;
}

// İmleci takip eden tooltip'in durumu (hangi gün + ekran konumu).
type Hover = { date: string; count: number; x: number; y: number };

/** GitHub tarzı yıllık katkı takvimi: hafta sütunları × 7 gün satırı, ay etiketleri. */
export function YearHeatmap({ calendar, className }: { calendar: YearCalendar; className?: string }) {
  const { days, weeks, months } = calendar;
  const [hover, setHover] = useState<Hover | null>(null);

  return (
    <>
      <div className={cn("overflow-x-auto", className)}>
        <div className="inline-flex flex-col gap-1.5">
          {/* Ay etiketleri — sütunlara hizalı. */}
          <div className="flex" style={{ paddingLeft: 28 }}>
            <div className="relative h-3.5" style={{ width: weeks * PITCH }}>
              {months.map((m) => (
                <span
                  key={`${m.col}-${m.label}`}
                  className="text-muted-foreground absolute font-mono text-[10px]"
                  style={{ left: m.col * PITCH }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-1.5">
            {/* Gün etiketleri (satırlara hizalı). */}
            <div className="grid w-6" style={{ gridTemplateRows: ROW_TEMPLATE, gap: GAP }}>
              {WEEKDAYS.map((label, i) => (
                <span
                  key={i}
                  className="text-muted-foreground flex items-center font-mono text-[9px] leading-none"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Hücreler — sütun-major (hafta sütunları). */}
            <div
              className="grid"
              style={{
                gridAutoFlow: "column",
                gridTemplateRows: ROW_TEMPLATE,
                gridAutoColumns: `${CELL}px`,
                gap: GAP,
              }}
            >
              {days.map((d) => (
                <div
                  key={d.date}
                  onMouseEnter={(e) =>
                    setHover({ date: d.date, count: d.count, x: e.clientX, y: e.clientY })
                  }
                  onMouseMove={(e) =>
                    setHover({ date: d.date, count: d.count, x: e.clientX, y: e.clientY })
                  }
                  onMouseLeave={() => setHover(null)}
                  className={cn("rounded-[2px]", LEVEL_BG[activityLevel(d.count)])}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {hover
        ? createPortal(
            <div
              style={{
                position: "fixed",
                top: hover.y - 10,
                left: hover.x,
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
              }}
              className="bg-panel z-50 rounded-md border px-2 py-1 text-[11px] whitespace-nowrap shadow-lg"
            >
              <span className="text-foreground font-semibold">{humanDate(hover.date)}</span>
              <span className="text-muted-foreground">
                {" · "}
                {hover.count === 0 ? "katkı yok" : `${hover.count} commit`}
              </span>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
