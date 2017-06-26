import {MigrationInterface} from "../../../../src/migration/MigrationInterface";
import {Connection} from "../../../../src/connection/Connection";
import {QueryRunner} from "../../../../src/query-runner/QueryRunner";

export class SecondReleaseChanges1481283582120 implements MigrationInterface {

    async up(queryRunner: QueryRunner, connection: Connection): Promise<any> {
        await queryRunner.renameColumn("post", "title", "name");
    }

    async down(queryRunner: QueryRunner, connection: Connection): Promise<any> {
        await queryRunner.renameColumn("post", "name", "title");
    }

}
