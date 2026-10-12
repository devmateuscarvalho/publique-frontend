"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type SortOrder = "asc" | "desc";

export type ListColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  cell: (row: T) => ReactNode;
};

export type ListFilter = {
  key: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
};

const pageSize = 20;

function paramName(prefix: string, name: string) {
  return prefix ? `${prefix}_${name}` : name;
}

export function useListQuery({
  prefix = "",
  defaultSort,
  defaultOrder = "asc",
  filterKeys = [],
}: {
  prefix?: string;
  defaultSort: string;
  defaultOrder?: SortOrder;
  filterKeys?: string[];
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const key = (name: string) => paramName(prefix, name);
  const pageRaw = Number(params.get(key("page")) || "1");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const sort = params.get(key("sort")) || defaultSort;
  const orderRaw = params.get(key("order"));
  const order: SortOrder = orderRaw === "desc" || orderRaw === "asc" ? orderRaw : defaultOrder;
  const q = params.get(key("q")) ?? "";
  const filterKey = filterKeys.join("\0");
  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    for (const name of filterKey ? filterKey.split("\0") : []) {
      next[name] = params.get(paramName(prefix, name)) ?? "";
    }
    return next;
  }, [filterKey, params, prefix]);

  const [draft, setDraft] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    setDraft(q);
  }

  const replace = useCallback(
    (next: Record<string, string | null>, resetPage = false) => {
      const search = new URLSearchParams(params.toString());
      for (const [name, value] of Object.entries(next)) {
        const stored = paramName(prefix, name);
        if (!value) {
          search.delete(stored);
        } else {
          search.set(stored, value);
        }
      }
      if (resetPage) {
        search.delete(paramName(prefix, "page"));
      }
      const query = search.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, prefix, router],
  );

  useEffect(() => {
    if (draft === q) {
      return;
    }
    const handle = window.setTimeout(() => {
      replace({ q: draft }, true);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draft, q, replace]);

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    search.set("page", String(page));
    search.set("page_size", String(pageSize));
    if (q) {
      search.set("q", q);
    }
    search.set("sort", sort);
    search.set("order", order);
    for (const [filterKey, value] of Object.entries(filters)) {
      if (value) {
        search.set(filterKey, value);
      }
    }
    return search.toString();
  }, [filters, order, page, q, sort]);

  const filtering = Boolean(q) || Object.values(filters).some(Boolean);

  return {
    page,
    pageSize,
    q,
    sort,
    order,
    filters,
    draft,
    setDraft,
    filtering,
    queryString,
    setPage: (next: number) => replace({ page: next <= 1 ? null : String(next) }),
    setFilter: (filterKey: string, value: string) => replace({ [filterKey]: value }, true),
    toggleSort: (column: string) => {
      if (sort === column) {
        replace({ sort: column, order: order === "asc" ? "desc" : "asc" }, true);
        return;
      }
      replace({ sort: column, order: "asc" }, true);
    },
  };
}

export function FilterPills({
  controlsId,
  filters,
  values,
  onChange,
}: {
  controlsId: string;
  filters: ListFilter[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (filters.length === 0) {
    return null;
  }
  return (
    <div className="flex gap-2 overflow-x-auto sm:shrink-0 sm:overflow-visible">
      {filters.map((filter) => {
        const active = Boolean(values[filter.key]);
        return (
          <Select
            key={filter.key}
            value={values[filter.key] || "all"}
            onValueChange={(value) => onChange(filter.key, value === "all" ? "" : value)}
          >
            <SelectTrigger
              id={`filter-${controlsId}-${filter.key}`}
              aria-label={filter.label}
              className={cn(
                "h-11 w-auto max-w-56 shrink-0 rounded-full border-transparent px-4 shadow-none",
                active ? "bg-foreground text-background" : "bg-muted text-foreground",
              )}
            >
              {active ? <SelectValue /> : <span className="truncate">{filter.label}</span>}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{filter.allLabel}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}
    </div>
  );
}

export function formatListDate(locale: string, value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  total,
  loading,
  list,
  controlsId = "list",
  searchLabel,
  filters = [],
  emptyLabel,
  noResultsLabel,
  onRowClick,
}: {
  rows: T[];
  columns: ListColumn<T>[];
  total: number;
  loading?: boolean;
  list: ReturnType<typeof useListQuery>;
  controlsId?: string;
  searchLabel: string;
  filters?: ListFilter[];
  emptyLabel: string;
  noResultsLabel: string;
  onRowClick?: (row: T) => void;
}) {
  const t = useTranslations("lists");
  const pages = Math.max(1, Math.ceil(total / list.pageSize));
  const searchId = `${controlsId}-search`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Label htmlFor={searchId} className="sr-only">
            {searchLabel}
          </Label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id={searchId}
            value={list.draft}
            placeholder={searchLabel}
            onChange={(event) => list.setDraft(event.target.value)}
            className="h-11 rounded-full border-transparent bg-muted pr-11 pl-10 shadow-none"
          />
          {list.draft ? (
            <button
              type="button"
              className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              onClick={() => list.setDraft("")}
              aria-label={t("clearSearch")}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <FilterPills
          controlsId={controlsId}
          filters={filters}
          values={list.filters}
          onChange={(key, value) => list.setFilter(key, value)}
        />
      </div>

      {loading ? <p className="text-sm text-ink/70">{t("loading")}</p> : null}

      {!loading && total === 0 ? (
        <p className="text-sm text-ink/70">{list.filtering ? noResultsLabel : emptyLabel}</p>
      ) : null}

      {!loading && total > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const active = list.sort === column.key;
                const ariaSort = active ? (list.order === "asc" ? "ascending" : "descending") : "none";
                return (
                  <TableHead key={column.key} aria-sort={column.sortable ? ariaSort : undefined} className={column.className}>
                    {column.sortable ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-1 text-left font-medium"
                        onClick={() => list.toggleSort(column.key)}
                      >
                        {column.header}
                        {active && list.order === "asc" ? <ArrowUp className="size-4" aria-hidden /> : null}
                        {active && list.order === "desc" ? <ArrowDown className="size-4" aria-hidden /> : null}
                        {!active ? <ArrowUpDown className="size-4 opacity-50" aria-hidden /> : null}
                        <span className="sr-only">{t("sortBy", { field: column.header })}</span>
                      </button>
                    ) : (
                      <span className="inline-flex min-h-11 items-center">{column.header}</span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? "cursor-pointer" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {!loading && total > list.pageSize ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>
                {t("previous")}
              </PaginationPrevious>
            </PaginationItem>
            <PaginationItem>
              <span className="inline-flex min-h-11 items-center px-2 text-sm text-ink/70">
                {t("page", { page: Math.min(list.page, pages), pages })}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext disabled={list.page >= pages} onClick={() => list.setPage(list.page + 1)}>
                {t("next")}
              </PaginationNext>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
