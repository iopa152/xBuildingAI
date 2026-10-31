import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { In, Like, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { DramaCategory } from "../../../db/entities/drama-category.entity";
import { CreateDramaCategoryDto, QueryDramaCategoryDto, UpdateDramaCategoryDto } from "../dto";

/**
 * Drama category service (console + web)
 */
@Injectable()
export class CategoryService extends BaseService<DramaCategory> {
    constructor(
        @InjectRepository(DramaCategory)
        private readonly categoryRepository: Repository<DramaCategory>,
    ) {
        super(categoryRepository);
    }

    /**
     * Create a category
     */
    async createCategory(dto: CreateDramaCategoryDto): Promise<Partial<DramaCategory>> {
        const existing = await this.categoryRepository.findOne({
            where: { code: dto.code },
        });
        if (existing) {
            throw HttpErrorFactory.badRequest("相同标识的分类已存在");
        }
        return super.create({ ...dto, language: dto.language ?? "en" });
    }

    /**
     * Query categories (console)
     */
    async list(dto: QueryDramaCategoryDto): Promise<DramaCategory[]> {
        const keyword = dto.keyword?.trim();
        if (keyword) {
            const pattern = `%${keyword}%`;
            return this.categoryRepository.find({
                where: [
                    { name: Like(pattern) },
                    { code: Like(pattern) },
                    { language: Like(pattern) },
                ],
                order: { sort: "DESC", createdAt: "DESC" },
            });
        }
        return this.categoryRepository.find({
            where: {
                ...(dto.name ? { name: Like(`%${dto.name}%`) } : {}),
                ...(dto.language ? { language: dto.language } : {}),
            },
            order: { sort: "DESC", createdAt: "DESC" },
        });
    }

    /**
     * Enabled categories for H5 (web)
     */
    async listEnabled(language?: string): Promise<DramaCategory[]> {
        return this.categoryRepository.find({
            where: {
                status: true,
                ...(language ? { language } : {}),
            },
            order: { sort: "DESC", createdAt: "DESC" },
        });
    }

    /**
     * Update a category
     */
    async updateCategoryById(id: string, dto: UpdateDramaCategoryDto) {
        const category = await this.findOneById(id);
        if (!category) {
            throw HttpErrorFactory.notFound("分类不存在");
        }
        return this.categoryRepository.save({ ...category, ...dto });
    }

    /**
     * Delete categories, keeping denormalized counts consistent elsewhere
     */
    async delete(id: string) {
        await this.categoryRepository.delete(id);
    }

    async batchDelete(ids: string[]) {
        await this.categoryRepository.delete({ id: In(ids) });
    }
}
