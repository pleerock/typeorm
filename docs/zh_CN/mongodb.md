# MongoDB

* [MongoDB支持](#MongoDB支持)
* [定义实体和列](#定义实体和列)
* [定义subdocuments(embed documents)](#定义subdocuments(embed-documents))
* [使用`MongoEntityManager`和`MongoRepository`](#使用`MongoEntityManager`和`MongoRepository`)

## MongoDB支持

TypeORM 具有基本的 MongoDB 支持。
TypeORM 大多数功能都是特定于 RDBMS 的，
此页面包含了所有 MongoDB 特定的功能文档。

## 定义实体和列

定义实体和列几乎与关系数据库中的相同，主要区别在于你必须使用`@ObjectIdColumn`而不是`@PrimaryColumn`或`@PrimaryGeneratedColumn`。

简单实体示例：

```typescript
import { Entity, ObjectID, ObjectIdColumn, Column } from "typeorm";

@Entity()
export class User {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  firstName: string;

  @Column()
  lastName: string;
}
```

这里是你的应用程序如何连接到 MongoDB：

```typescript
import { createConnection, Connection } from "typeorm";

const connection: Connection = await createConnection({
  type: "mongodb",
  host: "localhost",
  port: 27017,
  database: "test"
});
```

## 定义subdocuments(embed documents)

由于 MongoDB 存储对象和对象内的对象（或文档内的文档），因此你可以在 TypeORM 中执行相同的操作：

```typescript
import { Entity, ObjectID, ObjectIdColumn, Column } from "typeorm";

export class Profile {
  @Column()
  about: string;

  @Column()
  education: string;

  @Column()
  career: string;
}
```

```typescript
import { Entity, ObjectID, ObjectIdColumn, Column } from "typeorm";

export class Photo {
  @Column()
  url: string;

  @Column()
  description: string;

  @Column()
  size: number;

  constructor(url: string, description: string, size: number) {
    this.url = url;
    this.description = description;
    this.size = size;
  }
}
```

```typescript
import { Entity, ObjectID, ObjectIdColumn, Column } from "typeorm";

@Entity()
export class User {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column(type => Profile)
  profile: Profile;

  @Column(type => Photo)
  photos: Photo[];
}
```

如果保存此实体：

```typescript
import { getMongoManager } from "typeorm";

const user = new User();
user.firstName = "Timber";
user.lastName = "Saw";
user.profile = new Profile();
user.profile.about = "About Trees and Me";
user.profile.education = "Tree School";
user.profile.career = "Lumberjack";
user.photos = [
  new Photo("me-and-trees.jpg", "Me and Trees", 100),
  new Photo("me-and-chakram.jpg", "Me and Chakram", 200)
];

const manager = getMongoManager();
await manager.save(user);
```

以下文档将保存在数据库中：

```json
{
  "firstName": "Timber",
  "lastName": "Saw",
  "profile": {
    "about": "About Trees and Me",
    "education": "Tree School",
    "career": "Lumberjack"
  },
  "photos": [
    {
      "url": "me-and-trees.jpg",
      "description": "Me and Trees",
      "size": 100
    },
    {
      "url": "me-and-chakram.jpg",
      "description": "Me and Chakram",
      "size": 200
    }
  ]
}
```

## 使用`MongoEntityManager`和`MongoRepository`

你可以使用`EntityManager`中的大多数方法（除了特定于 RDBMS 的方法，如`query`和`transaction`）。
例如：

```typescript
import { getManager } from "typeorm";

const manager = getManager(); // 或者 connection.manager
const timber = await manager.findOne(User, { firstName: "Timber", lastName: "Saw" });
```

对于 MongoDB，还有一个单独的`MongoEntityManager`，它扩展了`EntityManager`。

```typescript
import { getMongoManager } from "typeorm";

const manager = getMongoManager(); // 或者 connection.mongoManager
const timber = await manager.findOne(User, { firstName: "Timber", lastName: "Saw" });
```

就像`MongoEntityManager`的`EntityManager`一样，`MongoRepository`也扩展了`Repository`：

```typescript
import { getMongoRepository } from "typeorm";

const userRepository = getMongoRepository(User); // 或者 connection.getMongoManager
const timber = await userRepository.findOne({ firstName: "Timber", lastName: "Saw" });
```

`MongoEntityManager`和`MongoRepository`都包含许多有用的 MongoDB 特定方法：

#### `createCursor`

为查询创建一个游标，可用于迭代 MongoDB 的结果。

#### `createEntityCursor`

为查询创建一个游标，可用于迭代 MongoDB 的结果。
这将返回游标的修改版本，该版本将每个结果转换为实体模型。

#### `aggregate`

针对集合执行 aggregation framework 管道。

#### `bulkWrite`

在没有连贯 API 的情况下执行 bulkWrite 操作。

#### `count`

计算 db 中与查询匹配的文档的数量。

#### `createCollectionIndex`

在 db 和 collection 上创建索引。

#### `createCollectionIndexes`

在集合中创建多个索引，此方法仅在 MongoDB 2.6 或更高版本中受支持。
早期版本的 MongoDB 会抛出命令不支持的错误。 索引规范在http://docs.mongodb.org/manual/reference/command/createIndexes/中定义。

#### `deleteMany`

删除 MongoDB 上的多个文档。

#### `deleteOne`

删除 MongoDB 上的文档。

#### `distinct`

distinct 命令返回集合中给定键的不同值列表。

#### `dropCollectionIndex`

从此集合中删除索引。

#### `dropCollectionIndexes`

删除集合中的所有索引。

#### `findOneAndDelete`

查找文档并在一个 atomic 操作中将其删除，在操作期间需要写入锁定。

#### `findOneAndReplace`

查找文档并在一个 atomic 操作中替换它，在操作期间需要写入锁定。

#### `findOneAndUpdate`

查找文档并在一个 atomic 操作中更新它，在操作期间需要写入锁定。

#### `collectionIndexes`

检索集合上的所有索引。

#### `collectionIndexExists`

检索集合中是否存在索引

#### `collectionIndexInformation`

检索此集合索引信息

#### `initializeOrderedBulkOp`

启动按顺序批量写入操作，将按添加顺序连续执行操作，为类型中的每个开关创建新操作。

#### `initializeUnorderedBulkOp`

启动乱序批量写入操作。 所有操作都将缓冲到无序执行的 insert/update/remove 命令中。

#### `insertMany`

将一组文档插入 MongoDB。

#### `insertOne`

将单个文档插入 MongoDB。

#### `isCapped`

如果集合是上限集合，则返回。

#### `listCollectionIndexes`

获取集合的所有索引信息的列表。

#### `mapReduce`

在集合中运行 Map Reduce。 请注意，out 的内联选项将返回结果数组而不是集合。

#### `rename`

更改现有集合的名称。

#### `replaceOne`

替换 MongoDB 上的一个文档。

#### `stats`

获取所有集合的统计信息。

#### `updateMany`

根据过滤器更新集合中的多个文档。

#### `updateOne`

根据过滤器更新集合中的单个文档。
