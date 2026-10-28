import type { PaginatedResponse } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// ---------------- stripe config ----------------

export interface PayConfigView {
    enabled: boolean;
    successUrl: string;
    cancelUrl: string;
    secretKeyMasked: string | null;
    webhookSecretMasked: string | null;
}

export function usePayConfigQuery() {
    return useQuery({
        queryKey: ["drama-pay", "config"],
        queryFn: () => consoleHttpClient.get<PayConfigView | null>("/pay/config"),
    });
}

export function useSavePayConfigMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) =>
            consoleHttpClient.post("/pay/config", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

// ---------------- coin orders ----------------

export interface CoinOrder {
    id: string;
    orderNo: string;
    userId: string;
    coins: number;
    amount: number;
    currency: string;
    channel?: string;
    status: string;
    promoCode?: string;
    paidAt?: string;
    createdAt: string;
}

export function useCoinOrderListQuery(params?: {
    status?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
}) {
    return useQuery({
        queryKey: ["drama-pay", "order", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<CoinOrder>>("/pay/order", { params }),
    });
}

export function useRefundMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.post(`/pay/order/${id}/refund`, {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

// ---------------- coin packages ----------------

export interface CoinPackageRow {
    id: string;
    coins: number;
    bonus: number;
    price: number;
    tag?: string | null;
    sort: number;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export function useCoinPackageListQuery() {
    return useQuery({
        queryKey: ["drama-pay", "package"],
        queryFn: () => consoleHttpClient.get<CoinPackageRow[]>("/pay/package"),
    });
}

export function useCreateCoinPackageMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<CoinPackageRow>) =>
            consoleHttpClient.post("/pay/package", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

export function useUpdateCoinPackageMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CoinPackageRow> }) =>
            consoleHttpClient.patch(`/pay/package/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

export function useDeleteCoinPackageMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/pay/package/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

// ---------------- withdrawal / feedback / faq ----------------

export interface WithdrawalRow {
    id: string;
    userId: string;
    coins: number;
    method: string;
    account: string;
    status: string;
    note?: string;
    createdAt: string;
}

export function useWithdrawalListQuery(params?: { status?: string; page?: number }) {
    return useQuery({
        queryKey: ["drama-help", "withdrawal", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<WithdrawalRow>>("/help/withdrawal", {
                params,
            }),
    });
}

export function useWithdrawalActionMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, action, note }: { id: string; action: "approve" | "reject"; note?: string }) =>
            consoleHttpClient.post(`/help/withdrawal/${id}/${action}`, { note }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-help"] }),
    });
}

export interface FeedbackRow {
    id: string;
    userId: string;
    content: string;
    contact?: string;
    status: string;
    reply?: string;
    createdAt: string;
}

export function useFeedbackListQuery(params?: { status?: string; page?: number }) {
    return useQuery({
        queryKey: ["drama-help", "feedback", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<FeedbackRow>>("/help/feedback", { params }),
    });
}

export function useResolveFeedbackMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reply }: { id: string; reply?: string }) =>
            consoleHttpClient.post(`/help/feedback/${id}/resolve`, { reply }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-help"] }),
    });
}

export interface FaqRow {
    id: string;
    question: string;
    answer: string;
    sort: number;
    status: boolean;
}

export function useFaqListQuery() {
    return useQuery({
        queryKey: ["drama-help", "faq"],
        queryFn: () => consoleHttpClient.get<FaqRow[]>("/help/faq"),
    });
}

export function useCreateFaqMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { question: string; answer: string; sort?: number }) =>
            consoleHttpClient.post("/help/faq", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-help"] }),
    });
}

export function useDeleteFaqMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/help/faq/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-help"] }),
    });
}

// ---------------- airwallex / vod configs ----------------

export function useAwxConfigQuery() {
    return useQuery({
        queryKey: ["drama-awx", "config"],
        queryFn: () =>
            consoleHttpClient.get<{ enabled: boolean; clientId: string | null; successUrl: string } | null>(
                "/airwallex/config",
            ),
    });
}

export function useSaveAwxConfigMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) =>
            consoleHttpClient.post("/airwallex/config", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-awx"] }),
    });
}

export function useVodConfigQuery() {
    return useQuery({
        queryKey: ["drama-vod", "config"],
        queryFn: () =>
            consoleHttpClient.get<{ provider: string; region: string; enabled: boolean; accessKeyIdMasked: string | null } | null>(
                "/vod/config",
            ),
    });
}

export function useSaveVodConfigMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) =>
            consoleHttpClient.post("/vod/config", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-vod"] }),
    });
}

// ---------------- panels & pixels ----------------

export function useDeletePixelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/promotion/pixel/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}


export function usePanelListQueryFull() {
    return useQuery({
        queryKey: ["drama-promo", "panel"],
        queryFn: () => consoleHttpClient.get<any[]>("/promotion/panel"),
    });
}

export function useCreatePanelMutationFull() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            name: string;
            tiers: { coins: number; price: number; currency?: string; badge?: string }[];
        }) => consoleHttpClient.post("/promotion/panel", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}

export function useDeletePanelMutationFull() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/promotion/panel/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-promo"] }),
    });
}
