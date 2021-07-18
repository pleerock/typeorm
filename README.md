<div align="center">
  <a href="http://typeorm.io/">
    <img src="https://github.com/typeorm/typeorm/raw/master/resources/logo_big.png" width="492" height="228">
  </a>
  <br>
  <br>
	<a href="https://app.circleci.com/pipelines/github/typeorm/typeorm">
		<img src="https://circleci.com/gh/typeorm/typeorm/tree/master.svg?style=shield">
	</a>
	<a href="https://badge.fury.io/js/typeorm">
		<img src="https://badge.fury.io/js/typeorm.svg">
	</a>
	<a href="https://david-dm.org/typeorm/typeorm">
		<img src="https://david-dm.org/typeorm/typeorm.svg">
	</a>
    <a href="https://codecov.io/gh/typeorm/typeorm">
        <img alt="Codecov" src="https://img.shields.io/codecov/c/github/typeorm/typeorm.svg">
    </a>
	<a href="https://join.slack.com/t/typeorm/shared_invite/zt-gej3gc00-hR~L~DqGUJ7qOpGy4SSq3g">
		<img src="https://img.shields.io/badge/chat-on%20slack-blue.svg">
	</a>
  <br>
  <br>
</div>

TypeORM is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping)
that can run in NodeJS, Browser, Cordova, PhoneGap, Ionic, React Native, NativeScript, Expo, and Electron platforms
and can be used with TypeScript and JavaScript (ES5, ES6, ES7, ES8).
Its goal is to always support the latest JavaScript features and provide additional features
that help you to develop any kind of application that uses databases - from
small applications with a few tables to large scale enterprise applications
with multiple databases.

