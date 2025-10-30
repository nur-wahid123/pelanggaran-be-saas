import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoggerTable1761824178434 implements MigrationInterface {
    name = 'AddLoggerTable1761824178434'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "loggers" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" integer, "updated_at" TIMESTAMP DEFAULT now(), "updated_by" integer, "deleted_at" TIMESTAMP, "deleted_by" integer, "id" SERIAL NOT NULL, "message" character varying NOT NULL, "date" TIMESTAMP NOT NULL, "metadata" jsonb, "log_type" character varying(64) NOT NULL, "user_id" integer, CONSTRAINT "PK_29e8f8af58645b7a782e3694a1a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "loggers" ADD CONSTRAINT "FK_13849a49640d6a5834c2e766906" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loggers" DROP CONSTRAINT "FK_13849a49640d6a5834c2e766906"`);
        await queryRunner.query(`DROP TABLE "loggers"`);
    }

}
