import { CreationBrandProvider } from "@/components/creation-brand";

export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return <CreationBrandProvider>{children}</CreationBrandProvider>;
}
