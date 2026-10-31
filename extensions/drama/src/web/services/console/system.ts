import type { PaginatedResponse } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// ---------------- attachments ----------------

export interface AttachmentRow {
    id: string;
    originalName: string;
    storageName?: string | null;
    mimeType?: string | null;
    size: number;
    path?: string | null;
    url?: string | null;
    uploaderId?: string | null;
    uploaderName: string;
    createdAt: string;
}

export function useAttachmentListQuery(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
}) {
    return useQuery({
        queryKey: ["drama-system", "file", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<AttachmentRow>>("/system/file", { params }),
    });
}

export function useDeleteAttachmentMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => consoleHttpClient.delete(`/system/file/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-system", "file"] }),
    });
}

// ---------------- admin logs ----------------

export interface AdminLogRow {
    id: string;
    adminId?: string | null;
    adminName?: string | null;
    action: string;
    target?: string | null;
    detail?: string | null;
    ip?: string | null;
    createdAt: string;
}

export function useAdminLogListQuery(params?: { page?: number; pageSize?: number }) {
    return useQuery({
        queryKey: ["drama-system", "admin-log", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<AdminLogRow>>("/system/admin-log", { params }),
    });
}

// ---------------- profile ----------------

export interface AdminProfile {
    id: string;
    username: string;
    nickname?: string | null;
    avatar?: string | null;
    email?: string | null;
    phone?: string | null;
    phoneAreaCode?: string | null;
    lastLoginAt?: string | null;
    createdAt: string;
}

export function useAdminProfileQuery() {
    return useQuery({
        queryKey: ["drama-system", "profile"],
        queryFn: () => consoleHttpClient.get<AdminProfile>("/system/profile"),
    });
}

export function useUpdateAdminProfileMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { nickname?: string; email?: string; phone?: string; avatar?: string }) =>
            consoleHttpClient.patch("/system/profile", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-system", "profile"] }),
    });
}
