/**
 * Business days follow Lagos time (WAT, UTC+1, no daylight saving), so
 * "today" on the admin dashboard matches the shop's day, not the server's.
 */
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RangePreset = "today" | "yesterday" | "7d" | "30d" | "month" | "90d" | "custom";

export interface DateRange {
  preset: RangePreset;
  from: Date;
  /** Exclusive end. */
  to: Date;
  label: string;
}

/** Start of the Lagos calendar day containing `date`, as a UTC instant. */
export function lagosDayStart(date: Date) {
  const shifted = date.getTime() + LAGOS_OFFSET_MS;
  return new Date(shifted - (shifted % DAY_MS) - LAGOS_OFFSET_MS);
}

/** YYYY-MM-DD for the Lagos day containing `date`. */
export function lagosDateKey(date: Date) {
  return new Date(date.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

function parseDateKey(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getTime() - LAGOS_OFFSET_MS);
}

const PRESET_LABELS: Record<Exclude<RangePreset, "custom">, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  "90d": "Last 90 days",
};

export function resolveRange(
  params: { range?: string; from?: string; to?: string },
  now = new Date(),
): DateRange {
  const todayStart = lagosDayStart(now);
  const tomorrow = new Date(todayStart.getTime() + DAY_MS);

  const customFrom = parseDateKey(params.from);
  const customTo = parseDateKey(params.to);
  if (params.range === "custom" && customFrom && customTo && customFrom <= customTo) {
    return {
      preset: "custom",
      from: customFrom,
      to: new Date(customTo.getTime() + DAY_MS),
      label: `${params.from} to ${params.to}`,
    };
  }

  const preset = (params.range && params.range in PRESET_LABELS
    ? params.range
    : "30d") as Exclude<RangePreset, "custom">;
  const daysBack = (days: number) => new Date(todayStart.getTime() - (days - 1) * DAY_MS);

  const ranges: Record<typeof preset, { from: Date; to: Date }> = {
    today: { from: todayStart, to: tomorrow },
    yesterday: { from: new Date(todayStart.getTime() - DAY_MS), to: todayStart },
    "7d": { from: daysBack(7), to: tomorrow },
    "30d": { from: daysBack(30), to: tomorrow },
    "90d": { from: daysBack(90), to: tomorrow },
    month: {
      from: parseDateKey(`${lagosDateKey(now).slice(0, 7)}-01`)!,
      to: tomorrow,
    },
  };
  return { preset, ...ranges[preset], label: PRESET_LABELS[preset] };
}

/** One entry per Lagos day in the range (for charts). */
export function eachDay(range: DateRange) {
  const days: string[] = [];
  for (let time = range.from.getTime(); time < range.to.getTime(); time += DAY_MS) {
    days.push(lagosDateKey(new Date(time)));
  }
  return days;
}
