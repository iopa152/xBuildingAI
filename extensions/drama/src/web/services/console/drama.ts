import type {
    MutationOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";
import type {
    CreateDramaParams,
    Drama,
    QueryDramaParams,
    UpdateDramaParams,
} from "../types";
import type { OperationResult } from "../types";

export function useDramaListQuery(params?: QueryDramaParams, options?: QueryOptionsUtil<PaginatedResponse<Drama>>) {
    return useQuery({
        queryKey: ["drama", "list", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<Drama>>("/drama", { params }),
        ...options,
    });
}

export function useDramaDetailQuery(id: string, options?: QueryOptionsUtil<Drama>) {
    return useQuery<Drama>({
        queryKey: ["drama", "detail", id],
        queryFn: () => consoleHttpClient.get<Drama>(`/drama/${id}`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

export function useCreateDramaMutation(
    options?: MutationOptionsUtil<Partial<Drama>, CreateDramaParams>,
) {
    return useMutation<Partial<Drama>, Error, CreateDramaParams>({
        mutationFn: (data) => consoleHttpClient.post<Partial<Drama>>("/drama", data),
        ...options,
    });
}

export function useUpdateDramaMutation(
    options?: MutationOptionsUtil<Drama, { id: string; data: UpdateDramaParams }>,
) {
    return useMutation<Drama, Error, { id: string; data: UpdateDramaParams }>({
        mutationFn: ({ id, data }) => consoleHttpClient.patch<Drama>(`/drama/${id}`, data),
        ...options,
    });
}

export function useDeleteDramaMutation(options?: MutationOptionsUtil<OperationResult, string>) {
    return useMutation<OperationResult, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<OperationResult>(`/drama/${id}`),
        ...options,
    });
}

export function usePublishDramaMutation(options?: MutationOptionsUtil<OperationResult, string>) {
    return useMutation<OperationResult, Error, string>({
        mutationFn: (id) => consoleHttpClient.post<OperationResult>(`/drama/${id}/publish`),
        ...options,
    });
}

export function useOfflineDramaMutation(options?: MutationOptionsUtil<OperationResult, string>) {
    return useMutation<OperationResult, Error, string>({
        mutationFn: (id) => consoleHttpClient.post<OperationResult>(`/drama/${id}/offline`),
        ...options,
    });
}

export function useSetDramaFeaturedMutation(
    options?: MutationOptionsUtil<OperationResult, { id: string; featured: boolean }>,
) {
    return useMutation<OperationResult, Error, { id: string; featured: boolean }>({
        mutationFn: ({ id, featured }) =>
            consoleHttpClient.post<OperationResult>(`/drama/${id}/featured`, { featured }),
        ...options,
    });
}

export function useBatchSetDramaPriceMutation(
    options?: MutationOptionsUtil<OperationResult, { ids: string[]; wholePrice: number }>,
) {
    return useMutation<OperationResult, Error, { ids: string[]; wholePrice: number }>({
        mutationFn: ({ ids, wholePrice }) =>
            consoleHttpClient.post<OperationResult>("/drama/batch-price", { ids, wholePrice }),
        ...options,
    });
}
