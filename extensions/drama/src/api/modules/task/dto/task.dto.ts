import { TaskType } from "../../../db/entities/task-entities.entity";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Length,
    Max,
    Min,
} from "class-validator";

export class CreateTaskConfigDto {
    @IsString()
    @Length(2, 50)
    code!: string;

    @IsString()
    @Length(1, 100)
    name!: string;

    @IsEnum(TaskType)
    type!: TaskType;

    @IsInt()
    @Min(1)
    @IsOptional()
    target?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    reward?: number;

    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @IsInt()
    @Min(0)
    @Max(9999)
    @IsOptional()
    sort?: number;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateTaskConfigDto {
    @IsString()
    @Length(1, 100)
    @IsOptional()
    name?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    target?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    reward?: number;

    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @IsInt()
    @Min(0)
    @Max(9999)
    @IsOptional()
    sort?: number;

    @IsString()
    @IsOptional()
    description?: string;
}
