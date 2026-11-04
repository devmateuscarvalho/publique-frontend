"use client";

import { Suspense } from "react";

import { PerformanceDashboard } from "@/components/performance-dashboard";

export default function DashboardPage() {
  return (
    <Suspense>
      <PerformanceDashboard />
    </Suspense>
  );
}