TypeORM supports both [Active Record](./docs/active-record-data-mapper.md#what-is-the-active-record-pattern) and [Data Mapper](./docs/active-record-data-mapper.md#what-is-the-data-mapper-pattern) patterns,
unlike all other JavaScript ORMs currently in existence,
which means you can write high quality, loosely coupled, scalable,
maintainable applications the most productive way.

TypeORM is highly influenced by other ORMs, such as [Hibernate](http://hibernate.org/orm/),
 [Doctrine](http://www.doctrine-project.org/) and [Entity Framework](https://www.asp.net/entity-framework).

## Features

* supports both [DataMapper](./docs/active-record-data-mapper.md#what-is-the-data-mapper-pattern) and [ActiveRecord](./docs/active-record-data-mapper.md#what-is-the-active-record-pattern) (your choice)
* entities and columns
* database-specific column types
* entity manager
* repositories and custom repositories
* clean object relational model
* associations (relations)
* eager and lazy relations
* uni-directional, bi-directional and self-referenced relations
* supports multiple inheritance patterns
* cascades
* indices
* transactions
* migrations and automatic migrations generation
* connection pooling
* replication
* using multiple database connections
* working with multiple databases types
* cross-database and cross-schema queries
* elegant-syntax, flexible and powerful QueryBuilder
* left and inner joins
* proper pagination for queries using joins
* query caching
* streaming raw results
* logging
* listeners and subscribers (hooks)
* supports closure table pattern
* schema declaration in models or separate configuration files
* connection configuration in json / xml / yml / env formats
* supports MySQL / MariaDB / Postgres / CockroachDB / SQLite / Microsoft SQL Server / Oracle / SAP Hana / sql.js
* supports MongoDB NoSQL database
* works in NodeJS / Browser / Ionic / Cordova / React Native / NativeScript / Expo / Electron platforms
* TypeScript and JavaScript support
* produced code is performant, flexible, clean and maintainable
* follows all possible best practices
* CLI

And more...

With TypeORM your models look like this:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    age: number;

}
```

And your domain logic looks like this:

```typescript
const repository = connection.getRepository(User);

const user = new User();
user.firstName = "Timber";
user.lastName = "Saw";
user.age = 25;
await repository.save(user);

const allUsers = await repository.find();
const firstUser = await repository.findOne(1); // find by id
const timber = await repository.findOne({ firstName: "Timber", lastName: "Saw" });

await repository.remove(timber);
```

Alternatively, if you prefer to use the `ActiveRecord` implementation, you can use it as well:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

@Entity()
export class User extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    age: number;

}
```

And your domain logic will look this way:

```typescript
const user = new User();
user.firstName = "Timber";
user.lastName = "Saw";
user.age = 25;
await user.save();

const allUsers = await User.find();
const firstUser = await User.findOne(1);
const timber = await User.findOne({ firstName: "Timber", lastName: "Saw" });

await timber.remove();
```

## Installation


1. Install the npm package:

    `npm install typeorm --save`

2. You need to install `reflect-metadata` shim:

    `npm install reflect-metadata --save`

    and import it somewhere in the global place of your app (for example in `app.ts`):

    `import "reflect-metadata";`

3. You may need to install node typings:

    `npm install @types/node --save-dev`

4. Install a database driver:

    * for **MySQL** or **MariaDB**

        `npm install mysql --save` (you can install `mysql2` instead as well)

    * for **PostgreSQL** or **CockroachDB**

        `npm install pg --save`

    * for **SQLite**

        `npm install sqlite3 --save`

    * for **Microsoft SQL Server**

        `npm install mssql --save`

    * for **sql.js**

        `npm install sql.js --save`

    * for **Oracle**

        `npm install oracledb --save`

        To make the Oracle driver work, you need to follow the installation instructions from
        [their](https://github.com/oracle/node-oracledb) site.

    * for **SAP Hana**

        ```
        npm i @sap/hana-client
		npm i hdb-pool
        ```

        *SAP Hana support made possible by sponsorship of [Neptune Software](https://www.neptune-software.com/).*

    * for **MongoDB** (experimental)

        `npm install mongodb --save`

    * for **NativeScript**, **react-native** and **Cordova**

        Check [documentation of supported platforms](./docs/supported-platforms.md)

    Install only *one* of them, depending on which database you use.


##### TypeScript configuration

Also, make sure you are using TypeScript version **3.3** or higher,
and you have enabled the following settings in `tsconfig.json`:

```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
```

You may also need to enable `es6` in the `lib` section of compiler options, or install `es6-shim` from `@types`.

## Quick Start

The quickest way to get started with TypeORM is to use its CLI commands to generate a starter project.
Quick start works only if you are using TypeORM in a NodeJS application.
If you are using other platforms, proceed to the [step-by-step guide](#step-by-step-guide).

First, install TypeORM globally:

```
npm install typeorm -g
```

Then go to the directory where you want to create a new project and run the command:

```
typeorm init --name MyProject --database mysql
```

Where `name` is the name of your project and `database` is the database you'll use.
Database can be one of the following values: `mysql`, `mariadb`, `postgres`, `cockroachdb`, `sqlite`, `mssql`, `oracle`, `mongodb`,
`cordova`, `react-native`, `expo`, `nativescript`.

This command will generate a new project in the `MyProject` directory with the following files:

```
MyProject
├── src              // place of your TypeScript code
│   ├── entity       // place where your entities (database models) are stored
│   │   └── User.ts  // sample entity
│   ├── migration    // place where your migrations are stored
│   └── index.ts     // start point of your application
├── .gitignore       // standard gitignore file
├── ormconfig.json   // ORM and database connection configuration
├── package.json     // node module dependencies
├── README.md        // simple readme file
└── tsconfig.json    // TypeScript compiler options
```

> You can also run `typeorm init` on an existing node project, but be careful - it may override some files you already have.

The next step is to install new project dependencies:

```
cd MyProject
npm install
```

While installation is in progress, edit the `ormconfig.json` file and put your own database connection configuration options in there:

```json
{
   "type": "mysql",
   "host": "localhost",
   "port": 3306,
   "username": "test",
   "password": "test",
   "database": "test",
   "synchronize": true,
   "logging": false,
   "entities": [
      "src/entity/**/*.ts"
   ],
   "migrations": [
      "src/migration/**/*.ts"
   ],
   "subscribers": [
      "src/subscriber/**/*.ts"
   ]
}
```

Particularly, most of the time you'll only need to configure
`host`, `username`, `password`, `database` and maybe `port` options.

Once you finish with configuration and all node modules are installed, you can run your application:

```
npm start
```

That's it, your application should successfully run and insert a new user into the database.
You can continue to work with this project and integrate other modules you need and start
creating more entities.

> You can generate an even more advanced project with express installed by running
`typeorm init --name MyProject --database mysql --express` command.

> You can generate docker-compose file by running
`typeorm init --name MyProject --database postgres --docker` command.

## Step-by-Step Guide

What are you expecting from ORM?
First of all, you are expecting it will create database tables for you
and find / insert / update / delete your data without the pain of
having to write lots of hardly maintainable SQL queries.
This guide will show you how to setup TypeORM from scratch and make it do what you are expecting from an ORM.

### Create a model

Working with a database starts from creating tables.
How do you tell TypeORM to create a database table?
The answer is - through the models.
Your models in your app are your database tables.

For example, you have a `Photo` model:

```typescript
export class Photo {
    id: number;
    name: string;
    description: string;
    filename: string;
    views: number;
    isPublished: boolean;
}
```

And you want to store photos in your database.
To store things in the database, first you need a database table,
and database tables are created from your models.
Not all models, but only those you define as *entities*.

### Create an entity

*Entity* is your model decorated by an `@Entity` decorator.
A database table will be created for such models.
You work with entities everywhere with TypeORM.
You can load/insert/update/remove and perform other operations with them.

Let's make our `Photo` model as an entity:

```typescript
import { Entity } from "typeorm";

@Entity()
export class Photo {
    id: number;
    name: string;
    description: string;
    filename: string;
    views: number;
    isPublished: boolean;
}
```

Now, a database table will be created for the `Photo` entity and we'll be able to work with it anywhere in our app.
We have created a database table, however what table can exist without columns?
Let's create a few columns in our database table.

### Adding table columns

To add database columns, you simply need to decorate an entity's properties you want to make into a column
with a `@Column` decorator.

```typescript
import { Entity, Column } from "typeorm";

@Entity()
export class Photo {

    @Column()
    id: number;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    filename: string;

    @Column()
    views: number;

    @Column()
    isPublished: boolean;
}
```

Now `id`, `name`, `description`, `filename`, `views` and `isPublished` columns will be added to the `photo` table.
Column types in the database are inferred from the property types you used, e.g.
`number` will be converted into `integer`, `string` into `varchar`, `boolean` into `bool`, etc.
But you can use any column type your database supports by explicitly specifying a column type into the `@Column` decorator.

We generated a database table with columns, but there is one thing left.
Each database table must have a column with a primary key.

### Creating a primary column

Each entity **must** have at least one primary key column.
This is a requirement and you can't avoid it.
To make a column a primary key, you need to use `@PrimaryColumn` decorator.

```typescript
import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity()
export class Photo {

    @PrimaryColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    filename: string;

    @Column()
    views: number;

    @Column()
    isPublished: boolean;
}
```

### Creating an auto generated column

Now, let's say you want your id column to be auto-generated (this is known as auto-increment / sequence / serial / generated identity column).
To do that, you need to change the `@PrimaryColumn` decorator to a `@PrimaryGeneratedColumn` decorator:

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Photo {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    filename: string;

    @Column()
    views: number;

    @Column()
    isPublished: boolean;
}
```

### Column data types

Next, let's fix our data types. By default, string is mapped to a varchar(255)-like type (depending on the database type).
Number is mapped to a integer-like type (depending on the database type).
We don't want all our columns to be limited varchars or integers.
Let's setup correct data types:

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Photo {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 100
    })
    name: string;

    @Column("text")
    description: string;

    @Column()
    filename: string;

    @Column("double")
    views: number;

    @Column()
    isPublished: boolean;
}
```

Column types are database-specific.
You can set any column type your database supports.
More information on supported column types can be found [here](./docs/entities.md#column-types).

### Creating a connection to the database

Now, when our entity is created, let's create an `index.ts` (or `app.ts` whatever you call it) file and set up our connection there:

```typescript
import "reflect-metadata";
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";

createConnection({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "admin",
    database: "test",
    entities: [
        Photo
    ],
    synchronize: true,
    logging: false
}).then(connection => {
    // here you can start to work with your entities
}).catch(error => console.log(error));
```

We are using MySQL in this example, but you can use any other supported database.
To use another database, simply change the `type` in the options to the database type you are using:
`mysql`, `mariadb`, `postgres`, `cockroachdb`, `sqlite`, `mssql`, `oracle`, `cordova`, `nativescript`, `react-native`,
`expo`, or `mongodb`.
Also make sure to use your own host, port, username, password and database settings.

We added our Photo entity to the list of entities for this connection.
Each entity you are using in your connection must be listed there.

Setting `synchronize` makes sure your entities will be synced with the database, every time you run the application.

### Loading all entities from the directory

Later, when we create more entities we need to add them to the entities in our configuration.
This is not very convenient, so instead we can set up the whole directory, from where all entities will be connected and used in our connection:

```typescript
import { createConnection } from "typeorm";

createConnection({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "admin",
    database: "test",
    entities: [
        __dirname + "/entity/*.js"
    ],
    synchronize: true,
}).then(connection => {
    // here you can start to work with your entities
}).catch(error => console.log(error));
```

But be careful with this approach.
If you are using `ts-node` then you need to specify paths to `.ts` files instead.
If you are using `outDir` then you'll need to specify paths to `.js` files inside outDir directory.
If you are using `outDir` and when you remove or rename your entities make sure to clear `outDir` directory
and re-compile your project again, because when you remove your source `.ts` files their compiled `.js` versions
aren't removed from output directory and still are loaded by TypeORM because they are present in the `outDir` directory.

### Running the application

Now if you run your `index.ts`, a connection with database will be initialized and a database table for your photos will be created.


```shell
+-------------+--------------+----------------------------+
|                         photo                           |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| name        | varchar(100) |                            |
| description | text         |                            |
| filename    | varchar(255) |                            |
| views       | int(11)      |                            |
| isPublished | boolean      |                            |
+-------------+--------------+----------------------------+
```

### Creating and inserting a photo into the database

Now let's create a new photo to save it in the database:

```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";

createConnection(/*...*/).then(connection => {

    let photo = new Photo();
    photo.name = "Me and Bears";
    photo.description = "I am near polar bears";
    photo.filename = "photo-with-bears.jpg";
    photo.views = 1;
    photo.isPublished = true;

    return connection.manager
            .save(photo)
            .then(photo => {
                console.log("Photo has been saved. Photo id is", photo.id);
            });

}).catch(error => console.log(error));
```

Once your entity is saved it will get a newly generated id.
`save` method returns an instance of the same object you pass to it.
It's not a new copy of the object, it modifies its "id" and returns it.

### Using async/await syntax

Let's take advantage of the latest ES8 (ES2017) features and use async/await syntax instead:

```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";

createConnection(/*...*/).then(async connection => {

    let photo = new Photo();
    photo.name = "Me and Bears";
    photo.description = "I am near polar bears";
    photo.filename = "photo-with-bears.jpg";
    photo.views = 1;
    photo.isPublished = true;

    await connection.manager.save(photo);
    console.log("Photo has been saved");

}).catch(error => console.log(error));
```

### Using Entity Manager

We just created a new photo and saved it in the database.
We used `EntityManager` to save it.
Using entity manager you can manipulate any entity in your app.
For example, let's load our saved entity:

```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";

createConnection(/*...*/).then(async connection => {

    /*...*/
    let savedPhotos = await connection.manager.find(Photo);
    console.log("All photos from the db: ", savedPhotos);

}).catch(error => console.log(error));
```

`savedPhotos` will be an array of Photo objects with the data loaded from the database.

Learn more about EntityManager [here](./docs/working-with-entity-manager.md).

### Using Repositories

Now let's refactor our code and use `Repository` instead of `EntityManager`.
Each entity has its own repository which handles all operations with its entity.
When you deal with entities a lot, Repositories are more convenient to use than EntityManagers:


```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";

createConnection(/*...*/).then(async connection => {

    let photo = new Photo();
    photo.name = "Me and Bears";
    photo.description = "I am near polar bears";
    photo.filename = "photo-with-bears.jpg";
    photo.views = 1;
    photo.isPublished = true;

    let photoRepository = connection.getRepository(Photo);

    await photoRepository.save(photo);
    console.log("Photo has been saved");

    let savedPhotos = await photoRepository.find();
    console.log("All photos from the db: ", savedPhotos);

}).catch(error => console.log(error));
```

Learn more about Repository [here](./docs/working-with-repository.md).

### Loading from the database

Let's try more load operations using the Repository:

```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";

createConnection(/*...*/).then(async connection => {

    /*...*/
    let allPhotos = await photoRepository.find();
    console.log("All photos from the db: ", allPhotos);

    let firstPhoto = await photoRepository.findOne(1);
    console.log("First photo from the db: ", firstPhoto);

    let meAndBearsPhoto = await photoRepository.findOne({ name: "Me and Bears" });
    console.log("Me and Bears photo from the db: ", meAndBearsPhoto);

    let allViewedPhotos = await photoRepository.find({ views: 1 });
    console.log("All viewed photos: ", allViewedPhotos);

    let allPublishedPhotos = await photoRepository.find({ isPublished: true });
    console.log("All published photos: ", allPublishedPhotos);

    let [allPhotos, photosCount] = await photoRepository.findAndCount();
    console.log("All photos: ", allPhotos);
    console.log("Photos count: ", photosCount);

}).catch(error => console.log(error));
```

### Updating in the database

Now let's load a single photo from the database, update it and save it:

```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";

createConnection(/*...*/).then(async connection => {

    /*...*/
    let photoToUpdate = await photoRepository.findOne(1);
    photoToUpdate.name = "Me, my friends and polar bears";
    await photoRepository.save(photoToUpdate);

}).catch(error => console.log(error));
```

Now photo with `id = 1` will be updated in the database.

### Removing from the database

Now let's remove our photo from the database:

```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";

createConnection(/*...*/).then(async connection => {

    /*...*/
    let photoToRemove = await photoRepository.findOne(1);
    await photoRepository.remove(photoToRemove);

}).catch(error => console.log(error));
```

Now photo with `id = 1` will be removed from the database.

### Creating a one-to-one relation

Let's create a one-to-one relation with another class.
Let's create a new class in `PhotoMetadata.ts`. This PhotoMetadata class is supposed to contain our photo's additional meta-information:

```typescript
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";
import { Photo } from "./Photo";

@Entity()
export class PhotoMetadata {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("int")
    height: number;

    @Column("int")
    width: number;

    @Column()
    orientation: string;

    @Column()
    compressed: boolean;

    @Column()
    comment: string;

    @OneToOne(type => Photo)
    @JoinColumn()
    photo: Photo;
}
```

Here, we are using a new decorator called `@OneToOne`. It allows us to create a one-to-one relationship between two entities.
`type => Photo` is a function that returns the class of the entity with which we want to make our relationship.
We are forced to use a function that returns a class, instead of using the class directly, because of the language specifics.
We can also write it as `() => Photo`, but we use `type => Photo` as a convention to increase code readability.
The type variable itself does not contain anything.

We also add a `@JoinColumn` decorator, which indicates that this side of the relationship will own the relationship.
Relations can be unidirectional or bidirectional.
Only one side of relational can be owning.
Using `@JoinColumn` decorator is required on the owner side of the relationship.

If you run the app, you'll see a newly generated table, and it will contain a column with a foreign key for the photo relation:

```shell
+-------------+--------------+----------------------------+
|                     photo_metadata                      |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| height      | int(11)      |                            |
| width       | int(11)      |                            |
| comment     | varchar(255) |                            |
| compressed  | boolean      |                            |
| orientation | varchar(255) |                            |
| photoId     | int(11)      | FOREIGN KEY                |
+-------------+--------------+----------------------------+
```

### Save a one-to-one relation

Now let's save a photo, its metadata and attach them to each other.

```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";
import { PhotoMetadata } from "./entity/PhotoMetadata";

createConnection(/*...*/).then(async connection => {

    // create a photo
    let photo = new Photo();
    photo.name = "Me and Bears";
    photo.description = "I am near polar bears";
    photo.filename = "photo-with-bears.jpg";
    photo.views = 1;
    photo.isPublished = true;

    // create a photo metadata
    let metadata = new PhotoMetadata();
    metadata.height = 640;
    metadata.width = 480;
    metadata.compressed = true;
    metadata.comment = "cybershoot";
    metadata.orientation = "portrait";
    metadata.photo = photo; // this way we connect them

    // get entity repositories
    let photoRepository = connection.getRepository(Photo);
    let metadataRepository = connection.getRepository(PhotoMetadata);

    // first we should save a photo
    await photoRepository.save(photo);

    // photo is saved. Now we need to save a photo metadata
    await metadataRepository.save(metadata);

    // done
    console.log("Metadata is saved, and relation between metadata and photo is created in the database too");

}).catch(error => console.log(error));
```

### Inverse side of the relationship

Relations can be unidirectional or bidirectional.
Currently, our relation between PhotoMetadata and Photo is unidirectional.
The owner of the relation is PhotoMetadata, and Photo doesn't know anything about PhotoMetadata.
This makes it complicated to access PhotoMetadata from the Photo side.
To fix this issue we should add an inverse relation, and make relations between PhotoMetadata and Photo bidirectional.
Let's modify our entities:

```typescript
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";
import { Photo } from "./Photo";

@Entity()
export class PhotoMetadata {

    /* ... other columns */

    @OneToOne(type => Photo, photo => photo.metadata)
    @JoinColumn()
    photo: Photo;
}
```

```typescript
import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from "typeorm";
import { PhotoMetadata } from "./PhotoMetadata";

@Entity()
export class Photo {

    /* ... other columns */

    @OneToOne(type => PhotoMetadata, photoMetadata => photoMetadata.photo)
    metadata: PhotoMetadata;
}
```

`photo => photo.metadata` is a function that returns the name of the inverse side of the relation.
Here we show that the metadata property of the Photo class is where we store PhotoMetadata in the Photo class.
Instead of passing a function that returns a property of the photo, you could alternatively simply pass a string to `@OneToOne` decorator, like `"metadata"`.
But we used this function-typed approach to make our refactoring easier.

Note that we should use `@JoinColumn` decorator only on one side of a relation.
Whichever side you put this decorator on will be the owning side of the relationship.
The owning side of a relationship contains a column with a foreign key in the database.

### Loading objects with their relations

Now let's load our photo and its photo metadata in a single query.
There are two ways to do it - using `find*` methods or using `QueryBuilder` functionality.
Let's use `find*` methods first.
`find*` methods allow you to specify an object with the `FindOneOptions` / `FindManyOptions` interface.

```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";
import { PhotoMetadata } from "./entity/PhotoMetadata";

createConnection(/*...*/).then(async connection => {

    /*...*/
    let photoRepository = connection.getRepository(Photo);
    let photos = await photoRepository.find({ relations: ["metadata"] });

}).catch(error => console.log(error));
```

Here, photos will contain an array of photos from the database, and each photo will contain its photo metadata.
Learn more about Find Options in [this documentation](./docs/find-options.md).

Using find options is good and dead simple, but if you need a more complex query, you should use `QueryBuilder` instead.
`QueryBuilder` allows more complex queries to be used in an elegant way:

```typescript
import { createConnection } from "typeorm";
import { Photo } from "./entity/Photo";
import { PhotoMetadata } from "./entity/PhotoMetadata";

createConnection(/*...*/).then(async connection => {

    /*...*/
    let photos = await connection
            .getRepository(Photo)
            .createQueryBuilder("photo")
            .innerJoinAndSelect("photo.metadata", "metadata")
            .getMany();


}).catch(error => console.log(error));
```

`QueryBuilder` allows creation and execution of SQL queries of almost any complexity.
When you work with `QueryBuilder`, think like you are creating an SQL query.
In this example, "photo" and "metadata" are aliases applied to selected photos.
You use aliases to access columns and properties of the selected data.

### Using cascades to automatically save related objects

We can setup cascade options in our relations, in the cases when we want our related object to be saved whenever the other object is saved.
Let's change our photo's `@OneToOne` decorator a bit:

```typescript
export class Photo {
    /// ... other columns

    @OneToOne(type => PhotoMetadata, metadata => metadata.photo, {
        cascade: true,
    })
    metadata: PhotoMetadata;
}
```

Using `cascade` allows us not to separately save photo and separately save metadata objects now.
Now we can simply save a photo object, and the metadata object will be saved automatically because of cascade options.

```typescript
createConnection(options).then(async connection => {

    // create photo object
    let photo = new Photo();
    photo.name = "Me and Bears";
    photo.description = "I am near polar bears";
    photo.filename = "photo-with-bears.jpg";
    photo.isPublished = true;

    // create photo metadata object
    let metadata = new PhotoMetadata();
    metadata.height = 640;
    metadata.width = 480;
    metadata.compressed = true;
    metadata.comment = "cybershoot";
    metadata.orientation = "portrait";

    photo.metadata = metadata; // this way we connect them

    // get repository
    let photoRepository = connection.getRepository(Photo);

    // saving a photo also save the metadata
    await photoRepository.save(photo);

    console.log("Photo is saved, photo metadata is saved too.")

}).catch(error => console.log(error));
```

Notice that we now set the photo's `metadata` property, instead of the metadata's `photo` property as before. The `cascade` feature only works if you connect the photo to its metadata from the photo's side. If you set the metadata's side, the metadata would not be saved automatically.

### Creating a many-to-one / one-to-many relation

Let's create a many-to-one / one-to-many relation.
Let's say a photo has one author, and each author can have many photos.
First, let's create an `Author` class:

```typescript
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, JoinColumn } from "typeorm";
import { Photo } from "./Photo";

@Entity()
export class Author {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @OneToMany(type => Photo, photo => photo.author) // note: we will create author property in the Photo class below
    photos: Photo[];
}
```

`Author` contains an inverse side of a relation.
`OneToMany` is always an inverse side of relation, and it can't exist without `ManyToOne` on the other side of the relation.

Now let's add the owner side of the relation into the Photo entity:

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { PhotoMetadata } from "./PhotoMetadata";
import { Author } from "./Author";

@Entity()
export class Photo {

    /* ... other columns */

    @ManyToOne(type => Author, author => author.photos)
    author: Author;
}
```

In many-to-one / one-to-many relation, the owner side is always many-to-one.
It means that the class that uses `@ManyToOne` will store the id of the related object.

After you run the application, the ORM will create the `author` table:


```shell
+-------------+--------------+----------------------------+
|                          author                         |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| name        | varchar(255) |                            |
+-------------+--------------+----------------------------+
```

It will also modify the `photo` table, adding a new `author` column and creating a foreign key for it:

```shell
+-------------+--------------+----------------------------+
|                         photo                           |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| name        | varchar(255) |                            |
| description | varchar(255) |                            |
| filename    | varchar(255) |                            |
| isPublished | boolean      |                            |
| authorId    | int(11)      | FOREIGN KEY                |
+-------------+--------------+----------------------------+
```

### Creating a many-to-many relation

Let's create a many-to-many relation.
Let's say a photo can be in many albums, and each album can contain many photos.
Let's create an `Album` class:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from "typeorm";

@Entity()
export class Album {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToMany(type => Photo, photo => photo.albums)
    @JoinTable()
    photos: Photo[];
}
```

`@JoinTable` is required to specify that this is the owner side of the relationship.

Now let's add the inverse side of our relation to the `Photo` class:

```typescript
export class Photo {
    /// ... other columns

    @ManyToMany(type => Album, album => album.photos)
    albums: Album[];
}
```

After you run the application, the ORM will create a **album_photos_photo_albums** *junction table*:

```shell
+-------------+--------------+----------------------------+
|                album_photos_photo_albums                |
+-------------+--------------+----------------------------+
| album_id    | int(11)      | PRIMARY KEY FOREIGN KEY    |
| photo_id    | int(11)      | PRIMARY KEY FOREIGN KEY    |
+-------------+--------------+----------------------------+
```

Don't forget to register the `Album` class with your connection in the ORM:

```typescript
const options: ConnectionOptions = {
    // ... other options
    entities: [Photo, PhotoMetadata, Author, Album]
};
```

Now let's insert albums and photos to our database:

```typescript
let connection = await createConnection(options);

// create a few albums
let album1 = new Album();
album1.name = "Bears";
await connection.manager.save(album1);

let album2 = new Album();
album2.name = "Me";
await connection.manager.save(album2);

// create a few photos
let photo = new Photo();
photo.name = "Me and Bears";
photo.description = "I am near polar bears";
photo.filename = "photo-with-bears.jpg";
photo.views = 1
photo.isPublished = true
photo.albums = [album1, album2];
await connection.manager.save(photo);

// now our photo is saved and albums are attached to it
// now lets load them:
const loadedPhoto = await connection
    .getRepository(Photo)
    .findOne(1, { relations: ["albums"] });
```

`loadedPhoto` will be equal to:

```typescript
{
    id: 1,
    name: "Me and Bears",
    description: "I am near polar bears",
    filename: "photo-with-bears.jpg",
    albums: [{
        id: 1,
        name: "Bears"
    }, {
        id: 2,
        name: "Me"
    }]
}
```

### Using QueryBuilder

You can use QueryBuilder to build SQL queries of almost any complexity. For example, you can do this:

```typescript
let photos = await connection
    .getRepository(Photo)
    .createQueryBuilder("photo") // first argument is an alias. Alias is what you are selecting - photos. You must specify it.
    .innerJoinAndSelect("photo.metadata", "metadata")
    .leftJoinAndSelect("photo.albums", "album")
    .where("photo.isPublished = true")
    .andWhere("(photo.name = :photoName OR photo.name = :bearName)")
    .orderBy("photo.id", "DESC")
    .skip(5)
    .take(10)
    .setParameters({ photoName: "My", bearName: "Mishka" })
    .getMany();
```

This query selects all published photos with "My" or "Mishka" names.
It will select results from position 5 (pagination offset),
and will select only 10 results (pagination limit).
The selection result will be ordered by id in descending order.
The photo's albums will be left-joined and their metadata will be inner joined.

You'll use the query builder in your application a lot.
Learn more about QueryBuilder [here](./docs/select-query-builder.md).

## Samples

Take a look at the samples in [sample](https://github.com/typeorm/typeorm/tree/master/sample) for examples of usage.

There are a few repositories which you can clone and start with:

* [Example how to use TypeORM with TypeScript](https://github.com/typeorm/typescript-example)
* [Example how to use TypeORM with JavaScript](https://github.com/typeorm/javascript-example)
* [Example how to use TypeORM with JavaScript and Babel](https://github.com/typeorm/babel-example)
* [Example how to use TypeORM with TypeScript and SystemJS in Browser](https://github.com/typeorm/browser-example)
* [Example how to use Express and TypeORM](https://github.com/typeorm/typescript-express-example)
* [Example how to use Koa and TypeORM](https://github.com/typeorm/typescript-koa-example)
* [Example how to use TypeORM with MongoDB](https://github.com/typeorm/mongo-typescript-example)
* [Example how to use TypeORM in a Cordova/PhoneGap app](https://github.com/typeorm/cordova-example)
* [Example how to use TypeORM with an Ionic app](https://github.com/typeorm/ionic-example)
* [Example how to use TypeORM with React Native](https://github.com/typeorm/react-native-example)
* [Example how to use TypeORM with Nativescript-Vue](https://github.com/typeorm/nativescript-vue-typeorm-sample)
* [Example how to use TypeORM with Nativescript-Angular](https://github.com/betov18x/nativescript-angular-typeorm-example)
* [Example how to use TypeORM with Electron using JavaScript](https://github.com/typeorm/electron-javascript-example)
* [Example how to use TypeORM with Electron using TypeScript](https://github.com/typeorm/electron-typescript-example)

## Extensions

There are several extensions that simplify working with TypeORM and integrating it with other modules:

* [TypeORM + GraphQL framework](http://vesper-framework.com)
* [TypeORM integration](https://github.com/typeorm/typeorm-typedi-extensions) with [TypeDI](https://github.com/pleerock/typedi)
* [TypeORM integration](https://github.com/typeorm/typeorm-routing-controllers-extensions) with [routing-controllers](https://github.com/pleerock/routing-controllers)
* Models generation from existing database - [typeorm-model-generator](https://github.com/Kononnable/typeorm-model-generator)
* Fixtures loader - [typeorm-fixtures-cli](https://github.com/RobinCK/typeorm-fixtures)
* ER Diagram generator - [typeorm-uml](https://github.com/eugene-manuilov/typeorm-uml/)

## Contributing

Learn about contribution [here](https://github.com/typeorm/typeorm/blob/master/CONTRIBUTING.md) and how to setup your development environment [here](https://github.com/typeorm/typeorm/blob/master/DEVELOPER.md).

This project exists thanks to all the people who contribute:

<a href="https://github.com/typeorm/typeorm/graphs/contributors"><img src="https://opencollective.com/typeorm/contributors.svg?width=890&showBtn=false" /></a>

## Sponsors

Open source is hard and time-consuming. If you want to invest into TypeORM's future you can become a sponsor and allow our core team to spend more time on TypeORM's improvements and new features. [Become a sponsor](https://opencollective.com/typeorm)

<a href="https://opencollective.com/typeorm" target="_blank"><img src="https://opencollective.com/typeorm/tiers/sponsor.svg?width=890"></a>

## Gold Sponsors

Become a gold sponsor and get a premium technical support from our core contributors. [Become a gold sponsor](https://opencollective.com/typeorm)

<a href="https://opencollective.com/typeorm" target="_blank"><img src="https://opencollective.com/typeorm/tiers/gold-sponsor.svg?width=890"></a>
