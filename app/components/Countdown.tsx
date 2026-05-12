"use client";

import { useEffect, useState } from "react";

function parseDay(d: string): number {
  // "ГГГГ-ММ-ДД" → ms (начало дня UTC); endDate включительно → конец дня
  return new Date(d.length === 10 ? d + "T00:00:00Z" : d).getTime();
}

function compute(startDate: string, endDate: string, now: number) {
  const start = parseDay(startDate);
  const end = parseDay(endDate) + 24 * 60 * 60 * 1000; // конец последнего дня
  if (now < start) {
    const days = Math.ceil((start - now) / (24 * 60 * 60 * 1000));
    return { label: `Старт через ${days} ${plural(days)}`, tone: "muted" as const };
  }
  if (now >= end) {
    return { label: "Соревнование завершено", tone: "muted" as const };
  }
  const msLeft = end - now;
  const dayMs = 24 * 60 * 60 * 1000;
  if (msLeft >= dayMs) {
    const days = Math.floor(msLeft / dayMs);
    return { label: `До конца: ${days} ${plural(days)}`, tone: "accent" as const };
  }
  const hours = Math.floor(msLeft / (60 * 60 * 1000));
  const mins = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
  return { label: `До конца: ${hours} ч ${mins} мин`, tone: "accent" as const };
}

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

export default function Countdown({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const { label, tone } = compute(startDate, endDate, now);
  const cls =
    tone === "accent"
      ? "border-accent/40 text-accent"
      : "border-border text-muted";

  return (
    <span
      className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${cls}`}
      suppressHydrationWarning
    >
      {label}
    </span>
  );
}
