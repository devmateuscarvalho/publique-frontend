import { CreationBrandProvider } from "@/components/creation-brand";

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <CreationBrandProvider>{children}</CreationBrandProvider>;
}
