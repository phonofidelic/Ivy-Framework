import "./style.css";
import { ActivityHeatmapProps, Activity } from "./types";

function buildBipolarColors(minColor: string, maxColor: string): Record<number, string> {
  return {
    [-4]: minColor,
    [-3]: `color-mix(in srgb, color-mix(in srgb, ${minColor} 75%, ${maxColor}) 85%, transparent)`,
    [-2]: `color-mix(in srgb, color-mix(in srgb, ${minColor} 50%, ${maxColor}) 75%, transparent)`,
    [-1]: `color-mix(in srgb, color-mix(in srgb, ${minColor} 25%, ${maxColor}) 33%, transparent)`,
    [0]: `color-mix(in srgb, color-mix(in srgb, ${minColor} 50%, ${maxColor}) 15%, transparent)`,
    [1]: `color-mix(in srgb, color-mix(in srgb, ${maxColor} 25%, ${minColor}) 33%, transparent)`,
    [2]: `color-mix(in srgb, color-mix(in srgb, ${maxColor} 50%, ${minColor}) 75%, transparent)`,
    [3]: `color-mix(in srgb, color-mix(in srgb, ${maxColor} 75%, ${minColor}) 85%, transparent)`,
    [4]: maxColor,
  };
}

const preferredLanguage = navigator.languages.length ? navigator.languages : navigator.language;
const monthFormatter = new Intl.DateTimeFormat(preferredLanguage, { month: "short" });
const weekdayFormatter = new Intl.DateTimeFormat(preferredLanguage, { weekday: "short" });
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => monthFormatter.format(new Date(0, i)));

const MONDAY = weekdayFormatter.format(new Date("2025-01-06"));
const WEDNESDAY = weekdayFormatter.format(new Date("2025-01-08"));
const FRIDAY = weekdayFormatter.format(new Date("2025-01-10"));

