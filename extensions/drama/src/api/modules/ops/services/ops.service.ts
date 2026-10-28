import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import {
    DramaConfig,
    DramaLanguage,
    DramaPlaylist,
} from "../../../db/entities/ops-entities.entity";
import { Drama } from "../../../db/entities/drama.entity";

/**
 * Playlist / language / generic-config / agreement management
 */
@Injectable()
export class OpsService {
    constructor(
        @InjectRepository(DramaPlaylist)
        private readonly playlistRepository: Repository<DramaPlaylist>,
        @InjectRepository(DramaLanguage)
        private readonly languageRepository: Repository<DramaLanguage>,
        @InjectRepository(DramaConfig)
        private readonly configRepository: Repository<DramaConfig>,
        @InjectRepository(Drama)
        private readonly dramaRepository: Repository<Drama>,
    ) {}

    // ---------------- playlists ----------------

    async listPlaylists(): Promise<DramaPlaylist[]> {
        return this.playlistRepository.find({ order: { sort: "DESC", createdAt: "DESC" } });
    }

    /**
     * Playlists with drama cards expanded (web)
     */
    async listPlaylistsWeb() {
        const lists = await this.listPlaylists();
        const allIds = Array.from(new Set(lists.flatMap((l) => l.dramaIds)));
        const dramas = allIds.length
            ? await this.dramaRepository.find({ where: { id: In(allIds) as never } })
            : [];
        const map = new Map(dramas.map((d) => [d.id, d]));
        return lists
            .filter((l) => l.status)
            .map((l) => ({
                id: l.id,
                name: l.name,
                description: l.description,
                cover: l.cover,
                dramas: l.dramaIds.map((id) => map.get(id)).filter(Boolean),
            }));
    }

    async createPlaylist(dto: Partial<DramaPlaylist>) {
        return this.playlistRepository.save(this.playlistRepository.create(dto));
    }

    async updatePlaylist(id: string, dto: Partial<DramaPlaylist>) {
        await this.playlistRepository.update({ id }, dto);
        return this.playlistRepository.findOneBy({ id });
    }

    async deletePlaylist(id: string) {
        await this.playlistRepository.delete({ id });
    }

    // ---------------- languages ----------------

    async listLanguages(): Promise<DramaLanguage[]> {
        return this.languageRepository.find({ order: { sort: "DESC", updatedAt: "DESC" } });
    }

    async listEnabledLanguages(): Promise<DramaLanguage[]> {
        return this.languageRepository.find({ where: { status: true }, order: { sort: "DESC" } });
    }

    async createLanguage(dto: Partial<DramaLanguage>) {
        const existing = await this.languageRepository.findOneBy({ code: dto.code });
        if (existing) {
            throw HttpErrorFactory.badRequest("语言代码已存在");
        }
        return this.languageRepository.save(this.languageRepository.create(dto));
    }

    async updateLanguage(id: string, dto: Partial<DramaLanguage>) {
        await this.languageRepository.update({ id }, dto);
    }

    async deleteLanguage(id: string) {
        await this.languageRepository.delete({ id });
    }

    // ---------------- generic config ----------------

    async getConfig(key: string) {
        const row = await this.configRepository.findOneBy({ key });
        return row?.value ?? null;
    }

    async setConfig(key: string, value: unknown) {
        await this.configRepository
            .insert({ key, value })
            .catch((err) => {
                if ((err as { code?: string }).code !== "23505") throw err;
            });
        await this.configRepository.update({ key }, { value });
        return { success: true };
    }

    /**
     * Checkin rewards config (7-day cycle), seeded default
     */
    async getCheckinConfig(): Promise<number[]> {
        const value = await this.getConfig("checkin_rewards");
        return Array.isArray(value) && value.length === 7 ? (value as number[]) : [10, 20, 30, 40, 50, 80, 150];
    }

    // ---------------- agreements ----------------

    async listAgreements() {
        const value = await this.getConfig("agreements");
        return Array.isArray(value) ? value : [];
    }

    async saveAgreement(agree: {
        type: string;
        title: string;
        content: string;
    }) {
        const list = (await this.listAgreements()) as {
            type: string;
            title: string;
            content: string;
        }[];
        const idx = list.findIndex((a) => a.type === agree.type);
        if (idx >= 0) {
            list[idx] = agree;
        } else {
            list.push(agree);
        }
        await this.setConfig("agreements", list);
        return { success: true };
    }
}
