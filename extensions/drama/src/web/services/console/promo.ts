import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginatedResponse } from "@buildingai/web-types";

import { consoleHttpClient } from "../base";
import type {
    CapiEvent,
    ClickLog,
    Pixel,
    PricePanel,
    PromoLink,
} from "../types";

// ---------------- overview / LTV / monitor ----------------

export interface PromoOverviewItem {
    key: string;
    label: string;
    date?: string;
    clicks: number;
    registrations: number;
    registrationRate: number;
    payUsers: number;
    revenue: number;
    payRate: number;
    avgOrder: number;
    arpu: number;
}

export interface PromoOverviewTotals {
    clicks: number;
    registrations: number;
    registrationRate: number;
    payUsers: number;
    revenue: number;
    payRate: number;
    avgOrder: number;
    arpu: number;
}

export interface PromoSummaryRow {
    id: string;
    name: string;
    code: string;
}

export interface PromoDramaOption {
    id: string;
    title: string;
}

export interface PromoOverviewData {
    items: PromoOverviewItem[];
    totals: PromoOverviewTotals;
    links: PromoSummaryRow[];
    creators: string[];
    dramas: PromoDramaOption[];
}

export interface PromoOverviewParams {
    from: string;
    to: string;
    dimension?: "day" | "link" | "drama";
    linkId?: string;
    dramaId?: string;
    creator?: string;
}

export function usePromoOverviewQuery(params: PromoOverviewParams) {
    return useQuery({
        queryKey: ["drama-promo", "overview", params],
        queryFn: () =>
            consoleHttpClient.get<PromoOverviewData>("/promotion/overview", {
                params,
            }),
    });
}

export interface PromoLtvRow {
    linkId: string;
    linkName: string;
    regDate: string;
    newUsers: number;
    payers: number;
    revenue: number;
    avgRevenue: number;
    todayNew: number;
    todayPayers: number;
    todayRevenue: number;
    ltv: number[];
}

export interface PromoLtvData {
    items: PromoLtvRow[];
    days: number;
    links: PromoSummaryRow[];
}

export function usePromoLtvQuery(params: {
    days?: number;
    from?: string;
    to?: string;
    linkId?: string;
    creator?: string;
    dramaId?: string;
}) {
    return useQuery({
        queryKey: ["drama-promo", "ltv", params],
        queryFn: () =>
            consoleHttpClient.get<PromoLtvData>("/promotion/ltv", { params }),
    });
}

export interface CapiEventStat {
    sent: number;
    success: number;
    failed: number;
}

export interface CapiMonitorDailyRow {
    date: string;
    ViewContent: CapiEventStat;
    CompleteRegistration: CapiEventStat;
    Purchase: CapiEventStat;
    totalSent: number;
    totalSuccess: number;
    totalFailed: number;
    successRate: number;
}

export function useCapiMonitorDailyQuery(params: { from: string; to: string }) {
    return useQuery({
        queryKey: ["drama-promo", "monitor-daily", params],
        queryFn: () =>
            consoleHttpClient.get<{ items: CapiMonitorDailyRow[] }>(
                "/promotion/capi/monitor/daily",
                { params },
            ),
    });
}

export function useCapiMonitorQuery() {
    return useQuery({
        queryKey: ["drama-promo", "monitor"],
        queryFn: () =>
            consoleHttpClient.get<{
                byEvent: {
                    eventName: string;
                    count: number;
                    sent: number;
                    failed: number;
                    pending: number;
                }[];
                byStatus: { status: string; count: number }[];
            }>("/promotion/capi/monitor"),
    });
}

// ---------------- promo links ----------------

export interface PromoLinkRow extends PromoLink {
    pixelName?: string | null;
    pixelBusinessId?: string | null;
    panelName?: string | null;
    dramaTitle?: string | null;
    landingUrl?: string;
    trackPath?: string;
}

export function usePromoLinkListQuery(params?: {
    keyword?: string;
    status?: string;
    page?: number;
    pageSize?: number;
}) {
    return useQuery({
        queryKey: ["drama-promo", "link", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<PromoLinkRow>>("/promotion/link", {
                params,
            }),
    });
}

export function useCreatePromoLinkMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<PromoLink>) =>
            consoleHttpClient.post("/promotion/link", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}

export function useUpdatePromoLinkMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<PromoLink> }) =>
            consoleHttpClient.patch(`/promotion/link/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}

export function useDeletePromoLinkMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/promotion/link/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}

// ---------------- price panels ----------------

export function usePanelListQuery() {
    return useQuery({
        queryKey: ["drama-promo", "panel"],
        queryFn: () => consoleHttpClient.get<PricePanel[]>("/promotion/panel"),
    });
}

export function useCreatePanelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<PricePanel>) =>
            consoleHttpClient.post("/promotion/panel", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}

export function useUpdatePanelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<PricePanel> }) =>
            consoleHttpClient.patch(`/promotion/panel/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}

export function useDeletePanelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/promotion/panel/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}

// ---------------- pixels ----------------

export function usePixelListQuery() {
    return useQuery({
        queryKey: ["drama-promo", "pixel"],
        queryFn: () => consoleHttpClient.get<Pixel[]>("/promotion/pixel"),
    });
}

export function useCreatePixelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Pixel>) =>
            consoleHttpClient.post("/promotion/pixel", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}

export function useUpdatePixelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Pixel> }) =>
            consoleHttpClient.patch(`/promotion/pixel/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}

// ---------------- logs ----------------

export interface ClickLogRow extends ClickLog {
    linkCode?: string | null;
    linkName?: string | null;
}

export function useClickListQuery(params?: {
    page?: number;
    pageSize?: number;
    linkId?: string;
    keyword?: string;
}) {
    return useQuery({
        queryKey: ["drama-promo", "click", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<ClickLogRow>>(
                "/promotion/click",
                { params },
            ),
    });
}

export interface CapiEventRow extends CapiEvent {
    linkName?: string | null;
    linkCode?: string | null;
    pixelBusinessId?: string | null;
    pixelName?: string | null;
}

export function useCapiListQuery(params?: {
    page?: number;
    pageSize?: number;
    pixelId?: string;
    keyword?: string;
    status?: string;
}) {
    return useQuery({
        queryKey: ["drama-promo", "capi", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<CapiEventRow>>(
                "/promotion/capi",
                { params },
            ),
    });
}
