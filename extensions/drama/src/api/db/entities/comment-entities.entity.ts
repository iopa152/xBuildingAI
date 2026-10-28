import { ExtensionEntity } from "@buildingai/core/decorators";
import { User } from "@buildingai/db/entities";
import {
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";

import { Drama } from "./drama.entity";

/**
 * Comment publish status
 */
export enum CommentStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
}

/**
 * Drama comment (optionally a reply to another comment)
 */
@ExtensionEntity()
export class Comment {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "剧目ID" })
    dramaId: string;

    /**
     * Optional episode scope
     */
    @Column({ type: "uuid", nullable: true, comment: "剧集ID" })
    episodeId?: string;

    /**
     * Parent comment id for replies
     */
    @Column({ type: "uuid", nullable: true, comment: "父评论ID" })
    parentId?: string;

    @Column({ type: "varchar", length: 1000, comment: "评论内容" })
    content: string;

    @Column({
        type: "varchar",
        length: 20,
        default: CommentStatus.APPROVED,
        comment: "状态 pending/approved/rejected",
    })
    status: CommentStatus | string;

    @Column({ type: "int", default: 0, comment: "点赞数" })
    likeCount: number;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    user?: User;

    @ManyToOne(() => Drama, { onDelete: "CASCADE" })
    drama?: Drama;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/**
 * User 1-5 star rating of a drama (one per user)
 */
@ExtensionEntity()
@Index("uq_rating_user_drama", ["userId", "dramaId"], { unique: true })
export class Rating {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "剧目ID" })
    dramaId: string;

    @Column({ type: "int", comment: "星级 1-5" })
    stars: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}
