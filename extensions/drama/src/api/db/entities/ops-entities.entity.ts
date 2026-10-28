import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

/**
 * Drama playlist (剧单): an ordered collection of dramas curated in console
 */
@ExtensionEntity()
export class DramaPlaylist {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 100, comment: "剧单名称" })
    name: string;

    @Column({ type: "varchar", length: 255, nullable: true, comment: "描述" })
    description?: string;

    /**
     * Ordered drama ids
     */
    @Column({ type: "jsonb", default: [], comment: "剧目ID列表(有序)" })
    dramaIds: string[];

    /**
     * Cover of the playlist
     */
    @Column({ type: "varchar", length: 500, nullable: true, comment: "封面" })
    cover?: string;

    @Column({ type: "boolean", default: true, comment: "是否启用" })
    status: boolean;

    @Column({ type: "int", default: 0, comment: "排序(大在前)" })
    sort: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * Drama language config (短剧语言配置): enable/disable content languages
 */
@ExtensionEntity()
@Index("uq_drama_language_code", ["code"], { unique: true })
export class DramaLanguage {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * e.g. en / zh / ja / ko
     */
    @Column({ type: "varchar", length: 16, comment: "语言代码" })
    code: string;

    @Column({ type: "varchar", length: 50, comment: "语言名称" })
    name: string;

    @Column({ type: "boolean", default: true, comment: "是否启用" })
    status: boolean;

    @Column({ type: "int", default: 0, comment: "排序" })
    sort: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * Generic key-value config for the drama extension
 * (checkin rewards, agreements, site strings...)
 */
@ExtensionEntity()
@Index("uq_drama_cfg_key", ["key"], { unique: true })
export class DramaConfig {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 64, comment: "配置键" })
    key: string;

    @Column({ type: "jsonb", nullable: true, comment: "配置值" })
    value?: unknown;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}
