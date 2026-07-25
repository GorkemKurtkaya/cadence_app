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

/** GitHub tarzı yıllık katkı takvimi: hafta sütunları × 7 gün satırı, ay etiketleri. */
export function YearHeatmap({ calendar, className }: { calendar: YearCalendar; className?: string }) {
  const { days, weeks, months } = calendar;

  return (
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
                title={`${d.date}: ${d.count} commit`}
                className={cn("rounded-[2px]", LEVEL_BG[activityLevel(d.count)])}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
