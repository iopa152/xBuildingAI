import type { PaginatedResponse } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// ---------------- dashboard stats ----------------

export interface StatsOverview {
    today: {
        rechargeAmount: number;
        rechargeOrders: number;
        newUsers: number;
        activeUsers: number;
        unlocks: number;
        coinSpent: number;
    };
    trend: { date: string; newUsers: number; recharge: number; unlocks: number }[];
    topDramas: { dramaId: string; title: string; unlocks: number; coins: number }[];
    topUsers: { userId: string; nickname: string; unlocks: number; coins: number }[];
}

export function useStatsOverviewQuery() {
    return useQuery({
        queryKey: ["drama-stats", "overview"],
        queryFn: () => consoleHttpClient.get<StatsOverview>("/stats/overview"),
    });
}

// ---------------- members ----------------

export interface MemberRow {
    id: string;
    username: string;
    nickname: string;
    avatar?: string;
    power: number;
    status: number;
    createdAt: string;
    isVip: boolean;
    unlocks: number;
    coinsSpent: number;
}

export function useMemberListQuery(params?: { keyword?: string; vip?: string; page?: number }) {
    return useQuery({
        queryKey: ["drama-member", "list", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<MemberRow>>("/member", { params }),
    });
}

export function useAdjustCoinsMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, delta, remark }: { id: string; delta: number; remark?: string }) =>
            consoleHttpClient.post(`/member/${id}/coins`, { delta, remark }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-member"] }),
    });
}

export function useMemberStatusMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: number }) =>
            consoleHttpClient.post(`/member/${id}/status`, { status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-member"] }),
    });
}

// ---------------- playlists ----------------

export interface PlaylistRow {
    id: string;
    name: string;
    description?: string;
    dramaIds: string[];
    cover?: string;
    status: boolean;
    sort: number;
}

export function usePlaylistListQuery() {
    return useQuery({
        queryKey: ["drama-ops", "playlist"],
        queryFn: () => consoleHttpClient.get<PlaylistRow[]>("/ops/playlist"),
    });
}

export function useSavePlaylistMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id?: string;
            data: { name: string; description?: string; dramaIds: string[]; status?: boolean; sort?: number };
        }) => (id ? consoleHttpClient.patch(`/ops/playlist/${id}`, data) : consoleHttpClient.post("/ops/playlist", data)),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-ops"] }),
    });
}

export function useDeletePlaylistMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/ops/playlist/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-ops"] }),
    });
}

// ---------------- languages ----------------

export interface LanguageRow {
    id: string;
    code: string;
    name: string;
    status: boolean;
    sort: number;
}

export function useLanguageListQuery() {
    return useQuery({
        queryKey: ["drama-ops", "language"],
        queryFn: () => consoleHttpClient.get<LanguageRow[]>("/ops/language"),
    });
}

export function useSaveLanguageMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id?: string; data: { code?: string; name: string; sort?: number; status?: boolean } }) =>
            id ? consoleHttpClient.patch(`/ops/language/${id}`, data) : consoleHttpClient.post("/ops/language", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-ops"] }),
    });
}

export function useDeleteLanguageMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/ops/language/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-ops"] }),
    });
}

// ---------------- checkin config / agreements ----------------

export function useCheckinConfigQuery() {
    return useQuery({
        queryKey: ["drama-ops", "checkin-config"],
        queryFn: () => consoleHttpClient.get<number[]>("/ops/checkin-config"),
    });
}

export function useSaveCheckinConfigMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (rewards: number[]) =>
            consoleHttpClient.put("/ops/checkin-config", { rewards }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-ops"] }),
    });
}

export interface AgreementRow {
    type: string;
    title: string;
    content: string;
}

export function useAgreementListQuery() {
    return useQuery({
        queryKey: ["drama-ops", "agreement"],
        queryFn: () => consoleHttpClient.get<AgreementRow[]>("/ops/agreement"),
    });
}

export function useSaveAgreementMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: AgreementRow) => consoleHttpClient.post("/ops/agreement", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-ops"] }),
    });
}
