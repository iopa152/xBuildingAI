import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";
import type {
    Banner,
    CreateBannerParams,
    OperationResult,
    UpdateBannerParams,
} from "../types";

export function useBannerListQuery(
    params?: { title?: string },
    options?: QueryOptionsUtil<Banner[]>,
) {
    return useQuery({
        queryKey: ["drama-banner", "list", params],
        queryFn: () => consoleHttpClient.get<Banner[]>("/banner", { params }),
        ...options,
    });
}

export function useCreateBannerMutation(
    options?: MutationOptionsUtil<Partial<Banner>, CreateBannerParams>,
) {
    return useMutation<Partial<Banner>, Error, CreateBannerParams>({
        mutationFn: (data) => consoleHttpClient.post<Partial<Banner>>("/banner", data),
        ...options,
    });
}

export function useUpdateBannerMutation(
    options?: MutationOptionsUtil<Banner, { id: string; data: UpdateBannerParams }>,
) {
    return useMutation<Banner, Error, { id: string; data: UpdateBannerParams }>({
        mutationFn: ({ id, data }) => consoleHttpClient.patch<Banner>(`/banner/${id}`, data),
        ...options,
    });
}

export function useDeleteBannerMutation(options?: MutationOptionsUtil<OperationResult, string>) {
    return useMutation<OperationResult, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<OperationResult>(`/banner/${id}`),
        ...options,
    });
}
