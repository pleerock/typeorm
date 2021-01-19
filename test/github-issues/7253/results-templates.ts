export const resultsTemplates: Record<string, any> = {
    create: {
        control: `import {MigrationInterface, QueryRunner} from "typeorm";

export class testMigration1610975184784 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}`,
        javascript: `const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class testMigration1610975184784 {

    async up(queryRunner) {
    }

    async down(queryRunner) {
    }
}`
    },
    generate: {
        control: `import {MigrationInterface, QueryRunner} from "typeorm";

export class testMigration1610975184784 implements MigrationInterface {
    name = 'testMigration1610975184784'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE \`post\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE \`post\`");
    }

}`,
        javascript: `const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class testMigration1610975184784 {
    name = 'testMigration1610975184784'

    async up(queryRunner) {
        await queryRunner.query("CREATE TABLE \`post\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB");
    }

    async down(queryRunner) {
        await queryRunner.query("DROP TABLE \`post\`");
    }
}`
    }
};
