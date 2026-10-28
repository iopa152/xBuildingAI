import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { In, Like, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { Banner } from "../../../db/entities/banner.entity";
import { CreateBannerDto, QueryBannerDto, UpdateBannerDto } from "../dto";

/**
 * Banner service (console + web)
 */
@Injectable()
export class BannerService extends BaseService<Banner> {
    constructor(
        @InjectRepository(Banner) private readonly bannerRepository: Repository<Banner>,
    ) {
        super(bannerRepository);
    }

    async createBanner(dto: CreateBannerDto): Promise<Partial<Banner>> {
        return super.create(dto);
    }

    async list(dto: QueryBannerDto): Promise<Banner[]> {
        return this.bannerRepository.find({
            where: dto.title ? { title: Like(`%${dto.title}%`) } : {},
            order: { sort: "DESC", createdAt: "DESC" },
        });
    }

    /**
     * Banners visible on H5 home: enabled and inside display window
     */
    async listVisible(): Promise<Banner[]> {
        const now = new Date();
        const banners = await this.bannerRepository.find({
            where: { status: true },
            order: { sort: "DESC", createdAt: "DESC" },
        });
        return banners.filter((b) => {
            if (b.startTime && b.startTime > now) return false;
            if (b.endTime && b.endTime < now) return false;
            return true;
        });
    }

    async updateBannerById(id: string, dto: UpdateBannerDto) {
        const banner = await this.findOneById(id);
        if (!banner) {
            throw HttpErrorFactory.notFound("轮播图不存在");
        }
        return this.bannerRepository.save({ ...banner, ...dto });
    }

    async delete(id: string) {
        await this.bannerRepository.delete(id);
    }

    async batchDelete(ids: string[]) {
        await this.bannerRepository.delete({ id: In(ids) });
    }
}
