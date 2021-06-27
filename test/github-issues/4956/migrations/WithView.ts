import { MigrationInterface, QueryRunner } from "../../../../src";

export class WithView1623518107000 implements MigrationInterface {
    name = "WithView1623518107000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "CREATE TABLE `foo` (`id` int NOT NULL AUTO_INCREMENT, `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB"
        );
        await queryRunner.query(
            "CREATE VIEW `foo_view` AS  SELECT updated_at FROM `foo`"
        );
        await queryRunner.query(
            "INSERT INTO `typeorm_metadata`(`type`, `schema`, `name`, `value`) VALUES (?, ?, ?, ?)",
            ["VIEW", null, "foo_view", "SELECT `updated_at` FROM `foo`"]
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "DELETE FROM `typeorm_metadata` WHERE `type` = 'VIEW' AND `schema` = ? AND `name` = ?",
            [null, "foo_view"]
        );

        await queryRunner.query("DROP VIEW `foo_view`");
        await queryRunner.query("DROP Table `foo`");
    }
}
