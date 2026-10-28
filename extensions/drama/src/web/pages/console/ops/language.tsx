import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useDeleteLanguageMutation, useLanguageListQuery, useSaveLanguageMutation } from "../../../services";

export default function LanguagePage() {
    useDocumentHead({ title: "语言配置" });
    const { data: languages = [], isLoading, refetch } = useLanguageListQuery();
    const save = useSaveLanguageMutation();
    const remove = useDeleteLanguageMutation();
    const [code, setCode] = useState("");
    const [name, setName] = useState("");

    return (
        <>
            <div className="mb-4 flex items-end gap-3">
                <div className="space-y-1">
                    <Label>语言代码</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="如 ja" className="w-32" />
                </div>
                <div className="space-y-1">
                    <Label>名称</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 日本語" className="w-40" />
                </div>
                <Button
                    onClick={async () => {
                        if (!code.trim() || !name.trim()) {
                            toast.error("请填写代码与名称");
                            return;
                        }
                        await save.mutateAsync({ data: { code: code.trim(), name: name.trim() } });
                        toast.success("已添加");
                        setCode("");
                        setName("");
                        refetch();
                    }}
                    loading={save.isPending}
                >
                    <Plus />
                    新增语言
                </Button>
            </div>

            {isLoading ? (
                <Spinner />
            ) : (
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead>代码</TableHead>
                                <TableHead>名称</TableHead>
                                <TableHead>启用</TableHead>
                                <TableHead className="w-16">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {languages.length > 0 ? (
                                languages.map((l) => (
                                    <TableRow key={l.id}>
                                        <TableCell>
                                            <code className="bg-muted rounded px-1 text-sm">{l.code}</code>
                                        </TableCell>
                                        <TableCell>{l.name}</TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={l.status}
                                                onCheckedChange={async (checked) => {
                                                    await save.mutateAsync({ id: l.id, data: { status: checked } });
                                                    refetch();
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={async () => {
                                                    if (!confirm(`删除语言 ${l.name}？`)) return;
                                                    await remove.mutateAsync(l.id);
                                                    refetch();
                                                }}
                                            >
                                                <Trash className="text-destructive h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        暂无语言，请添加（如 en 英语 / zh 中文 / ja 日语）
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </>
    );
}
