import {MigrationInterface, QueryRunner} from "../../../../src";

export class DefaultValueAtColumn1567689639608 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post"
        (
          id serial NOT NULL PRIMARY KEY,
          incr integer DEFAULT 10,
          title character varying(255)
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE IF EXISTS "post";`);
  }

}
