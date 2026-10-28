import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    ManyToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

import { Drama } from "./drama.entity";

/**
 * Short drama category
 */
@ExtensionEntity()
export class DramaCategory {
    /**
     * Category ID (uuid)
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Category name, e.g. Romance / CEO / Werewolf
     */
    @Column({ length: 100, comment: "分类名称" })
    name: string;

    /**
     * Category code (slug) for H5 routing / filtering
     */
    @Column({ length: 100, comment: "分类标识" })
    code: string;

    /**
     * Language code this category belongs to, e.g. en / zh / ja
     */
    @Column({ length: 16, default: "en", comment: "所属语言" })
    language: string;

    /**
     * Category icon url
     */
    @Column({ type: "varchar", length: 255, nullable: true, comment: "分类图标" })
    icon?: string;

    /**
     * Description
     */
    @Column({ type: "text", nullable: true, comment: "分类描述" })
    description?: string;

    /**
     * Sort order, larger first
     */
    @Column({ type: "int", default: 0, comment: "排序(大在前)" })
    sort: number;

    /**
     * Enabled or not
     */
    @Column({ type: "boolean", default: true, comment: "是否启用" })
    status: boolean;

    /**
     * Drama count (denormalized)
     */
    @Column({ type: "int", default: 0, comment: "剧目数量" })
    dramaCount: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;

    /**
     * Dramas under this category
     */
    @ManyToMany(() => Drama, (drama) => drama.categories)
    dramas?: Drama[];
}
