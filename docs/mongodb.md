# MongoDB

* [MongoDB support](#mongodb-support)
* [Defining entities and columns](#defining-entities-and-columns)
* [Defining subdocuments (embed documents)](#defining-subdocuments-embed-documents)
* [Using `MongoEntityManager` and `MongoRepository`](#using-mongoentitymanager-and-mongorepository)

## MongoDB support

TypeORM has basic MongoDB support.
Most of TypeORM functionality is RDBMS-specific,
this page contains all MongoDB-specific functionality documentation.

## Defining entities and columns

Defining entities and columns is almost the same as in relational databases,
the main difference is that you must use `@ObjectIdColumn`
instead of `@PrimaryColumn` or `@PrimaryGeneratedColumn`.

Simple entity example:

```typescript
import {Entity, ObjectID, ObjectIdColumn, Column} from "typeorm";

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

And this is how you bootstrap the app:

```typescript
import {createConnection, Connection} from "typeorm";

const connection: Connection = await createConnection({
    type: "mongodb",
    host: "localhost",
    port: 27017,
    database: "test"
});
```

## Defining subdocuments (embed documents)

Since MongoDB stores objects and objects inside objects (or documents inside documents)
you can do the same in TypeORM:

```typescript
import {Entity, ObjectID, ObjectIdColumn, Column} from "typeorm";

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
import {Entity, ObjectID, ObjectIdColumn, Column} from "typeorm";

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
import {Entity, ObjectID, ObjectIdColumn, Column} from "typeorm";

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

If you save this entity:

```typescript
import {getMongoManager} from "typeorm";

const user = new User();
user.firstName = "Timber";
user.lastName = "Saw";
user.profile = new Profile();
user.profile.about = "About Trees and Me";
user.profile.education = "Tree School";
user.profile.career = "Lumberjack";
user.photos = [
    new Photo("me-and-trees.jpg", "Me and Trees", 100),
    new Photo("me-and-chakram.jpg", "Me and Chakram", 200),
];

const manager = getMongoManager();
await manager.save(user);
```

Following document will be saved in the database:

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

## Using `MongoEntityManager` and `MongoRepository`

You can use the majority of methods inside the `EntityManager` (except for RDBMS-specific, like `query` and `transaction`).
For example:

```typescript
import {getManager} from "typeorm";

const manager = getManager(); // or connection.manager
const timber = await manager.findOne(User, { firstName: "Timber", lastName: "Saw" });
```

For MongoDB there is also a separate `MongoEntityManager` which extends `EntityManager`.

```typescript
import {getMongoManager} from "typeorm";

const manager = getMongoManager(); // or connection.mongoManager
const timber = await manager.findOne(User, { firstName: "Timber", lastName: "Saw" });
```

Just like separate like `MongoEntityManager` there is a `MongoRepository` with extended `Repository`:

```typescript
import {getMongoRepository} from "typeorm";

const userRepository = getMongoRepository(User); // or connection.getMongoRepository
const timber = await userRepository.findOne({ firstName: "Timber", lastName: "Saw" });
```

Use Advanced options in find():

Equal:

```typescript
import {getMongoRepository} from "typeorm";

const userRepository = getMongoRepository(User);
const timber = await userRepository.find({
  where: {
    firstName: {$eq: "Timber"},
  }
});
```

LessThan:

```typescript
import {getMongoRepository} from "typeorm";

const userRepository = getMongoRepository(User);
const timber = await userRepository.find({
  where: {
    age: {$lt: 60},
  }
});
```

In:

```typescript
import {getMongoRepository} from "typeorm";

const userRepository = getMongoRepository(User);
const timber = await userRepository.find({
  where: {
    firstName: {$in: ["Timber","Zhang"]},
  }
});
```

Not in:

```typescript
import {getMongoRepository} from "typeorm";

const userRepository = getMongoRepository(User);
const timber = await userRepository.find({
  where: {
firstName: {$not: {$in: ["Timber","Zhang"]}},
}
});
```

Or:

```typescript
import {getMongoRepository} from "typeorm";

const userRepository = getMongoRepository(User);
const timber = await userRepository.find({
  where: {
    $or: [
        {firstName:"Timber"},
        {firstName:"Zhang"}
      ]
  }
});
```

Querying subdocuments

```typescript
import {getMongoRepository} from "typeorm";

const userRepository = getMongoRepository(User);
// Query users with education Tree School
const users = await userRepository.find({
  where: {
   'profile.education': { $eq: "Tree School"}
  }
});
```

Querying Array of subdocuments

```typescript
import {getMongoRepository} from "typeorm";

const userRepository = getMongoRepository(User);
// Query users with photos of size less than 500
const users = await userRepository.find({
  where: {
   'photos.size': { $lt: 500}
  }
});

```


Both `MongoEntityManager` and `MongoRepository` contain lot of useful MongoDB-specific methods:

#### `createCursor`

Creates a cursor for a query that can be used to iterate over results from MongoDB.

#### `createEntityCursor`

Creates a cursor for a query that can be used to iterate over results from MongoDB.
This returns a modified version of the cursor that transforms each result into Entity models.

#### `aggregate`

Execute an aggregation framework pipeline against the collection.

#### `bulkWrite`

Perform a bulkWrite operation without a fluent API.

#### `count`

Count number of matching documents in the db to a query.

#### `createCollectionIndex`

Creates an index on the db and collection.

#### `createCollectionIndexes`

Creates multiple indexes in the collection, this method is only supported in MongoDB 2.6 or higher.
Earlier version of MongoDB will throw a command not supported error. Index specifications are defined at http://docs.mongodb.org/manual/reference/command/createIndexes/.

#### `deleteMany`

Delete multiple documents on MongoDB.

#### `deleteOne`

Delete a document on MongoDB.

#### `distinct`

The distinct command returns a list of distinct values for the given key across a collection.

#### `dropCollectionIndex`

Drops an index from this collection.

#### `dropCollectionIndexes`

Drops all indexes from the collection.

#### `findOneAndDelete`

Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.

#### `findOneAndReplace`

Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.

#### `findOneAndUpdate`

Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.

#### `collectionIndexes`

Retrieve all the indexes on the collection.

#### `collectionIndexExists`

Retrieve if an index exists on the collection

#### `collectionIndexInformation`

Retrieves this collections index info.

#### `initializeOrderedBulkOp`

Initiate an In order bulk write operation, operations will be serially executed in the order they are added, creating a new operation for each switch in types.

#### `initializeUnorderedBulkOp`

Initiate a Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.

#### `insertMany`

Inserts an array of documents into MongoDB.

#### `insertOne`

Inserts a single document into MongoDB.

#### `isCapped`

Returns if the collection is a capped collection.

#### `listCollectionIndexes`

Get the list of all indexes information for the collection.

#### `mapReduce`

Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.

#### `rename`

Changes the name of an existing collection.

#### `replaceOne`

Replace a document on MongoDB.

#### `stats`

Get all the collection statistics.

#### `updateMany`

Updates multiple documents within the collection based on the filter.

#### `updateOne`

Updates a single document within the collection based on the filter.

