import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * v0.5.0: member groups/rules, admin operation log, mall and novel modules
 */
export class MemberMallNovel implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.member_rule (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                title varchar(64) NOT NULL,
                path varchar(128),
                icon varchar(64),
                sort integer DEFAULT 0,
                status boolean DEFAULT true,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.member_group (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                name varchar(64) NOT NULL,
                rules jsonb DEFAULT '[]'::jsonb,
                status boolean DEFAULT true,
                sort integer DEFAULT 0,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.admin_log (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                admin_id uuid,
                admin_name varchar(64),
                action varchar(64) NOT NULL,
                target varchar(128),
                detail text,
                ip varchar(64),
                created_at timestamp DEFAULT now()
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.mall_category (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                name varchar(64) NOT NULL,
                icon varchar(255),
                language_code varchar(16) DEFAULT 'en',
                all_region boolean DEFAULT false,
                status boolean DEFAULT true,
                sort integer DEFAULT 0,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.mall_goods (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                category_id uuid,
                title varchar(128) NOT NULL,
                subtitle varchar(128),
                cover_image varchar(500),
                images jsonb DEFAULT '[]'::jsonb,
                description text,
                tags varchar(255),
                coin_price integer DEFAULT 0,
                original_coin_price integer DEFAULT 0,
                stock integer DEFAULT 0,
                sales_count integer DEFAULT 0,
                language_code varchar(16) DEFAULT 'en',
                all_region boolean DEFAULT false,
                hot boolean DEFAULT false,
                free_shipping boolean DEFAULT false,
                status boolean DEFAULT true,
                sort integer DEFAULT 0,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.mall_order (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                order_no varchar(40) NOT NULL UNIQUE,
                user_id uuid,
                total_coin integer DEFAULT 0,
                status varchar(24) DEFAULT 'paid',
                logistics_company varchar(64),
                logistics_no varchar(64),
                ship_remark varchar(255),
                address jsonb DEFAULT '{}'::jsonb,
                paid_at timestamp,
                shipped_at timestamp,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.mall_order_item (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                order_id uuid NOT NULL,
                goods_id uuid,
                goods_title varchar(128) NOT NULL,
                sku_specs varchar(128),
                quantity integer DEFAULT 1,
                coin_price integer DEFAULT 0
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.novel_category (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                name varchar(64) NOT NULL,
                sort integer DEFAULT 0,
                status boolean DEFAULT true,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.novel (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                title varchar(128) NOT NULL,
                author varchar(64),
                cover varchar(500),
                category_id uuid,
                description text,
                status boolean DEFAULT true,
                sort integer DEFAULT 0,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.novel_rating (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                novel_id uuid NOT NULL,
                user_id uuid NOT NULL,
                score integer DEFAULT 5,
                created_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.novel_bookshelf (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id uuid NOT NULL,
                novel_id uuid NOT NULL,
                created_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.novel_reading_history (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id uuid NOT NULL,
                novel_id uuid NOT NULL,
                chapter varchar(64),
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.novel_purchase (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id uuid NOT NULL,
                novel_id uuid NOT NULL,
                coins integer DEFAULT 0,
                created_at timestamp DEFAULT now()
            )
        `);

        // seed member rules
        await queryRunner.query(`
            INSERT INTO drama.member_rule (id, title, path, icon, sort, status)
            VALUES
                ('11111111-1111-4111-8111-111111111101', '会员中心', '/pages/user/index', 'user', 100, true),
                ('11111111-1111-4111-8111-111111111102', '我的钱包', '/pages/user/wallet', 'wallet', 90, true),
                ('11111111-1111-4111-8111-111111111103', '积分明细', '/pages/user/points', 'coins', 80, true),
                ('11111111-1111-4111-8111-111111111104', '我的收藏', '/pages/user/favorites', 'heart', 70, true),
                ('11111111-1111-4111-8111-111111111105', '观看历史', '/pages/user/history', 'history', 60, true),
                ('11111111-1111-4111-8111-111111111106', '设置', '/pages/user/settings', 'settings', 50, true)
            ON CONFLICT (id) DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO drama.member_group (id, name, rules, status, sort)
            VALUES (
                '11111111-1111-4111-8111-111111111201',
                '默认会员组',
                '["11111111-1111-4111-8111-111111111101","11111111-1111-4111-8111-111111111102","11111111-1111-4111-8111-111111111103","11111111-1111-4111-8111-111111111104","11111111-1111-4111-8111-111111111105","11111111-1111-4111-8111-111111111106"]'::jsonb,
                true,
                100
            )
            ON CONFLICT (id) DO NOTHING
        `);

        // seed mall demo data
        await queryRunner.query(`
            INSERT INTO drama.mall_category (id, name, icon, language_code, all_region, status, sort)
            VALUES
                ('22222222-2222-4222-8222-222222222201', '周边好物', '', 'en', true, true, 100),
                ('22222222-2222-4222-8222-222222222202', '数字权益', '', 'en', true, true, 90)
            ON CONFLICT (id) DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO drama.mall_goods (id, category_id, title, subtitle, cover_image, images, description, tags, coin_price, original_coin_price, stock, sales_count, language_code, all_region, hot, free_shipping, status, sort)
            VALUES
                ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'Drama 纪念 T 恤', '限量款纯棉短袖', '', '[]'::jsonb, '海外短剧官方周边，纯棉舒适。', 'Hot,Free Ship', 1200, 1800, 100, 0, 'en', true, true, true, true, 100),
                ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', '7 天 VIP 体验卡', '解锁全部剧集', '', '[]'::jsonb, '兑换后立即生效，有效期 7 天。', 'Recommend', 800, 0, 999, 0, 'en', true, false, false, true, 90)
            ON CONFLICT (id) DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO drama.mall_order (id, order_no, user_id, total_coin, status, logistics_company, logistics_no, ship_remark, address, paid_at, shipped_at)
            VALUES (
                '44444444-4444-4444-8444-444444444401',
                'MALL202610290001',
                (SELECT id FROM "user" ORDER BY created_at LIMIT 1),
                1200,
                'paid',
                NULL,
                NULL,
                NULL,
                '{"name":"Demo User","phone":"13800000000","detail":"123 Demo Street, Manila"}'::jsonb,
                now(),
                NULL
            )
            ON CONFLICT (id) DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO drama.mall_order_item (id, order_id, goods_id, goods_title, sku_specs, quantity, coin_price)
            VALUES (
                '44444444-4444-4444-8444-444444444402',
                '44444444-4444-4444-8444-444444444401',
                '33333333-3333-4333-8333-333333333301',
                'Drama 纪念 T 恤',
                '黑色 / M',
                1,
                1200
            )
            ON CONFLICT (id) DO NOTHING
        `);

        // seed novel demo data
        await queryRunner.query(`
            INSERT INTO drama.novel_category (id, name, sort, status)
            VALUES
                ('55555555-5555-4555-8555-555555555501', '都市言情', 100, true),
                ('55555555-5555-4555-8555-555555555502', '悬疑推理', 90, true)
            ON CONFLICT (id) DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO drama.novel (id, title, author, cover, category_id, description, status, sort)
            VALUES
                ('66666666-6666-4666-8666-666666666601', '午夜来电', 'Ava Lin', '', '55555555-5555-4555-8555-555555555502', '一通来自午夜的电话，揭开十年前的秘密。', true, 100),
                ('66666666-6666-4666-8666-666666666602', '契约恋人', 'Mia Chen', '', '55555555-5555-4555-8555-555555555501', '一纸契约，把两个陌生人绑在一起。', true, 90)
            ON CONFLICT (id) DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO drama.novel_rating (id, novel_id, user_id, score)
            VALUES
                ('77777777-7777-4777-8777-777777777701', '66666666-6666-4666-8666-666666666601', (SELECT id FROM "user" ORDER BY created_at LIMIT 1), 5)
            ON CONFLICT (id) DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO drama.novel_bookshelf (id, user_id, novel_id)
            VALUES
                ('77777777-7777-4777-8777-777777777702', (SELECT id FROM "user" ORDER BY created_at LIMIT 1), '66666666-6666-4666-8666-666666666602')
            ON CONFLICT (id) DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO drama.novel_reading_history (id, user_id, novel_id, chapter)
            VALUES
                ('77777777-7777-4777-8777-777777777703', (SELECT id FROM "user" ORDER BY created_at LIMIT 1), '66666666-6666-4666-8666-666666666601', '第 3 章')
            ON CONFLICT (id) DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO drama.novel_purchase (id, user_id, novel_id, coins)
            VALUES
                ('77777777-7777-4777-8777-777777777704', (SELECT id FROM "user" ORDER BY created_at LIMIT 1), '66666666-6666-4666-8666-666666666601', 120)
            ON CONFLICT (id) DO NOTHING
        `);
    }

    async down(): Promise<void> {
        // forward-only
    }
}
