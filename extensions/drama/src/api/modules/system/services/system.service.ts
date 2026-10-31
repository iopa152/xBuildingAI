import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User as UserEntity } from "@buildingai/db/entities";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { AdminLog } from "../../../db/entities/member-entities.entity";

@Injectable()
export class SystemService {
    constructor(
        @InjectRepository(AdminLog)
        private readonly adminLogRepository: Repository<AdminLog>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        private readonly dataSource: DataSource,
    ) {}

    async listFiles(query: { page?: number; pageSize?: number; keyword?: string }) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 20, 100));
        const params: unknown[] = [];
        let whereSql = "1=1";
        if (query.keyword?.trim()) {
            params.push(`%${query.keyword.trim()}%`);
            whereSql = `(f.original_name ILIKE $1 OR f.mime_type ILIKE $1)`;
        }
        const rows = await this.dataSource.query(
            `SELECT f.*, u.username AS uploader_name
               FROM file f
               LEFT JOIN "user" u ON u.id = f.uploader_id
              WHERE ${whereSql}
              ORDER BY f.created_at DESC
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, pageSize, (page - 1) * pageSize],
        );
        const count = await this.dataSource.query(
            `SELECT COUNT(*)::int AS total FROM file f WHERE ${whereSql}`,
            params,
        );
        return {
            items: rows.map((r: Record<string, unknown>) => ({
                id: r.id,
                originalName: r.original_name,
                storageName: r.storage_name,
                mimeType: r.mime_type,
                size: Number(r.size ?? 0),
                path: r.path,
                url: r.url,
                uploaderId: r.uploader_id,
                uploaderName: r.uploader_name ?? "",
                createdAt: r.created_at,
            })),
            total: count[0]?.total ?? 0,
            page,
            pageSize,
        };
    }

    async deleteFile(id: string) {
        await this.dataSource.query(`DELETE FROM file WHERE id = $1::uuid`, [id]);
        return { success: true };
    }

    async listAdminLogs(query: { page?: number; pageSize?: number }) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 20, 100));
        const [items, total] = await this.adminLogRepository.findAndCount({
            order: { createdAt: "DESC" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return { items, total, page, pageSize };
    }

    async getProfile(userId: string) {
        const user = await this.userRepository
            .createQueryBuilder("u")
            .select([
                "u.id",
                "u.username",
                "u.nickname",
                "u.avatar",
                "u.email",
                "u.phone",
                "u.phoneAreaCode",
                "u.lastLoginAt",
                "u.createdAt",
            ])
            .where("u.id = :id", { id: userId })
            .getOne();
        if (!user) throw HttpErrorFactory.notFound("管理员不存在");
        return user;
    }

    async updateProfile(
        userId: string,
        dto: { nickname?: string; email?: string; phone?: string; avatar?: string },
    ) {
        await this.userRepository.update(
            { id: userId },
            {
                nickname: dto.nickname?.trim() || undefined,
                email: dto.email?.trim() || undefined,
                phone: dto.phone?.trim() || undefined,
                avatar: dto.avatar || undefined,
            },
        );
        return { success: true };
    }
}
