import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeOnImage1784522301196 implements MigrationInterface {
    name = 'AddCascadeOnImage1784522301196'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "images" DROP CONSTRAINT "FK_2f4af0bd6f628e0443fc4c21529"`);
        await queryRunner.query(`ALTER TABLE "images" ADD CONSTRAINT "FK_2f4af0bd6f628e0443fc4c21529" FOREIGN KEY ("image_link_id") REFERENCES "image_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "images" DROP CONSTRAINT "FK_2f4af0bd6f628e0443fc4c21529"`);
        await queryRunner.query(`ALTER TABLE "images" ADD CONSTRAINT "FK_2f4af0bd6f628e0443fc4c21529" FOREIGN KEY ("image_link_id") REFERENCES "image_links"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
