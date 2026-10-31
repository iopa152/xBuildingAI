import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useAdminProfileQuery,
    useUpdateAdminProfileMutation,
} from "../../../services";

export default function ProfilePage() {
    useDocumentHead({ title: "个人资料" });

    const { data: profile, isLoading } = useAdminProfileQuery();
    const update = useUpdateAdminProfileMutation();

    const [form, setForm] = useState({
        nickname: "",
        email: "",
        phone: "",
        avatar: "",
    });

    useEffect(() => {
        if (profile) {
            setForm({
                nickname: profile.nickname ?? "",
                email: profile.email ?? "",
                phone: profile.phone ?? "",
                avatar: profile.avatar ?? "",
            });
        }
    }, [profile]);

    const save = async () => {
        try {
            await update.mutateAsync(form);
            toast.success("保存成功");
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <Spinner className="size-8" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl rounded-md border p-6">
            <div className="mb-6 flex items-center gap-4">
                <ImageUpload
                    value={form.avatar || undefined}
                    onChange={(url) => setForm({ ...form, avatar: url ?? "" })}
                    shape="circle"
                    size="lg"
                />
                <div>
                    <p className="text-lg font-semibold">{profile?.username}</p>
                    <p className="text-muted-foreground text-sm">
                        上次登录：
                        {profile?.lastLoginAt ? (
                            <TimeText value={profile.lastLoginAt} format="YYYY-MM-DD HH:mm:ss" />
                        ) : (
                            "-"
                        )}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-[90px_1fr] items-center gap-x-3 gap-y-[18px]">
                <Label htmlFor="profile-username" className="justify-end font-normal">
                    用户名
                </Label>
                <Input id="profile-username" value={profile?.username ?? ""} disabled />

                <Label htmlFor="profile-nickname" className="justify-end font-normal">
                    昵称
                </Label>
                <Input
                    id="profile-nickname"
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                />

                <Label htmlFor="profile-email" className="justify-end font-normal">
                    邮箱
                </Label>
                <Input
                    id="profile-email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                <Label htmlFor="profile-phone" className="justify-end font-normal">
                    手机号
                </Label>
                <Input
                    id="profile-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />

                <Label htmlFor="profile-created" className="justify-end font-normal">
                    注册时间
                </Label>
                <div
                    id="profile-created"
                    className="border-input bg-muted/50 flex h-9 items-center rounded-md border px-3 text-sm"
                >
                    {profile?.createdAt ? (
                        <TimeText value={profile.createdAt} format="YYYY-MM-DD HH:mm:ss" />
                    ) : (
                        "-"
                    )}
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <Button onClick={save} disabled={update.isPending}>
                    保存资料
                </Button>
            </div>
        </div>
    );
}
