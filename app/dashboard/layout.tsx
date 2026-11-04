import { CreationBrandProvider } from "@/components/creation-brand";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <CreationBrandProvider>{children}</CreationBrandProvider>;
}