function getLevel(count: number, maxCount: number, minCount: number = 0): number {
  if (count === 0) return 0;
  if (count < 0 && minCount < 0) {
    if (count <= minCount) return -4;
    if (count <= minCount * 0.75) return -3;
    if (count <= minCount * 0.5) return -2;
    return -1;
  }
  if (count > 0 && maxCount > 0) {
    if (count <= maxCount * 0.25) return 1;
    if (count <= maxCount * 0.5) return 2;
    if (count <= maxCount * 0.75) return 3;
    return 4;
  }
  return 0;
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildGrid(data: Activity[], startDate?: string, endDate?: string): (Activity | null)[][] {
  const hasOverride = startDate || endDate;

  if (data.length === 0 && !hasOverride) {
    const today = new Date();
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    return buildGridFromRange([], start, end);
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  const firstStr = startDate ?? (sorted.length > 0 ? sorted[0].date : null);
  const lastStr = endDate ?? (sorted.length > 0 ? sorted[sorted.length - 1].date : null);

  const today = new Date();
  const firstDate = firstStr
    ? new Date(firstStr + "T00:00:00")
    : new Date(new Date().setDate(today.getDate() - 364));
  const lastDate = lastStr ? new Date(lastStr + "T00:00:00") : today;

  return buildGridFromRange(data, firstDate, lastDate);
}

function buildGridFromRange(
  data: Activity[],
  firstDate: Date,
  lastDate: Date,
): (Activity | null)[][] {
  let rangeStart = firstDate;
  let rangeEnd = lastDate;
  if (
    !Number.isNaN(rangeStart.getTime()) &&
    !Number.isNaN(rangeEnd.getTime()) &&
    rangeStart > rangeEnd
  ) {
    const t = rangeStart;
    rangeStart = rangeEnd;
    rangeEnd = t;
  }

  // Pad left to preceding Sunday
  const start = new Date(rangeStart);
  start.setDate(start.getDate() - start.getDay());

  // Pad right to following Saturday
  const end = new Date(rangeEnd);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const dataMap = new Map<string, Activity>();
  for (const day of data) {
    dataMap.set(day.date, day);
  }

  const weeks: (Activity | null)[][] = [];
  const current = new Date(start);

  while (current <= end) {
    const week: (Activity | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = formatLocalDateKey(current);
      week.push(dataMap.get(dateStr) ?? { date: dateStr, count: 0 });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function formatTooltip(day: Activity): string {
  const date = new Date(day.date + "T00:00:00");
  const month = MONTH_NAMES[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();
  const label = day.count === 1 ? "contribution" : "contributions";
  return `${month} ${dayNum}, ${year} — ${day.count} ${label}`;
}

export function ActivityHeatmap({
  id,
  events = [],
  eventHandler,
  data = [],
  colorScheme = "primary",
  showTooltip = true,
  showMonthLabels = true,
  showDayLabels = true,
  startDate,
  endDate,
}: ActivityHeatmapProps) {
  // console.log(`data: ${JSON.stringify(data, null,)}`);
  const weeks = buildGrid(data, startDate, endDate);
  const counts = data.map((d) => d.count ?? 0);
  const maxCount = counts.length ? Math.max(0, ...counts) : 0;
  const minCount = counts.length ? Math.min(0, ...counts) : 0;
  console.log(`maxCount: ${maxCount}, minCount: ${minCount}`);
  const rawScheme = Array.isArray(colorScheme) ? colorScheme : [colorScheme ?? "primary"];
  const isBipolar = rawScheme.length >= 2;
  const colorMap: Record<number, string> = isBipolar
    ? buildBipolarColors(
      `var(--color-${rawScheme[0]!.toLowerCase()})`,
      `var(--color-${rawScheme[1]!.toLowerCase()})`,
    )
    : {
      0: "var(--color-muted)",
      1: `color-mix(in srgb, var(--color-${rawScheme[0]!.toLowerCase()}) 25%, transparent)`,
      2: `color-mix(in srgb, var(--color-${rawScheme[0]!.toLowerCase()}) 50%, transparent)`,
      3: `color-mix(in srgb, var(--color-${rawScheme[0]!.toLowerCase()}) 75%, transparent)`,
      4: `var(--color-${rawScheme[0]!.toLowerCase()})`,
    };
  const clickable = events.includes("OnDayClick");

  // Compute month labels: for each week, check if the first non-null day is the first occurrence of a new month
  const monthLabels: string[] = weeks.map((week, wi) => {
    const firstDay = week[0];
    if (!firstDay) return "";
    const date = new Date(firstDay.date + "T00:00:00");
    if (date.getDate() <= 7) {
      // First week of the month
      const prevWeekFirstDay = wi > 0 ? weeks[wi - 1]?.[0] : null;
      if (!prevWeekFirstDay) return MONTH_NAMES[date.getMonth()] ?? "";
      const prevDate = new Date(prevWeekFirstDay.date + "T00:00:00");
      if (prevDate.getMonth() !== date.getMonth()) {
        return MONTH_NAMES[date.getMonth()] ?? "";
      }
    }
    return "";
  });

  const handleClick = (day: Activity) => {
    if (clickable) {
      eventHandler("OnDayClick", id, [day]);
    }
  };

  return (
    <div className="flex w-full relative bg-background rounded border-secondary pb-6">
      <div className="overflow-x-auto p-0" style={{ direction: "rtl" }}>
        <div className="inline-flex flex-col gap-1 font-sans" style={{ direction: "ltr" }}>
          {showMonthLabels && (
            <div className="flex gap-0.5 text-[#57606a] w-fit">
              {showDayLabels && <div style={{ width: "28px" }} />}
              {weeks.map((_, wi) => (
                <div
                  key={wi}
                  className="text-center flex text-secondary-foreground opacity-50 last:hidden"
                  style={{ width: "11px", fontSize: "10px" }}
                >
                  {monthLabels[wi]}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            {showDayLabels && (
              <div className="flex flex-col justify-end absolute left-0 top-0 bottom-[24px] bg-background">
                <div
                  className="grid gap-0.5 text-secondary-foreground opacity-50 pt-0.5 *:pr-2 *:text-right"
                  style={{ gridTemplateRows: "repeat(7, 11px)", width: "28px" }}
                >
                  <div />
                  <div style={{ fontSize: "10px", lineHeight: "11px" }}>{MONDAY}</div>
                  <div />
                  <div style={{ fontSize: "10px", lineHeight: "11px" }}>{WEDNESDAY}</div>
                  <div />
                  <div style={{ fontSize: "10px", lineHeight: "11px" }}>{FRIDAY}</div>
                  <div />
                </div>
              </div>
            )}

            <div className="flex gap-0.5 " style={{ paddingLeft: showDayLabels ? 28 : 0 }}>
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  className="grid gap-0.5"
                  style={{ gridTemplateRows: "repeat(7, 11px)" }}
                >
                  {week.map((day, di) => {
                    const level = day ? getLevel(day.count, maxCount, minCount) : 0;
                    const bg = colorMap[level] ?? "transparent";
                    const title = showTooltip && day ? formatTooltip(day) : undefined;
                    return (
                      <div
                        key={di}
                        className={`w-[11px] h-[11px] rounded-sm ${clickable && day?.count ? "cursor-pointer" : "cursor-default"}`}
                        style={{ backgroundColor: bg }}
                        title={title}
                        onClick={day ? () => handleClick(day) : undefined}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 flex justify-center gap-1" style={{ direction: "ltr" }}>
          <div style={{ fontSize: "10px", lineHeight: "11px" }}>
            Less
          </div>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: isBipolar ? "repeat(9, 11px)" : "repeat(5, 11px)" }}>
            {isBipolar && (
              <>
                <div className="col-span-1">
                  <div className="size-[11px] rounded-sm" style={{ backgroundColor: colorMap[-4] }} />
                </div>
                <div className="col-span-1">
                  <div className="size-[11px] rounded-sm" style={{ backgroundColor: colorMap[-3] }} />
                </div>
                <div className="col-span-1">
                  <div className="size-[11px] rounded-sm" style={{ backgroundColor: colorMap[-2] }} />
                </div>
                <div className="col-span-1">
                  <div className="size-[11px] rounded-sm" style={{ backgroundColor: colorMap[-1] }} />
                </div>
              </>
            )}
            <div className="col-span-1">
              <div className="size-[11px] rounded-sm" style={{ backgroundColor: colorMap[0] }} />
            </div>
            <div className="col-span-1">
              <div className="size-[11px] rounded-sm" style={{ backgroundColor: colorMap[1] }} />
            </div>
            <div className="col-span-1">
              <div className="size-[11px] rounded-sm" style={{ backgroundColor: colorMap[2] }} />
            </div>
            <div className="col-span-1">
              <div className="size-[11px] rounded-sm" style={{ backgroundColor: colorMap[3] }} />
            </div>
            <div className="col-span-1">
              <div className="size-[11px] rounded-sm" style={{ backgroundColor: colorMap[4] }} />
            </div>
          </div>
          <div style={{ fontSize: "10px", lineHeight: "11px" }}>
            More
          </div>
        </div>
      </div>
    </div>
  );
}
