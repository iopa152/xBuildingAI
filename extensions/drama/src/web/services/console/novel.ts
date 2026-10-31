import type { PaginatedResponse } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// ---------------- categories ----------------

export interface NovelCategoryRow {
    id: string;
    name: string;
    sort: number;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export function useNovelCategoryListQuery() {
    return useQuery({
        queryKey: ["drama-novel", "category"],
        queryFn: () => consoleHttpClient.get<NovelCategoryRow[]>("/novel/category"),
    });
}

export function useCreateNovelCategoryMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<NovelCategoryRow>) =>
            consoleHttpClient.post("/novel/category", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

export function useUpdateNovelCategoryMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<NovelCategoryRow> }) =>
            consoleHttpClient.patch(`/novel/category/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

export function useDeleteNovelCategoryMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/novel/category/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

// ---------------- novels ----------------

export interface NovelRow {
    id: string;
    title: string;
    author?: string | null;
    cover?: string | null;
    categoryId?: string | null;
    categoryName: string;
    description?: string | null;
    tag: string;
    /** free | whole | chapter */
    priceType: string;
    coinPrice: number;
    chapterCoinPrice: number;
    chapterCount: number;
    wordCount: number;
    viewCount: number;
    saleCount: number;
    ratingAvg: number;
    ratingCount: number;
    status: boolean;
    sort: number;
    createdAt: string;
}

export function useNovelListQuery(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: string;
    categoryId?: string;
    priceType?: string;
}) {
    return useQuery({
        queryKey: ["drama-novel", "book", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<NovelRow>>("/novel/book", { params }),
    });
}

export function useCreateNovelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) => consoleHttpClient.post("/novel/book", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

export function useUpdateNovelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
            consoleHttpClient.patch(`/novel/book/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

export function useDeleteNovelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/novel/book/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

// ---------------- records ----------------

export type NovelRecordType = "rating" | "bookshelf" | "history" | "purchase";

export interface NovelRecordRow {
    id: string;
    novelTitle: string;
    chapterTitle?: string | null;
    isWholeBook?: boolean;
    username: string;
    nickname: string;
    score: number | null;
    chapter: string | null;
    coins: number | null;
    createdAt: string;
    updatedAt?: string | null;
}

export function useNovelRecordListQuery(
    type: NovelRecordType,
    params?: { page?: number; pageSize?: number; keyword?: string },
) {
    return useQuery({
        queryKey: ["drama-novel", "record", type, params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<NovelRecordRow>>(`/novel/record/${type}`, {
                params,
            }),
    });
}

// ---------------- chapters ----------------

export interface NovelChapterRow {
    id: string;
    chapterNo: number;
    title: string;
    isFree: boolean;
    coinPrice: number;
    wordCount: number;
    preview: string;
    createdAt: string;
    updatedAt: string;
}

export function useNovelChapterListQuery(novelId: string | undefined) {
    return useQuery({
        queryKey: ["drama-novel", "chapter", novelId],
        queryFn: () =>
            consoleHttpClient.get<NovelChapterRow[]>("/novel/chapter", { params: { novelId } }),
        enabled: !!novelId,
    });
}

export function useNovelChapterContentQuery(id: string | null) {
    return useQuery({
        queryKey: ["drama-novel", "chapter-content", id],
        queryFn: () =>
            consoleHttpClient.get<{
                id: string;
                chapterNo: number;
                title: string;
                content: string;
                isFree: boolean;
                coinPrice: number;
            }>(`/novel/chapter/${id}/content`),
        enabled: !!id,
    });
}

export function useCreateNovelChapterMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) =>
            consoleHttpClient.post("/novel/chapter", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

export function useUpdateNovelChapterMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
            consoleHttpClient.patch(`/novel/chapter/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

export function useDeleteNovelChapterMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/novel/chapter/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

export function useImportNovelChaptersMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { novelId: string; raw: string }) =>
            consoleHttpClient.post<{ created: number }>("/novel/chapter/import", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}

export function useDeleteNovelRecordMutation(type: NovelRecordType) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/novel/record/${type}/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-novel"] }),
    });
}
