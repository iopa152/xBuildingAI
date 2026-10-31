import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// ---------------- 配置中心 ----------------

export interface ConfigCardSummary {
    category: string;
    label: string;
    providerCount: number;
    configuredCount: number;
    currentProvider: string | null;
    configured: boolean;
}

export interface ProviderConfigRow {
    provider: string;
    enabled: boolean;
    config: Record<string, unknown>;
    remark: string;
    verified: boolean;
    configured: boolean;
}

export function useConfigSummaryQuery() {
    return useQuery({
        queryKey: ["drama-config-center", "summary"],
        queryFn: () =>
            consoleHttpClient.get<ConfigCardSummary[]>("/config-center"),
    });
}

export function useCategoryConfigsQuery(category: string | undefined) {
    return useQuery({
        queryKey: ["drama-config-center", "category", category],
        queryFn: () =>
            consoleHttpClient.get<ProviderConfigRow[]>(`/config-center/${category}`),
        enabled: !!category,
    });
}

export function useSaveProviderConfigMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: {
            category: string;
            provider: string;
            data: { enabled?: boolean; config?: Record<string, unknown>; remark?: string };
        }) =>
            consoleHttpClient.put<ProviderConfigRow>(
                `/config-center/${vars.category}/${vars.provider}`,
                vars.data,
            ),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: ["drama-config-center"] });
        },
    });
}

export function useTestConnectionMutation() {
    return useMutation({
        mutationFn: (vars: { category: string; provider: string }) =>
            consoleHttpClient.post<{ ok: boolean; message: string }>(
                `/config-center/${vars.category}/${vars.provider}/test`,
                {},
            ),
    });
}

export function useComputeHeatMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            consoleHttpClient.post<{ updated: number }>("/config-center/heat/compute", {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-config-center"] }),
    });
}

export function useExportConfigsMutation() {
    return useMutation({
        mutationFn: () =>
            consoleHttpClient.get<
                { category: string; provider: string; enabled: boolean; config: Record<string, unknown>; remark: string }[]
            >("/config-center/export/all"),
    });
}

export function useImportConfigsMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (
            rows: {
                category: string;
                provider: string;
                enabled?: boolean;
                config?: Record<string, unknown>;
                remark?: string;
            }[],
        ) => consoleHttpClient.post<{ imported: number }>("/config-center/import/all", { rows }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["drama-config-center"] }),
    });
}
