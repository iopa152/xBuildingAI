import type { PaginatedResponse } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// ---------------- categories ----------------

export interface MallCategoryRow {
    id: string;
    name: string;
    icon?: string | null;
    languageCode: string;
    allRegion: boolean;
    status: boolean;
    sort: number;
    createdAt: string;
    updatedAt: string;
}

export function useMallCategoryListQuery() {
    return useQuery({
        queryKey: ["drama-mall", "category"],
        queryFn: () => consoleHttpClient.get<MallCategoryRow[]>("/mall/category"),
    });
}

export function useCreateMallCategoryMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<MallCategoryRow>) =>
            consoleHttpClient.post("/mall/category", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-mall"] }),
    });
}

export function useUpdateMallCategoryMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MallCategoryRow> }) =>
            consoleHttpClient.patch(`/mall/category/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-mall"] }),
    });
}

export function useDeleteMallCategoryMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/mall/category/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-mall"] }),
    });
}

// ---------------- goods ----------------

export interface MallGoodsRow {
    id: string;
    categoryId?: string | null;
    categoryName: string;
    title: string;
    subtitle?: string | null;
    coverImage?: string | null;
    images: string[];
    description?: string | null;
    tags?: string | null;
    coinPrice: number;
    originalCoinPrice: number;
    stock: number;
    salesCount: number;
    languageCode: string;
    allRegion: boolean;
    hot: boolean;
    freeShipping: boolean;
    status: boolean;
    sort: number;
    createdAt: string;
}

export function useMallGoodsListQuery(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: string;
}) {
    return useQuery({
        queryKey: ["drama-mall", "goods", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<MallGoodsRow>>("/mall/goods", { params }),
    });
}

export function useMallGoodsDetailQuery(id?: string) {
    return useQuery({
        queryKey: ["drama-mall", "goods-detail", id],
        queryFn: () => consoleHttpClient.get<MallGoodsRow>(`/mall/goods/${id}`),
        enabled: !!id,
    });
}

export function useCreateMallGoodsMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) => consoleHttpClient.post("/mall/goods", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-mall"] }),
    });
}

export function useUpdateMallGoodsMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
            consoleHttpClient.patch(`/mall/goods/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-mall"] }),
    });
}

export function useDeleteMallGoodsMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/mall/goods/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-mall"] }),
    });
}

// ---------------- orders ----------------

export interface MallOrderRow {
    id: string;
    orderNo: string;
    userId?: string | null;
    username: string;
    nickname: string;
    totalCoin: number;
    status: string;
    logisticsCompany?: string | null;
    logisticsNo?: string | null;
    shipRemark?: string | null;
    address?: Record<string, string> | null;
    paidAt?: string | null;
    shippedAt?: string | null;
    createdAt: string;
}

export interface MallOrderItemRow {
    id: string;
    goodsId?: string | null;
    goodsTitle: string;
    skuSpecs?: string | null;
    quantity: number;
    coinPrice: number;
}

export interface MallOrderDetailRow extends MallOrderRow {
    items: MallOrderItemRow[];
}

export function useMallOrderListQuery(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
}) {
    return useQuery({
        queryKey: ["drama-mall", "order", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<MallOrderRow>>("/mall/order", { params }),
    });
}

export function useMallOrderDetailQuery(id?: string) {
    return useQuery({
        queryKey: ["drama-mall", "order-detail", id],
        queryFn: () => consoleHttpClient.get<MallOrderDetailRow>(`/mall/order/${id}`),
        enabled: !!id,
    });
}

export function useShipMallOrderMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: { logisticsCompany?: string; logisticsNo?: string; remark?: string };
        }) => consoleHttpClient.post(`/mall/order/${id}/ship`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-mall"] }),
    });
}

export function useCancelMallOrderMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.post(`/mall/order/${id}/cancel`, {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-mall"] }),
    });
}
