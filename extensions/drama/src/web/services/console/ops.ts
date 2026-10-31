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
    orderType: string;
    userId: string;
    username?: string | null;
    nickname?: string | null;
    coins: number;
    vipDays: number;
    amount: number;
    phpAmount: number;
    currency: string;
    market?: string | null;
    channel?: string;
    status: string;
    promoCode?: string;
    pitcher?: string | null;
    subscriber: boolean;
    paidAt?: string;
    createdAt: string;
}

export function useCoinOrderListQuery(params?: {
    status?: string;
    userId?: string;
    keyword?: string;
    orderType?: string;
    currency?: string;
    channel?: string;
    market?: string;
    promoCode?: string;
    pitcher?: string;
    subscriber?: string;
    createdFrom?: string;
    createdTo?: string;
    paidFrom?: string;
    paidTo?: string;
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
    name: string;
    coins: number;
    bonus: number;
    price: number;
    originalPrice?: number | null;
    phpPrice?: number | null;
    phpOriginalPrice?: number | null;
    tag?: string | null;
    firstChargeExclusive: boolean;
    iosProductId?: string | null;
    androidProductId?: string | null;
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
    username?: string | null;
    nickname?: string | null;
    withdrawNo: string;
    coins: number;
    actualAmount?: number | null;
    currency: string;
    method: string;
    account: string;
    payeeName?: string | null;
    bankCountry?: string | null;
    bankName?: string | null;
    status: string;
    note?: string;
    reviewedAt?: string;
    createdAt: string;
}

export function useWithdrawalListQuery(params?: {
    status?: string;
    keyword?: string;
    minCoins?: number;
    maxCoins?: number;
    currency?: string;
    payee?: string;
    bankCountry?: string;
    bank?: string;
    applyFrom?: string;
    applyTo?: string;
    reviewedFrom?: string;
    reviewedTo?: string;
    page?: number;
    pageSize?: number;
}) {
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

export function useUpdateFaqMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<FaqRow> }) =>
            consoleHttpClient.patch(`/help/faq/${id}`, data),
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

export function usePaymongoConfigQuery() {
    return useQuery({
        queryKey: ["drama-paymongo", "config"],
        queryFn: () =>
            consoleHttpClient.get<{
                enabled: boolean;
                secretKeyMasked: string | null;
                webhookSecretMasked: string | null;
            } | null>("/paymongo/config"),
    });
}

export function useSavePaymongoConfigMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) =>
            consoleHttpClient.post("/paymongo/config", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-paymongo"] }),
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

// ---------------- vip packages ----------------

export interface VipPackageRow {
    id: string;
    name: string;
    durationType: string;
    days: number;
    price: number;
    originalPrice?: number | null;
    phpPrice?: number | null;
    phpOriginalPrice?: number | null;
    tag?: string | null;
    autoRenew: boolean;
    enabled: boolean;
    iosProductId?: string | null;
    androidProductId?: string | null;
    googleBasePlanId?: string | null;
    stripePriceId?: string | null;
    airwallexPriceId?: string | null;
    paypalPlanId?: string | null;
    sort: number;
    createdAt: string;
    updatedAt: string;
}

export function useVipPackageListQuery() {
    return useQuery({
        queryKey: ["drama-pay", "vip-package"],
        queryFn: () => consoleHttpClient.get<VipPackageRow[]>("/pay/vip-package"),
    });
}

export function useCreateVipPackageMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<VipPackageRow>) =>
            consoleHttpClient.post("/pay/vip-package", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

export function useUpdateVipPackageMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<VipPackageRow> }) =>
            consoleHttpClient.patch(`/pay/vip-package/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

export function useDeleteVipPackageMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/pay/vip-package/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

// ---------------- redeem codes ----------------

export interface RedeemCodeRow {
    id: string;
    code: string;
    batchNo: string;
    activityName: string;
    rewardType: string;
    rewardValue: number;
    maxUses: number;
    usedCount: number;
    expireAt?: string | null;
    enabled: boolean;
    weight: number;
    createdAt: string;
}

export function useRedeemCodeListQuery(params?: {
    keyword?: string;
    rewardType?: string;
    enabled?: string;
    page?: number;
    pageSize?: number;
}) {
    return useQuery({
        queryKey: ["drama-pay", "redeem-code", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<RedeemCodeRow>>("/pay/redeem-code", {
                params,
            }),
    });
}

export function useCreateRedeemCodeMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<RedeemCodeRow>) =>
            consoleHttpClient.post("/pay/redeem-code", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

export function useBatchGenerateRedeemCodesMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            count: number;
            activityName?: string;
            rewardType: string;
            rewardValue: number;
            maxUses?: number;
            expireAt?: string;
            weight?: number;
        }) => consoleHttpClient.post<{ batchNo: string; count: number }>("/pay/redeem-code/batch", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

export function useUpdateRedeemCodeMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<RedeemCodeRow> }) =>
            consoleHttpClient.patch(`/pay/redeem-code/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

export function useDeleteRedeemCodeMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/pay/redeem-code/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-pay"] }),
    });
}

// ---------------- redeem records ----------------

export interface RedeemRecordRow {
    id: string;
    code: string;
    activityName: string;
    userId: string;
    username?: string | null;
    nickname?: string | null;
    rewardType: string;
    rewardContent: string;
    coinsBefore?: number | null;
    coinsAfter?: number | null;
    vipExpireBefore?: string | null;
    vipExpireAfter?: string | null;
    createdAt: string;
}

export function useRedeemRecordListQuery(params?: {
    keyword?: string;
    rewardType?: string;
    page?: number;
    pageSize?: number;
}) {
    return useQuery({
        queryKey: ["drama-pay", "redeem-record", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<RedeemRecordRow>>("/pay/redeem-record", {
                params,
            }),
    });
}
