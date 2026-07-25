import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSchoolModes1784900000000 implements MigrationInterface {
    name = 'AddSchoolModes1784900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create school_modes table
        await queryRunner.query(`
            CREATE TABLE "school_modes" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" integer,
                "updated_at" TIMESTAMP DEFAULT now(),
                "updated_by" integer,
                "deleted_at" TIMESTAMP,
                "deleted_by" integer,
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "description" text,
                "students_limit" integer NOT NULL DEFAULT 0,
                "violation_type_limit" integer NOT NULL DEFAULT 0,
                "violation_limit" integer NOT NULL DEFAULT 0,
                "classes_limit" integer NOT NULL DEFAULT 0,
                "user_limit" integer NOT NULL DEFAULT 0,
                "is_demo" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_school_modes_name" UNIQUE ("name"),
                CONSTRAINT "PK_school_modes_id" PRIMARY KEY ("id")
            )
        `);

        // 2. Add mode_id column to schools table
        await queryRunner.query(`
            ALTER TABLE "schools" ADD COLUMN "mode_id" integer
        `);

        // 3. Establish foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "schools" 
            ADD CONSTRAINT "FK_schools_mode_id" 
            FOREIGN KEY ("mode_id") 
            REFERENCES "school_modes"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // 4. Seed default modes
        await queryRunner.query(`
            INSERT INTO "school_modes" ("name", "description", "students_limit", "violation_type_limit", "violation_limit", "classes_limit", "user_limit", "is_demo")
            VALUES 
            ('Demo', 'Demo mode with limited capacity', 10, 10, 100, 5, 5, true),
            ('Normal', 'Normal school tier with standard capacity', 500, 50, 5000, 30, 20, false),
            ('Expert', 'Expert tier with unlimited capacity', 999999, 999999, 999999, 999999, 999999, false)
        `);

        // 5. Update existing schools to use correct mode_id
        await queryRunner.query(`
            UPDATE "schools" 
            SET "mode_id" = (SELECT "id" FROM "school_modes" WHERE "name" = 'Demo') 
            WHERE "is_demo" = true
        `);
        await queryRunner.query(`
            UPDATE "schools" 
            SET "mode_id" = (SELECT "id" FROM "school_modes" WHERE "name" = 'Normal') 
            WHERE "is_demo" = false OR "is_demo" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "schools" DROP CONSTRAINT "FK_schools_mode_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "schools" DROP COLUMN "mode_id"
        `);
        await queryRunner.query(`
            DROP TABLE "school_modes"
        `);
    }
}
