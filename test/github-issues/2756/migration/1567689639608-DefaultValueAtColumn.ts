import {MigrationInterface, QueryRunner} from "../../../../src";

export class DefaultValueAtColumn1567689639608 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post"
        (
          id serial NOT NULL,
          incr integer DEFAULT 10,
          title character varying(255),
          CONSTRAINT post_pkey PRIMARY KEY (id)
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE IF EXISTS "post";`);
  }

}
