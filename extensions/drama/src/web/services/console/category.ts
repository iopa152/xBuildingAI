import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";
import type {
    CreateCategoryParams,
    DramaCategory,
    OperationResult,
    UpdateCategoryParams,
} from "../types";

export function useCategoryListQuery(
    params?: { name?: string; keyword?: string; language?: string },
    options?: QueryOptionsUtil<DramaCategory[]>,
) {
    return useQuery({
        queryKey: ["drama-category", "list", params],
        queryFn: () =>
            consoleHttpClient.get<DramaCategory[]>("/category", { params }),
        ...options,
    });
}

export function useCategoryDetailQuery(id: string, options?: QueryOptionsUtil<DramaCategory>) {
    return useQuery<DramaCategory>({
        queryKey: ["drama-category", "detail", id],
        queryFn: () => consoleHttpClient.get<DramaCategory>(`/category/${id}`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

export function useCreateCategoryMutation(
    options?: MutationOptionsUtil<Partial<DramaCategory>, CreateCategoryParams>,
) {
    return useMutation<Partial<DramaCategory>, Error, CreateCategoryParams>({
        mutationFn: (data) => consoleHttpClient.post<Partial<DramaCategory>>("/category", data),
        ...options,
    });
}

export function useUpdateCategoryMutation(
    options?: MutationOptionsUtil<DramaCategory, { id: string; data: UpdateCategoryParams }>,
) {
    return useMutation<DramaCategory, Error, { id: string; data: UpdateCategoryParams }>({
        mutationFn: ({ id, data }) =>
            consoleHttpClient.patch<DramaCategory>(`/category/${id}`, data),
        ...options,
    });
}

export function useDeleteCategoryMutation(options?: MutationOptionsUtil<OperationResult, string>) {
    return useMutation<OperationResult, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<OperationResult>(`/category/${id}`),
        ...options,
    });
}

export function useBatchDeleteCategoriesMutation(
    options?: MutationOptionsUtil<OperationResult, string[]>,
) {
    return useMutation<OperationResult, Error, string[]>({
        mutationFn: (ids) =>
            consoleHttpClient.post<OperationResult>("/category/batch-delete", { ids }),
        ...options,
    });
}
