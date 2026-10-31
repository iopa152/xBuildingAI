import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * H5 member-center menu rule, referenced by member groups.
 */
@ExtensionEntity()
export class MemberRule {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 64, comment: "规则标题" })
    title: string;

    @Column({ type: "varchar", length: 128, nullable: true, comment: "路由/标识" })
    path?: string;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "图标" })
    icon?: string;

    @Column({ type: "int", default: 0, comment: "排序" })
    sort: number;

    @Column({ type: "boolean", default: true, comment: "是否启用" })
    status: boolean;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * Member group with a set of visible member-center rules.
 */
@ExtensionEntity()
export class MemberGroup {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 64, comment: "组别名称" })
    name: string;

    /**
     * MemberRule ids granted to this group
     */
    @Column({ type: "jsonb", default: () => "'[]'", comment: "权限规则ID" })
    rules: string[];

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
 * Lightweight audit trail for console operations performed in this extension.
 */
@ExtensionEntity()
export class AdminLog {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", nullable: true, comment: "管理员ID" })
    adminId?: string;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "管理员用户名" })
    adminName?: string;

    @Column({ type: "varchar", length: 64, comment: "操作动作" })
    action: string;

    @Column({ type: "varchar", length: 128, nullable: true, comment: "操作对象" })
    target?: string;

    @Column({ type: "text", nullable: true, comment: "详情" })
    detail?: string;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "操作IP" })
    ip?: string;

    @CreateDateColumn({ comment: "操作时间" })
    createdAt: Date;
}
