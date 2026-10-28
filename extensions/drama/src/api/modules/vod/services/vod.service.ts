import { createHmac } from "crypto";

import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import { VodConfig } from "../../../db/entities/vod-config.entity";

/**
 * Aliyun VOD integration via signed RPC calls (no SDK):
 * - console saves credentials
 * - web asks for upload credentials (CreateUploadVideo) and uses the
 *   aliyun-upload SDK in the browser with UploadAuth/UploadAddress
 * - playback url resolved through GetPlayInfo (transcoded mp4/m3u8)
 */
@Injectable()
export class VodService extends BaseService<VodConfig> {
    private readonly logger = new Logger(VodService.name);

    constructor(
        @InjectRepository(VodConfig)
        private readonly configRepository: Repository<VodConfig>,
    ) {
        super(configRepository);
    }

    async getConfig(): Promise<VodConfig | null> {
        return this.configRepository.findOne({ where: {}, order: { updatedAt: "DESC" } });
    }

    async saveConfig(dto: Partial<VodConfig>): Promise<VodConfig> {
        const existing = await this.getConfig();
        if (existing) {
            await this.configRepository.update({ id: existing.id }, dto);
            return this.getConfig() as Promise<VodConfig>;
        }
        return this.configRepository.save(this.configRepository.create(dto));
    }

    /**
     * Create upload credentials for the H5 uploader (CreateUploadVideo)
     */
    async createUpload(params: { title: string; fileName: string; userId?: string }) {
        const config = await this.requireEnabledConfig();
        const res = await this.rpcCall(config, {
            Action: "CreateUploadVideo",
            Title: params.title.slice(0, 128),
            FileName: params.fileName.slice(0, 255),
            ...(params.userId ? { UserData: JSON.stringify({ userId: params.userId }) } : {}),
        }).catch((err) => {
            this.logger.error(`CreateUploadVideo failed: ${err.message}`);
            throw HttpErrorFactory.badRequest(`获取上传凭证失败: ${err.message}`);
        });
        return {
            videoId: res.VideoId,
            uploadAddress: res.UploadAddress,
            uploadAuth: res.UploadAuth,
            region: config.region,
        };
    }

    /**
     * Refresh upload credentials for large files (RefreshUploadVideo)
     */
    async refreshUpload(videoId: string) {
        const config = await this.requireEnabledConfig();
        const res = await this.rpcCall(config, {
            Action: "RefreshUploadVideo",
            VideoId: videoId,
        });
        return {
            uploadAddress: res.UploadAddress,
            uploadAuth: res.UploadAuth,
        };
    }

    /**
     * Resolve the playback url of an uploaded & transcoded video (GetPlayInfo)
     */
    async getPlayUrl(videoId: string): Promise<{ url: string | null; status: string }> {
        const config = await this.requireEnabledConfig();
        const res = await this.rpcCall(config, {
            Action: "GetPlayInfo",
            VideoId: videoId,
            Formats: "",
            AuthTimeout: 3600,
        }).catch((err) => {
            this.logger.error(`GetPlayInfo failed: ${err.message}`);
            throw HttpErrorFactory.badRequest(`获取播放地址失败: ${err.message}`);
        });
        const playList = res.PlayInfoList?.PlayInfo ?? [];
        const best = playList.find((p: any) => p.Status === "Normal");
        return {
            url: best?.PlayURL ?? null,
            status: res.VideoBase?.Status ?? "Unknown",
        };
    }

    private async requireEnabledConfig(): Promise<VodConfig> {
        const config = await this.getConfig();
        if (!config?.enabled || !config.accessKeyId || !config.accessKeySecret) {
            throw HttpErrorFactory.badRequest("VOD 点播未启用，请在后台配置");
        }
        return config;
    }

    /**
     * Aliyun RPC API v1 signature:
     * StringToSign = GET&%2F&percentEncode(sorted canonical query + SignatureMethod等)
     * signed with HMAC-SHA1(accessKeySecret + "&")
     */
    private async rpcCall(
        config: VodConfig,
        params: Record<string, string>,
    ): Promise<any> {
        const all: Record<string, string> = {
            AccessKeyId: config.accessKeyId!,
            Action: params.Action,
            Format: "JSON",
            Version: "2017-03-21",
            SignatureMethod: "HMAC-SHA1",
            SignatureNonce: Math.random().toString(36).slice(2) + Date.now(),
            SignatureVersion: "1.0",
            Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
            ...Object.fromEntries(
                Object.entries(params).filter(([k]) => k !== "Action"),
            ),
        };

        const sorted = Object.keys(all).sort();
        const canonical = sorted
            .map((k) => `${percentEncode(k)}=${percentEncode(all[k])}`)
            .join("&");
        const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonical)}`;
        const signature = createHmac("sha1", `${config.accessKeySecret!}&`)
            .update(stringToSign)
            .digest("base64");

        const query = `${canonical}&Signature=${percentEncode(signature)}`;
        const endpoint = `https://vod.${config.region}.aliyuncs.com/?${query}`;
        const response = await fetch(endpoint);
        const data = (await response.json()) as any;
        if (!response.ok || data.Code) {
            throw new Error(data?.Message ?? data?.Code ?? `HTTP ${response.status}`);
        }
        return data;
    }
}

/**
 * Aliyun percent-encode (RFC3986: + → %20, * → %2A, %7E → ~)
 */
function percentEncode(value: string): string {
    return encodeURIComponent(value)
        .replace(/\+/g, "%20")
        .replace(/\*/g, "%2A")
        .replace(/%7E/g, "~");
}
