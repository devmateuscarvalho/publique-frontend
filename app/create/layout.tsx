import { CreationBrandProvider } from "@/components/creation-brand";

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <CreationBrandProvider>{children}</CreationBrandProvider>;
}
