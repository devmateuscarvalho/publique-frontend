"use client";

import { Suspense } from "react";

import { CalendarScreen } from "@/components/calendar-screen";

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarScreen />
    </Suspense>
  );
}
