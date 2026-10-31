import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCheckinConfigQuery, useSaveCheckinConfigMutation } from "../../../services";

const DAY_LABELS = ["第1天", "第2天", "第3天", "第4天", "第5天", "第6天", "第7天"];

export default function CheckinConfigPage() {
    useDocumentHead({ title: "签到配置" });

    const { data, isLoading } = useCheckinConfigQuery();
    const save = useSaveCheckinConfigMutation();
    const [rewards, setRewards] = useState<string[]>(Array(7).fill("0"));

    useEffect(() => {
        if (Array.isArray(data) && data.length === 7) {
            setRewards(data.map((v) => String(v)));
        }
    }, [data]);

    const updateAt = (index: number, value: string) => {
        setRewards((prev) => prev.map((v, i) => (i === index ? value : v)));
    };

    const submit = async () => {
        const values = rewards.map((v) => Math.max(0, Math.floor(Number(v) || 0)));
        try {
            await save.mutateAsync(values);
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
        <div className="max-w-2xl space-y-4">
            <p className="text-muted-foreground text-sm">
                签到奖励按 7 天循环发放，第 7 天后重新从第 1 天开始。
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {rewards.map((value, index) => (
                    <div key={index} className="space-y-1.5">
                        <Label>{DAY_LABELS[index]}</Label>
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                min={0}
                                value={value}
                                onChange={(e) => updateAt(index, e.target.value)}
                            />
                            <span className="text-muted-foreground text-xs">金币</span>
                        </div>
                    </div>
                ))}
            </div>
            <Button onClick={submit} loading={save.isPending}>
                <Save />
                保存配置
            </Button>
        </div>
    );
}
