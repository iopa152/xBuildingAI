import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { DramaCategory } from "../../db/entities/drama-category.entity";
import { CategoryController } from "./controllers/console/category.controller";
import { CategoryWebController } from "./controllers/web/category.web.controller";
import { CategoryService } from "./services/category.service";

@Module({
    imports: [TypeOrmModule.forFeature([DramaCategory])],
    controllers: [CategoryController, CategoryWebController],
    providers: [CategoryService],
    exports: [CategoryService],
})
export class CategoryModule {}
