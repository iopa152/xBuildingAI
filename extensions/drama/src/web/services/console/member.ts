import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// ---------------- member groups ----------------

export interface MemberGroupRow {
    id: string;
    name: string;
    rules: string[];
    status: boolean;
    sort: number;
    createdAt: string;
    updatedAt: string;
}

export interface MemberRuleRow {
    id: string;
    title: string;
    path?: string | null;
    icon?: string | null;
    sort: number;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MemberScoreLogRow {
    id: string;
    userId: string;
    username: string;
    nickname: string;
    score: number;
    type: number;
    bizType: string;
    before: number;
    after: number;
    description: string;
    memo: string;
    createdAt: string;
}

export interface MemberScoreLogPage {
    items: MemberScoreLogRow[];
    total: number;
    page: number;
    pageSize: number;
}

export interface MemberInfo {
    id: string;
    username: string;
    nickname: string;
    score: number;
}

export function useMemberGroupListQuery() {
    return useQuery({
        queryKey: ["drama-member", "group"],
        queryFn: () => consoleHttpClient.get<MemberGroupRow[]>("/member-manage/group"),
    });
}

export function useCreateMemberGroupMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<MemberGroupRow>) =>
            consoleHttpClient.post("/member-manage/group", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-member"] }),
    });
}

export function useUpdateMemberGroupMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MemberGroupRow> }) =>
            consoleHttpClient.patch(`/member-manage/group/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-member"] }),
    });
}

export function useDeleteMemberGroupMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/member-manage/group/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-member"] }),
    });
}

// ---------------- member rules ----------------

export function useMemberRuleListQuery() {
    return useQuery({
        queryKey: ["drama-member", "rule"],
        queryFn: () => consoleHttpClient.get<MemberRuleRow[]>("/member-manage/rule"),
    });
}

export function useCreateMemberRuleMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<MemberRuleRow>) =>
            consoleHttpClient.post("/member-manage/rule", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-member"] }),
    });
}

export function useUpdateMemberRuleMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MemberRuleRow> }) =>
            consoleHttpClient.patch(`/member-manage/rule/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-member"] }),
    });
}

export function useDeleteMemberRuleMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/member-manage/rule/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-member"] }),
    });
}

// ---------------- member points (coin ledger) ----------------

export function useMemberScoreListQuery(params?: {
    page?: number;
    pageSize?: number;
    userId?: string;
    keyword?: string;
}) {
    return useQuery({
        queryKey: ["drama-member", "score", params],
        queryFn: () =>
            consoleHttpClient.get<MemberScoreLogPage>("/member-manage/score", { params }),
    });
}

export function useMemberInfoQuery(userId?: string) {
    return useQuery({
        queryKey: ["drama-member", "info", userId],
        queryFn: () => consoleHttpClient.get<MemberInfo>(`/member-manage/score/user/${userId}`),
        enabled: !!userId,
    });
}

export function useAdjustMemberScoreMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            delta,
            memo,
        }: {
            id: string;
            delta: number;
            memo?: string;
        }) => consoleHttpClient.post(`/member-manage/score/${id}/adjust`, { delta, memo }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-member"] }),
    });
}
