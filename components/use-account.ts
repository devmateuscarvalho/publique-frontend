"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { api, type Brand, type Organization, type User } from "@/lib/api";

export function useAccount() {
  const router = useRouter();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: User }>("/v1/auth/me"),
    retry: false,
  });

  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: () => api<{ organizations: Organization[] }>("/v1/organizations"),
    enabled: me.isSuccess,
  });

  const organization = organizations.data?.organizations[0];

  const brands = useQuery({
    queryKey: ["brands", organization?.id, "picker"],
    queryFn: () =>
      api<{ brands: Brand[] }>(`/v1/organizations/${organization?.id}/brands?page_size=100&sort=name&order=asc`),
    enabled: Boolean(organization?.id),
  });

  useEffect(() => {
    if (me.isError) {
      router.replace("/login");
    }
  }, [me.isError, router]);

  const loading = me.isLoading || me.isError || organizations.isLoading;

  return { me, organizations, organization, brands, loading };
}
