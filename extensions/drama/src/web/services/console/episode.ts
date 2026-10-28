import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";
import type { BatchCreateEpisodesParams, Episode, OperationResult, SaveEpisodeParams } from "../types";

export function useEpisodeListQuery(dramaId: string, options?: QueryOptionsUtil<Episode[]>) {
    return useQuery({
        queryKey: ["drama-episode", "list", dramaId],
        queryFn: () =>
            consoleHttpClient.get<Episode[]>("/episode", { params: { dramaId } }),
        enabled: !!dramaId && options?.enabled !== false,
        ...options,
    });
}

export function useSaveEpisodeMutation(
    options?: MutationOptionsUtil<Partial<Episode>, SaveEpisodeParams>,
) {
    return useMutation<Partial<Episode>, Error, SaveEpisodeParams>({
        mutationFn: (data) => consoleHttpClient.post<Partial<Episode>>("/episode", data),
        ...options,
    });
}

export function useBatchCreateEpisodesMutation(
    options?: MutationOptionsUtil<Partial<Episode>[], BatchCreateEpisodesParams>,
) {
    return useMutation<Partial<Episode>[], Error, BatchCreateEpisodesParams>({
        mutationFn: (data) =>
            consoleHttpClient.post<Partial<Episode>[]("/episode/batch-create", data),
        ...options,
    });
}

export function useBatchEpisodePriceMutation(
    options?: MutationOptionsUtil<OperationResult, { ids: string[]; coinPrice: number }>,
) {
    return useMutation<OperationResult, Error, { ids: string[]; coinPrice: number }>({
        mutationFn: ({ ids, coinPrice }) =>
            consoleHttpClient.post<OperationResult>("/episode/batch-price", { ids, coinPrice }),
        ...options,
    });
}

export function useDeleteEpisodeMutation(options?: MutationOptionsUtil<OperationResult, string>) {
    return useMutation<OperationResult, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<OperationResult>(`/episode/${id}`),
        ...options,
    });
}
