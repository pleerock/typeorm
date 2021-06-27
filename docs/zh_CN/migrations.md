# 迁移

* [迁移的工作原理](#迁移的工作原理)
* [创建新迁移](#创建新迁移)
* [运行和还原迁移](#运行和还原迁移)
* [生成迁移](#生成迁移)
* [使用迁移 API 编写迁移](#使用迁移API编写迁移)

## 迁移的工作原理

一旦上线生产环境，你将需要将模型更改同步到数据库中。
通常在数据库中获取数据后，使用`synchronize：true`进行生产模式同步是不安全的。 因此这时候使用迁移，可以解决此类问题。

迁移只是一个带有 SQL 查询的文件，用于更新数据库架构并将新更改应用于现有数据库。

假设你已经有一个数据库和一个 post 实体：

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  text: string;
}
```

这些实体在生产环境中运行了几个月而没有任何变化。
数据库中产生了有几千个 posts。

现在你需要创建一个新版本并将`title`重命名为`name`。
你会怎么做？

你需要使用以下 sql 查询（postgres dialect）创建新的迁移：

```sql
ALTER TABLE "post" RENAME COLUMN "title" TO "name";
```

运行此 sql 查询后，你的数据库架构就可以使用新的代码库了。
TypeORM 提供了一个可以编写此类 SQL 查询并在需要时运行它们的位置。
这个位置就叫"migrations"。

## 创建新迁移

在创建新迁移之前，你需要正确设置连接选项：

```json
{
  "type": "mysql",
  "host": "localhost",
  "port": 3306,
  "username": "test",
  "password": "test",
  "database": "test",
  "entities": ["entity/*.js"],
  "migrationsTableName": "custom_migration_table",
  "migrations": ["migration/*.js"],
  "cli": {
    "migrationsDir": "migration"
  }
}
```

这里我们设置三个选项：

- `"migrationsTableName": "migrations"` - 仅当需要迁移表名称与`migrations`不同时才指定此选项。
- `"migrations": ["migration/*.js"]` - 表示 typeorm 必须从给定的"migration"目录加载迁移。
- `"cli": { "migrationsDir": "migration" }` - 表示 CLI 必须在"migration"目录中创建新的迁移。

设置连接选项后，可以使用 CLI 创建新的迁移：

```
typeorm migration:create -n PostRefactoring
```

要使用 CLI 命令，需要全局安装 typeorm（`npm i typeorm -g`）。
此外，请确保你本地 typeorm 版本与全局版本匹配。
了解更多有关[TypeORM CLI](./using-cli.md)的信息。

此处`PostRefactoring`是迁移的名称 - 你可以指定任何想要的名称。
运行该命令后，可以在"migration"目录中看到一个名为`{TIMESTAMP} -PostRefactoring.ts`的新文件，其中`{TIMESTAMP}`是生成迁移时的当前时间戳。
现在你可以打开该文件并在那里添加迁移 sql 查询。

你应该可以在迁移中看到以下内容：

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class PostRefactoringTIMESTAMP implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {}

  async down(queryRunner: QueryRunner): Promise<void> {}
}
```

你必须使用两种方法填写迁移代码：`up`和`down`。
`up`必须包含执行迁移所需的代码。
`down`必须恢复任何`up`改变。
`down`方法用于恢复上次迁移。

在`up`和`down`里面有一个`QueryRunner`对象。
使用此对象执行所有数据库操作。
了解有关[query runner](./ query-runner.md)的更多信息。

让我们通过`Post`更改看看迁移是什么样的：

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class PostRefactoringTIMESTAMP implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "post" ALTER COLUMN "title" RENAME TO "name"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "post" ALTER COLUMN "name" RENAME TO "title"`); // 恢复"up"方法所做的事情
  }
}
```

## 运行和还原迁移

迁移到生产后，可以使用 CLI 命令运行它们：

```
typeorm migration:run
```

**`typeorm migration：create`和`typeorm migration：generate`将创建`.ts`文件。 `migration：run`和`migration：revert`命令仅适用于`.js`文件。 因此，在运行命令之前需要编译 typescript 文件。**或者你可以使用`ts-node`和`typeorm`来运行`.ts`迁移文件。

`ts-node`的示例：

```
ts-node ./node_modules/typeorm/cli.js migration:run
```

此命令将执行所有挂起的迁移，并按其时间戳排序的顺序运行它们。
这意味着将在你创建的迁移的`up`方法中编写的所有 sql 查询都将被执行。
至此你将获得最新的数据库架构。

如果由于某种原因你想要还原更改，则可以运行：

```
typeorm migration:revert
```

该命令将在最近执行的迁移中执行`down`。
如果需要还原多个迁移，则必须多次调用此命令。

## 生成迁移

当你更改数据库架构时，TypeORM 能够自动生成架构更改的迁移文件。

假设你有一个带有`title`列的`Post`实体，并且已将名称`title`更改为`name`。
则可以运行以下命令：

```
typeorm migration:generate -n PostRefactoring
```

它将生成一个名为`{TIMESTAMP} -PostRefactoring.ts`的新迁移，其中包含以下内容：

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class PostRefactoringTIMESTAMP implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "post" ALTER COLUMN "title" RENAME TO "name"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "post" ALTER COLUMN "name" RENAME TO "title"`);
  }
}
```

瞅瞅，你已经不需要自己编写查询了。
生成迁移的经验法则是，在对模型进行"每次"更改后生成它们。

## 使用迁移API编写迁移

为了使用 API 来更改数据库架构，你可以使用`QueryRunner`。

例如:

```ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableColumn, TableForeignKey } from "typeorm";

export class QuestionRefactoringTIMESTAMP implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "question",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true
          },
          {
            name: "name",
            type: "varchar"
          }
        ]
      }),
      true
    );

    await queryRunner.createIndex(
      "question",
      new TableIndex({
        name: "IDX_QUESTION_NAME",
        columnNames: ["name"]
      })
    );

    await queryRunner.createTable(
      new Table({
        name: "answer",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true
          },
          {
            name: "name",
            type: "varchar"
          }
        ]
      }),
      true
    );

    await queryRunner.addColumn(
      "answer",
      new TableColumn({
        name: "questionId",
        type: "int"
      })
    );

    await queryRunner.createForeignKey(
      "answer",
      new TableForeignKey({
        columnNames: ["questionId"],
        referencedColumnNames: ["id"],
        referencedTableName: "question",
        onDelete: "CASCADE"
      })
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("question");
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("questionId") !== -1);
    await queryRunner.dropForeignKey("question", foreignKey);
    await queryRunner.dropColumn("question", "questionId");
    await queryRunner.dropTable("answer");
    await queryRunner.dropIndex("question", "IDX_QUESTION_NAME");
    await queryRunner.dropTable("question");
  }
}
```

---

```ts
getDatabases(): Promise<string[]>
```

返回所有可用的数据库名称，包括系统数据库。

---

```ts
getSchemas(database?: string): Promise<string[]>
```

- `database` - 如果指定了 database 参数，则返回该数据库的模式

返回所有可用的模式名称，包括系统模式。 仅对 SQLServer 和 Postgres 有用。

---

```ts
getTable(tableName: string): Promise<Table|undefined>
```

- `tableName` -要加载的表的名称

从数据库中按给定名称加载表。

---

```ts
getTables(tableNames: string[]): Promise<Table[]>
```

- `tableNames` - 要加载的表的名称

从数据库中按给定名称加载表。

---

```ts
hasDatabase(database: string): Promise<boolean>
```

- `database` - 要检查的数据库的名称

检查是否存在具有给定名称的数据库。

---

```ts
hasSchema(schema: string): Promise<boolean>
```

- `schema` - 要检查的模式的名称

检查是否存在具有给定名称的模式。 仅用于 SqlServer 和 Postgres。

---

```ts
hasTable(table: Table|string): Promise<boolean>
```

- `table` - 表对象或名称

检查表是否存在。

---

```ts
hasColumn(table: Table|string, columnName: string): Promise<boolean>
```

- `table` - 表对象或名称
- `columnName` - 要检查的列的名称

检查表中是否存在列。

---

```ts
createDatabase(database: string, ifNotExist?: boolean): Promise<void>
```

- `database` - 数据库名称
- `ifNotExist` - 如果为'true`则跳过创建，否则如果数据库已存在则抛出错误

创建一个新数据库。

---

```ts
dropDatabase(database: string, ifExist?: boolean): Promise<void>
```

- `database` - 数据库名称
- `ifExist` - 如果为`true`则跳过删除，否则如果找不到数据库则抛出错误

删除数据库。

---

```ts
createSchema(schemaPath: string, ifNotExist?: boolean): Promise<void>
```

- `schemaPath` - 架构名称。 对于 SqlServer，可以接受模式路径（例如'dbName.schemaName'）作为参数。
     如果传递了架构路径，它将在指定的数据库中创建架构
- `ifNotExist` - 如果为`true`则跳过创建，否则如果 schema 已存在则抛出错误

创建一个新的表模式。

---

```ts
dropSchema(schemaPath: string, ifExist?: boolean, isCascade?: boolean): Promise<void>
```

- `schemaPath` - 架构名称。 对于 SqlServer，可以接受模式路径（例如'dbName.schemaName'）作为参数。
     如果传递了架构路径，它将删除指定数据库中的架构
- `ifExist` - 如果为`true`则跳过删除，否则如果找不到模式则抛出错误
- `isCascade` - 如果为`true`，则自动删除模式中包含的对象（表，函数等）。
  仅在 Postgres 中使用。

删除表架构。

---

```ts
createTable(table: Table, ifNotExist?: boolean, createForeignKeys?: boolean, createIndices?: boolean): Promise<void>
```

- `table` - 表对象。
- `ifNotExist` - 如果`true`则跳过创建，否则如果表已经存在则抛出错误。 默认`false`
- `createForeignKeys` - 指示是否将在创建表时创建外键。 默认为`true`
- `createIndices` - 指示是否将在创建表时创建索引。 默认为`true`

创建一个新表。

---

```ts
dropTable(table: Table|string, ifExist?: boolean, dropForeignKeys?: boolean, dropIndices?: boolean): Promise<void>
```

- `table` - 要删除的表对象或表名
- `ifExist` - 如果`true`则跳过，否则抛出错误，如果表不存在则抛出错误
- `dropForeignKeys` - 表示删除表时是否删除外键。 默认为`true`
- `dropIndices` - 指示删除表时是否删除索引。 默认为`true`

删除一张表。

---

```ts
renameTable(oldTableOrName: Table|string, newTableName: string): Promise<void>
```

- `oldTableOrName` - 旧的表对象或要重命名的名称
- `newTableName` - 新表名

重命名一张表。

---

```ts
addColumn(table: Table|string, column: TableColumn): Promise<void>
```

- `table` - 表对象或名称
- `column` - 新列

添加一个新列。

---

```ts
addColumns(table: Table|string, columns: TableColumn[]): Promise<void>
```

- `table` - 表对象或名称
- `columns` - 新列

添加一个新列。

---

```ts
renameColumn(table: Table|string, oldColumnOrName: TableColumn|string, newColumnOrName: TableColumn|string): Promise<void>
```

- `table` - 表对象或名称
- `oldColumnOrName` - 旧列。接受 TableColumn 对象或列名称
- `newColumnOrName` - 新列。接受 TableColumn 对象或列名称

重命名一列。

---

```ts
changeColumn(table: Table|string, oldColumn: TableColumn|string, newColumn: TableColumn): Promise<void>
```

- `table` - 表对象或名称
- `oldColumn` - 旧列。 接受 TableColumn 对象或列名称
- `newColumn` - 新列。 接受 TableColumn 对象

更改表中的列。

---

```ts
changeColumns(table: Table|string, changedColumns: { oldColumn: TableColumn, newColumn: TableColumn }[]): Promise<void>
```

- `table` - 表对象或名称
- `changedColumns` - 更改列的数组
  - `oldColumn` - 旧的 TableColumn 对象
  - `newColumn` - 新的 TableColumn 对象

更改表中的列。

---

```ts
dropColumn(table: Table|string, column: TableColumn|string): Promise<void>
```

- `table` - 表对象或名称
- `column` - 要删除的 TableColumn 对象或列名称

删除表中的列。

---

```ts
dropColumns(table: Table|string, columns: TableColumn[]|string[]): Promise<void>
```

- `table` - 表对象或名称
- `columns` - 要删除的 TableColumn 对象数组

删除表中的列。

---

```ts
createPrimaryKey(table: Table|string, columnNames: string[]): Promise<void>
```

- `table` - 表对象或名称
- `columnNames` - 列名称的数组将是主要的

创建一个新的主键。

---

```ts
updatePrimaryKeys(table: Table|string, columns: TableColumn[]): Promise<void>
```

- `table` - 表对象或名称
- `columns` - 将更新的 TableColumn 对象数组

更新复合主键。

---

```ts
dropPrimaryKey(table: Table|string): Promise<void>
```

- `table` - 表对象或名称

删除主键。

---

```ts
createUniqueConstraint(table: Table|string, uniqueConstraint: TableUnique): Promise<void>
```

- `table` - 表对象或名称
- `uniqueConstraint` - 要创建的 TableUnique 对象

创建新的唯一约束。

> 注意：不适用于 MySQL，因为 MySQL 将唯一约束存储为唯一索引。 请改用`createIndex()`方法。

---

```ts
createUniqueConstraints(table: Table|string, uniqueConstraints: TableUnique[]): Promise<void>
```

- `table` - 表对象或名称
- `uniqueConstraints` - 表对象或名称

创建新的唯一约束。

> 注意：不适用于 MySQL，因为 MySQL 将唯一约束存储为唯一索引。 请改用`createIndices()`方法。

---

```ts
dropUniqueConstraint(table: Table|string, uniqueOrName: TableUnique|string): Promise<void>
```

- `table` - 表对象或名称
- `uniqueOrName` - 要删除的 TableUnique 对象或唯一约束名称

删除一个唯一约束。

> 注意：不适用于 MySQL，因为 MySQL 将唯一约束存储为唯一索引。 请改用`dropIndex()`方法。

---

```ts
dropUniqueConstraints(table: Table|string, uniqueConstraints: TableUnique[]): Promise<void>
```

- `table` - 表对象或名称
- `uniqueConstraints` - 要删除的 TableUnique 对象的数组

删除一个唯一约束。

> 注意：不适用于 MySQL，因为 MySQL 将唯一约束存储为唯一索引。 请改用`dropIndices()`方法。

---

```ts
createCheckConstraint(table: Table|string, checkConstraint: TableCheck): Promise<void>
```

- `table` - 表对象或名称
- `checkConstraint` - TableCheck 对象

创建新的检查约束。

> 注意：MySQL 不支持检查约束。

---

```ts
createCheckConstraints(table: Table|string, checkConstraints: TableCheck[]): Promise<void>
```

- `table` - 表对象或名称
- `checkConstraints` - TableCheck 对象的数组

创建新的检查约束。

> 注意：MySQL 不支持检查约束。

---

```ts
dropCheckConstraint(table: Table|string, checkOrName: TableCheck|string): Promise<void>
```

- `table` - 表对象或名称
- `checkOrName` - TableCheck 对象或检查约束名称

删除检查约束。

> 注意：MySQL 不支持检查约束。

---

```ts
dropCheckConstraints(table: Table|string, checkConstraints: TableCheck[]): Promise<void>
```

- `table` - 表对象或名称
- `checkConstraints` - TableCheck 对象的数组

删除检查约束。

> 注意：MySQL 不支持检查约束。

---

```ts
createForeignKey(table: Table|string, foreignKey: TableForeignKey): Promise<void>
```

- `table` - 表对象或名称
- `foreignKey` - TableForeignKey 对象

创建一个新的外键。

---

```ts
createForeignKeys(table: Table|string, foreignKeys: TableForeignKey[]): Promise<void>
```

- `table` - 表对象或名称
- `foreignKeys` - TableForeignKey 对象的数组

创建一个新的外键。

---

```ts
dropForeignKey(table: Table|string, foreignKeyOrName: TableForeignKey|string): Promise<void>
```

- `table` - 表对象或名称
- `foreignKeyOrName` - TableForeignKey 对象或外键名称

删除一个外键。

---

```ts
dropForeignKeys(table: Table|string, foreignKeys: TableForeignKey[]): Promise<void>
```

- `table` - 表对象或名称
- `foreignKeys` - TableForeignKey 对象的数组

删除一个外键。

---

```ts
createIndex(table: Table|string, index: TableIndex): Promise<void>
```

- `table` - 表对象或名称
- `index` - TableIndex 对象

创建一个新索引。

---

```ts
createIndices(table: Table|string, indices: TableIndex[]): Promise<void>
```

- `table` - 表对象或名称
- `indices` - TableIndex 对象的数组

创建一个新索引。

---

```ts
dropIndex(table: Table|string, index: TableIndex|string): Promise<void>
```

- `table` - 表对象或名称
- `index` - TableIndex 对象或索引名称

删除索引。

---

```ts
dropIndices(table: Table|string, indices: TableIndex[]): Promise<void>
```

- `table` - 表对象或名称
- `indices` - TableIndex 对象的数组

删除指数。

---

```ts
clearTable(tableName: string): Promise<void>
```

- `tableName` - 表明

清除所有表内容。

> 注意：此操作使用 SQL 的 TRUNCATE 查询，该查询无法在事务中恢复。

---

```ts
enableSqlMemory(): void
```

启用特殊查询运行程序模式，其中不执行 sql 查询，而是将它们存储到查询运行程序内的特殊变量中。

你可以使用`getMemorySql()`方法获得内存中的 sql。

---

```ts
disableSqlMemory(): void
```

禁用不执行 sql 查询的特殊查询运行程序模式。 以前存储的 sql 将被刷新。

---

```ts
clearSqlMemory(): void
```

刷新所有内存中的 sqls。

---

```ts
getMemorySql(): SqlInMemory
```

- 返回带有`upQueries`和`downQueries`squls 数组的`SqlInMemory`对象

获取存储在内存中的 sql。 sql 中的参数已被替换。

---

```ts
executeMemoryUpSql(): Promise<void>
```

执行内存中的 SQL 查询。

---

```ts
executeMemoryDownSql(): Promise<void>
```

执行内存中的 SQL 查询。

---
