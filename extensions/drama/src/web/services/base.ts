import { createPluginHttpClients } from "@buildingai/services";

const { apiHttpClient, consoleHttpClient } = createPluginHttpClients();

export function resolveAssetUrl(url?: string | null) {
    if (!url) return url ?? undefined;
    if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) return url;
    return `/${url.replace(/^\/+/, "")}`;
}

export { apiHttpClient, consoleHttpClient };
