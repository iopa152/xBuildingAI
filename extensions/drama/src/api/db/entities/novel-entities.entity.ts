import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, CreateDateColumn, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@ExtensionEntity()
export class NovelCategory {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 64, comment: "分类名称" })
    name: string;

    @Column({ type: "int", default: 0, comment: "排序" })
    sort: number;

    @Column({ type: "boolean", default: true, comment: "状态" })
    status: boolean;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

@ExtensionEntity()
export class Novel {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 128, comment: "小说标题" })
    title: string;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "作者" })
    author?: string;

    @Column({ type: "varchar", length: 500, nullable: true, comment: "封面" })
    cover?: string;

    @Column({ type: "uuid", nullable: true, comment: "分类" })
    categoryId?: string;

    @Column({ type: "text", nullable: true, comment: "简介" })
    description?: string;

    @Column({ type: "varchar", length: 16, default: "连载中", comment: "标签(连载中/已完结)" })
    tag?: string;

    /** free | whole | chapter */
    @Column({ type: "varchar", length: 16, default: "free", comment: "收费模式" })
    priceType?: string;

    @Column({ type: "int", default: 0, comment: "整本价格(金币)" })
    coinPrice: number;

    @Column({ type: "int", default: 0, comment: "章节价格(金币)" })
    chapterCoinPrice: number;

    @Column({ type: "int", default: 0, comment: "章节数" })
    chapterCount: number;

    @Column({ type: "int", default: 0, comment: "总字数" })
    wordCount: number;

    @Column({ type: "int", default: 0, comment: "阅读量" })
    viewCount: number;

    @Column({ type: "int", default: 0, comment: "销量" })
    saleCount: number;

    @Column({ type: "decimal", precision: 3, scale: 1, default: 0, comment: "评分均值" })
    ratingAvg: number;

    @Column({ type: "int", default: 0, comment: "评分人数" })
    ratingCount: number;

    @Column({ type: "boolean", default: true, comment: "上架" })
    status: boolean;

    @Column({ type: "int", default: 0, comment: "排序" })
    sort: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

@ExtensionEntity()
@Index("uq_novel_chapter", ["novelId", "chapterNo"], { unique: true })
export class NovelChapter {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "小说ID" })
    novelId: string;

    @Column({ type: "int", comment: "章节号" })
    chapterNo: number;

    @Column({ type: "varchar", length: 128, comment: "章节标题" })
    title: string;

    @Column({ type: "text", default: "", comment: "正文" })
    content: string;

    @Column({ type: "boolean", default: true, comment: "是否免费" })
    isFree: boolean;

    @Column({ type: "int", default: 0, comment: "本章价格(金币)" })
    coinPrice: number;

    @Column({ type: "int", default: 0, comment: "字数" })
    wordCount: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

@ExtensionEntity()
export class NovelRating {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "小说ID" })
    novelId: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "int", default: 5, comment: "评分 1-5" })
    score: number;

    @CreateDateColumn({ comment: "评分时间" })
    createdAt: Date;
}

@ExtensionEntity()
export class NovelBookshelf {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "小说ID" })
    novelId: string;

    @CreateDateColumn({ comment: "加入时间" })
    createdAt: Date;
}

@ExtensionEntity()
export class NovelReadingHistory {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "小说ID" })
    novelId: string;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "章节" })
    chapter?: string;

    @CreateDateColumn({ comment: "阅读时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

@ExtensionEntity()
@Index("uq_novel_purchase_chapter", ["userId", "novelId", "chapterId"], { unique: true })
@Index("uq_novel_purchase_whole", ["userId", "novelId"], {
    unique: true,
    where: `chapter_id IS NULL`,
})
export class NovelPurchase {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "小说ID" })
    novelId: string;

    /** null = whole-book purchase */
    @Column({ type: "uuid", nullable: true, comment: "章节ID(整本购买为空)" })
    chapterId?: string | null;

    @Column({ type: "int", default: 0, comment: "花费金币" })
    coins: number;

    @CreateDateColumn({ comment: "购买时间" })
    createdAt: Date;
}
