import { Suspense } from "react";

import { IntegrationsScreen } from "@/components/integrations-screen";

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsScreen />
    </Suspense>
  );
}
