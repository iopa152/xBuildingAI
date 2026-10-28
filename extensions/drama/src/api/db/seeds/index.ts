import { Factory, Seeder } from "typeorm-seeding";
import { DataSource } from "typeorm";

import { TaskConfig, TaskType } from "../../db/entities/task-entities.entity";

/**
 * Default task configs seeded on install/upgrade
 */
const DEFAULT_TASKS = [
    {
        code: "daily_watch",
        name: "每日观剧",
        type: TaskType.DAILY,
        target: 3,
        reward: 20,
        sort: 100,
        description: "每天观看 3 集短剧",
    },
    {
        code: "daily_like",
        name: "每日点赞",
        type: TaskType.DAILY,
        target: 1,
        reward: 5,
        sort: 90,
        description: "每天点赞 1 次",
    },
];

export default class CreateDefaultTasks implements Seeder {
    public async run(factory: Factory, connection: DataSource): Promise<void> {
        const repo = connection.getRepository(TaskConfig);
        for (const task of DEFAULT_TASKS) {
            const existing = await repo.findOneBy({ code: task.code });
            if (!existing) {
                await repo.save(repo.create(task));
            }
        }
    }
}
