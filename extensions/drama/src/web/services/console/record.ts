import type { PaginatedResponse } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";
import type {
    Comment,
    Drama,
    TaskConfig,
    UnlockRecord,
} from "../types";

// ---------------- unlock records ----------------

export interface UnlockRecordRow extends UnlockRecord {
    drama?: Partial<Drama>;
}

export function useUnlockListQuery(params?: {
    page?: number;
    pageSize?: number;
    dramaId?: string;
}) {
    return useQuery({
        queryKey: ["drama-unlock", "list", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<UnlockRecordRow>>("/unlock", { params }),
    });
}

export function useUnlockStatsQuery() {
    return useQuery({
        queryKey: ["drama-unlock", "stats"],
        queryFn: () =>
            consoleHttpClient.get<{
                todayUnlocks: number;
                topDramas: { dramaId: string; title: string; unlocks: number; coins: number }[];
            }>("/unlock/stats"),
    });
}

// ---------------- comments ----------------

export interface CommentRow extends Comment {
    drama?: Partial<Drama>;
    user?: { id: string; nickname: string; avatar?: string };
}

export function useCommentListQuery(params?: {
    page?: number;
    pageSize?: number;
    dramaId?: string;
    status?: string;
}) {
    return useQuery({
        queryKey: ["drama-comment", "list", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<CommentRow>>("/watch/comment", { params }),
    });
}

export function useSetCommentStatusMutation() {
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            consoleHttpClient.patch(`/watch/comment/${id}/status`, { status }),
    });
}

export function useDeleteCommentMutation() {
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/watch/comment/${id}`),
    });
}

// ---------------- ratings / favorites / watch history ----------------

export interface RatingRow {
    id: string;
    userId: string;
    dramaId: string;
    stars: number;
    createdAt: string;
    dramaTitle?: string;
    userNickname?: string;
    userAvatar?: string | null;
}

export function useRatingListQuery(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
}) {
    return useQuery({
        queryKey: ["drama-watch", "rating", params],
        queryFn: () => consoleHttpClient.get<PaginatedResponse<RatingRow>>("/watch/rating", { params }),
    });
}

export interface FavoriteRecordRow {
    id: string;
    userId: string;
    dramaId: string;
    createdAt: string;
    dramaTitle?: string;
    userNickname?: string;
    userAvatar?: string | null;
}

export function useFavoriteRecordListQuery(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
}) {
    return useQuery({
        queryKey: ["drama-watch", "favorite", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<FavoriteRecordRow>>("/watch/favorite", { params }),
    });
}

export interface WatchHistoryRow {
    id: string;
    userId: string;
    dramaId: string;
    episodeNo: number;
    progressSeconds: number;
    duration: number;
    updatedAt: string;
    drama?: { id: string; title: string; coverVertical?: string };
    userNickname?: string;
    userAvatar?: string | null;
}

export function useWatchHistoryListQuery(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
}) {
    return useQuery({
        queryKey: ["drama-watch", "history", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<WatchHistoryRow>>("/watch/history", { params }),
    });
}

// ---------------- tasks ----------------

export function useTaskConfigListQuery() {
    return useQuery({
        queryKey: ["drama-task", "config"],
        queryFn: () => consoleHttpClient.get<TaskConfig[]>("/task/config"),
    });
}

export function useCreateTaskConfigMutation() {
    return useMutation({
        mutationFn: (data: Partial<TaskConfig>) =>
            consoleHttpClient.post("/task/config", data),
    });
}

export function useUpdateTaskConfigMutation() {
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<TaskConfig> }) =>
            consoleHttpClient.patch(`/task/config/${id}`, data),
    });
}

export function useDeleteTaskConfigMutation() {
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/task/config/${id}`),
    });
}

export interface TaskProgressRow {
    id: string;
    userId: string;
    taskCode: string;
    progressDate?: string;
    progress: number;
    completedAt?: string;
    rewardedAt?: string;
    createdAt: string;
}

export function useTaskRecordListQuery(params?: {
    taskCode?: string;
    page?: number;
    pageSize?: number;
}) {
    return useQuery({
        queryKey: ["drama-task", "record", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<TaskProgressRow>>("/task/record", { params }),
    });
}

export interface CheckinRecordRow {
    id: string;
    userId: string;
    checkinDate: string;
    dayNo: number;
    coins: number;
    createdAt: string;
}

export function useCheckinRecordListQuery(params?: {
    userId?: string;
    page?: number;
    pageSize?: number;
}) {
    return useQuery({
        queryKey: ["drama-task", "checkin", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<CheckinRecordRow>>("/task/checkin", { params }),
    });
}
