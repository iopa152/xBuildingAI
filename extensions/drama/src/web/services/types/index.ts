import type { BannerLinkType } from "../../../api/db/entities/banner.entity";
import type { DramaStatus } from "../../../api/db/entities/drama.entity";

export type { BannerLinkType, DramaStatus };

/**
 * Drama category
 */
export interface DramaCategory {
    id: string;
    name: string;
    code: string;
    language: string;
    icon?: string;
    description?: string;
    sort: number;
    status: boolean;
    dramaCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCategoryParams {
    name: string;
    code: string;
    language?: string;
    icon?: string;
    description?: string;
    sort?: number;
    status?: boolean;
}

export type UpdateCategoryParams = Partial<CreateCategoryParams>;

/**
 * Drama
 */
export interface Drama {
    id: string;
    title: string;
    description?: string;
    language: string;
    coverVertical?: string;
    coverHorizontal?: string;
    status: DramaStatus | string;
    complete: boolean;
    featured: boolean;
    episodeCount: number;
    wholePrice: number;
    heat: number;
    viewCount: number;
    likeCount: number;
    favoriteCount: number;
    sort: number;
    categories?: DramaCategory[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateDramaParams {
    title: string;
    description?: string;
    language?: string;
    coverVertical?: string;
    coverHorizontal?: string;
    status?: DramaStatus;
    complete?: boolean;
    featured?: boolean;
    wholePrice?: number;
    heat?: number;
    sort?: number;
    categoryIds?: string[];
}

export type UpdateDramaParams = Partial<CreateDramaParams>;

export interface QueryDramaParams {
    page?: number;
    pageSize?: number;
    title?: string;
    status?: DramaStatus;
    complete?: boolean;
    featured?: boolean;
    language?: string;
    categoryId?: string;
    order?: string;
}

/**
 * Episode
 */
export interface Episode {
    id: string;
    dramaId?: string;
    episodeNo: number;
    title?: string;
    videoUrl: string;
    duration: number;
    coinPrice: number;
    isFree: boolean;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface SaveEpisodeParams {
    dramaId: string;
    episodeNo: number;
    title?: string;
    videoUrl: string;
    duration?: number;
    coinPrice?: number;
    isFree?: boolean;
}

export interface BatchCreateEpisodesParams {
    dramaId: string;
    startNo?: number;
    defaultCoinPrice?: number;
    defaultFree?: boolean;
    items: { videoUrl: string; title?: string; duration?: number }[];
}

/**
 * Banner
 */
export interface Banner {
    id: string;
    title: string;
    image: string;
    linkType: BannerLinkType | string;
    dramaId?: string;
    url?: string;
    sort: number;
    status: boolean;
    startTime?: string;
    endTime?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBannerParams {
    title: string;
    image: string;
    linkType?: BannerLinkType;
    dramaId?: string;
    url?: string;
    sort?: number;
    status?: boolean;
    startTime?: string;
    endTime?: string;
}

export type UpdateBannerParams = Partial<CreateBannerParams>;

export interface OperationResult {
    success: boolean;
    message: string;
}

// ---------------- unlock / task / promotion ----------------

export interface UnlockRecord {
    id: string;
    userId: string;
    dramaId: string;
    episodeId?: string;
    type: string;
    coins: number;
    createdAt: string;
}

export interface Comment {
    id: string;
    userId: string;
    dramaId: string;
    episodeId?: string;
    parentId?: string;
    content: string;
    status: string;
    likeCount: number;
    createdAt: string;
}

export interface TaskConfig {
    id: string;
    code: string;
    name: string;
    type: string;
    target: number;
    reward: number;
    status: boolean;
    sort: number;
    description?: string;
}

export interface PricePanelTier {
    type?: "vip" | "coin";
    name?: string;
    vipType?: string;
    days?: number;
    coins?: number;
    bonusCoins?: number;
    price: number;
    originalPrice?: number;
    phpPrice?: number;
    phpOriginalPrice?: number;
    badge?: string;
    sort?: number;
    description?: string;
    status?: boolean;
    currency?: string;
}

export interface PricePanel {
    id: string;
    name: string;
    tiers: PricePanelTier[];
    status: boolean;
    createdAt?: string;
}

export type PromoLinkStatus = "active" | "paused" | "archived";

export interface PromoLink {
    id: string;
    code: string;
    name: string;
    remark?: string;
    creator?: string;
    capiEnabled?: boolean;
    panelId?: string;
    pixelId?: string;
    dramaId?: string;
    episodeId?: string;
    landing: string;
    budget?: number;
    clicks: number;
    status: PromoLinkStatus | string;
    createdAt?: string;
}

export interface ClickLog {
    id: string;
    linkId: string;
    userId?: string;
    campaignId?: string;
    adId?: string;
    fbclid?: string;
    platform?: string;
    isRealAd?: boolean;
    ip?: string;
    userAgent?: string;
    createdAt: string;
}

export interface Pixel {
    id: string;
    name: string;
    pixelId: string;
    platform: string;
    accessToken?: string | null;
    status: boolean;
    createdAt?: string;
}

export interface CapiEvent {
    id: string;
    pixelId: string;
    linkId?: string;
    eventName: string;
    eventId: string;
    userId?: string;
    status: string;
    response?: string;
    requestBody?: string;
    responseCode?: string;
    eventsReceived?: number;
    errorMessage?: string;
    retryCount?: number;
    createdAt: string;
}
