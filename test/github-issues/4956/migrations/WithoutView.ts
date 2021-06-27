import { MigrationInterface, QueryRunner } from "../../../../src";

export class WithoutView1623518107000 implements MigrationInterface {
    name = "WithoutView1623518107000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "CREATE TABLE `foo` (`id` int NOT NULL AUTO_INCREMENT, `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP Table `foo`");
    }
}
