# Select using Query Builder

* [What is `QueryBuilder`](#what-is-querybuilder)
* [Important note when using the `QueryBuilder`](#important-note-when-using-the-querybuilder)
* [How to create and use a `QueryBuilder`](#how-to-create-and-use-a-querybuilder)
* [Getting values using QueryBuilder](#getting-values-using-querybuilder)
* [What are aliases for?](#what-are-aliases-for)
* [Using parameters to escape data](#using-parameters-to-escape-data)
* [Adding `WHERE` expression](#adding-where-expression)
* [Adding `HAVING` expression](#adding-having-expression)
* [Adding `ORDER BY` expression](#adding-order-by-expression)
* [Adding `GROUP BY` expression](#adding-group-by-expression)
* [Adding `LIMIT` expression](#adding-limit-expression)
* [Adding `OFFSET` expression](#adding-offset-expression)
* [Joining relations](#joining-relations)
* [Inner and left joins](#inner-and-left-joins)
* [Join without selection](#join-without-selection)
* [Joining any entity or table](#joining-any-entity-or-table)
* [Joining and mapping functionality](#joining-and-mapping-functionality)
* [Getting the generated query](#getting-the-generated-query)
* [Getting raw results](#getting-raw-results)
* [Streaming result data](#streaming-result-data)
* [Using pagination](#using-pagination)
* [Set locking](#set-locking)
* [Use custom index](#use-custom-index)
* [Max execution time](#max-execution-time)
* [Partial selection](#partial-selection)
* [Using subqueries](#using-subqueries)
* [Hidden Columns](#hidden-columns)

## What is `QueryBuilder`

`QueryBuilder` is one of the most powerful features of TypeORM -
it allows you to build SQL queries using elegant and convenient syntax,
execute them and get automatically transformed entities.

Simple example of `QueryBuilder`:

```typescript
const firstUser = await connection
    .getRepository(User)
    .createQueryBuilder("user")
    .where("user.id = :id", { id: 1 })
    .getOne();
```

It builds the following SQL query:

```sql
SELECT
    user.id as userId,
    user.firstName as userFirstName,
    user.lastName as userLastName
FROM users user
WHERE user.id = 1
```

and returns you an instance of `User`:

```
User {
    id: 1,
    firstName: "Timber",
    lastName: "Saw"
}
```

## Important note when using the `QueryBuilder`

When using the `QueryBuilder`, you need to provide unique parameters in your `WHERE` expressions. **This will not work**:

```TypeScript
const result = await getConnection()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.linkedSheep', 'linkedSheep')
    .leftJoinAndSelect('user.linkedCow', 'linkedCow')
    .where('user.linkedSheep = :id', { id: sheepId })
    .andWhere('user.linkedCow = :id', { id: cowId });
```

... but this will:

```TypeScript
const result = await getConnection()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.linkedSheep', 'linkedSheep')
    .leftJoinAndSelect('user.linkedCow', 'linkedCow')
    .where('user.linkedSheep = :sheepId', { sheepId })
    .andWhere('user.linkedCow = :cowId', { cowId });
```

Note that we uniquely named `:sheepId` and `:cowId` instead of using `:id` twice for different parameters.

## How to create and use a `QueryBuilder`

There are several ways how you can create a `Query Builder`:

* Using connection:

    ```typescript
    import {getConnection} from "typeorm";

    const user = await getConnection()
        .createQueryBuilder()
        .select("user")
        .from(User, "user")
        .where("user.id = :id", { id: 1 })
        .getOne();
    ```

* Using entity manager:

    ```typescript
    import {getManager} from "typeorm";

    const user = await getManager()
        .createQueryBuilder(User, "user")
        .where("user.id = :id", { id: 1 })
        .getOne();
    ```

* Using repository:

    ```typescript
    import {getRepository} from "typeorm";

    const user = await getRepository(User)
        .createQueryBuilder("user")
        .where("user.id = :id", { id: 1 })
        .getOne();
    ```

There are 5 different `QueryBuilder` types available:

* `SelectQueryBuilder` - used to build and execute `SELECT` queries. Example:

    ```typescript
    import {getConnection} from "typeorm";

    const user = await getConnection()
        .createQueryBuilder()
        .select("user")
        .from(User, "user")
        .where("user.id = :id", { id: 1 })
        .getOne();
    ```

* `InsertQueryBuilder` - used to build and execute `INSERT` queries. Example:

    ```typescript
    import {getConnection} from "typeorm";

    await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values([
            { firstName: "Timber", lastName: "Saw" },
            { firstName: "Phantom", lastName: "Lancer" }
         ])
        .execute();
    ```

* `UpdateQueryBuilder` - used to build and execute `UPDATE` queries. Example:

    ```typescript
    import {getConnection} from "typeorm";

    await getConnection()
        .createQueryBuilder()
        .update(User)
        .set({ firstName: "Timber", lastName: "Saw" })
        .where("id = :id", { id: 1 })
        .execute();
    ```
* `DeleteQueryBuilder` - used to build and execute `DELETE` queries. Example:

    ```typescript
    import {getConnection} from "typeorm";

    await getConnection()
        .createQueryBuilder()
        .delete()
        .from(User)
        .where("id = :id", { id: 1 })
        .execute();
    ```

* `RelationQueryBuilder` - used to build and execute relation-specific operations [TBD].

You can switch between different types of query builder within any of them,
once you do, you will get a new instance of query builder (unlike all other methods).

## Getting values using `QueryBuilder`

To get a single result from the database,
for example to get a user by id or name, you must use `getOne`:

```typescript
const timber = await getRepository(User)
    .createQueryBuilder("user")
    .where("user.id = :id OR user.name = :name", { id: 1, name: "Timber" })
    .getOne();
```

`getOneOrFail` will get a single result from the database, but if
no result exists it will throw an `EntityNotFoundError`:

```typescript
const timber = await getRepository(User)
    .createQueryBuilder("user")
    .where("user.id = :id OR user.name = :name", { id: 1, name: "Timber" })
    .getOneOrFail();
```

To get multiple results from the database,
for example, to get all users from the database, use `getMany`:

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .getMany();
```

There are two types of results you can get using select query builder: **entities** or **raw results**.
Most of the time, you need to select real entities from your database, for example, users.
For this purpose, you use `getOne` and `getMany`.
But sometimes you need to select some specific data, let's say the *sum of all user photos*.
This data is not an entity, it's called raw data.
To get raw data, you use `getRawOne` and `getRawMany`.
Examples:

```typescript
const { sum } = await getRepository(User)
    .createQueryBuilder("user")
    .select("SUM(user.photosCount)", "sum")
    .where("user.id = :id", { id: 1 })
    .getRawOne();
```

```typescript
const photosSums = await getRepository(User)
    .createQueryBuilder("user")
    .select("user.id")
    .addSelect("SUM(user.photosCount)", "sum")
    .groupBy("user.id")
    .getRawMany();

// result will be like this: [{ id: 1, sum: 25 }, { id: 2, sum: 13 }, ...]
```

## What are aliases for?

We used `createQueryBuilder("user")`. But what is "user"?
It's just a regular SQL alias.
We use aliases everywhere, except when we work with selected data.

`createQueryBuilder("user")` is equivalent to:

```typescript
createQueryBuilder()
    .select("user")
    .from(User, "user")
```

Which will result in the following sql query:

```sql
SELECT ... FROM users user
```

In this SQL query, `users` is the table name, and `user` is an alias we assign to this table.
Later we use this alias to access the table:

```typescript
createQueryBuilder()
    .select("user")
    .from(User, "user")
    .where("user.name = :name", { name: "Timber" })
```

Which produces the following SQL query:

```sql
SELECT ... FROM users user WHERE user.name = 'Timber'
```

See, we used the users table by using the `user` alias we assigned when we created a query builder.

One query builder is not limited to one alias, they can have multiple aliases.
Each select can have its own alias,
you can select from multiple tables each with its own alias,
you can join multiple tables each with its own alias.
You can use those aliases to access tables are you selecting (or data you are selecting).

## Using parameters to escape data

We used `where("user.name = :name", { name: "Timber" })`.
What does `{ name: "Timber" }` stand for? It's a parameter we used to prevent SQL injection.
We could have written: `where("user.name = '" + name + "')`,
however this is not safe, as it opens the code to SQL injections.
The safe way is to use this special syntax: `where("user.name = :name", { name: "Timber" })`,
where `:name` is a parameter name and the value is specified in an object: `{ name: "Timber" }`.

```typescript
.where("user.name = :name", { name: "Timber" })
```

is a shortcut for:

```typescript
.where("user.name = :name")
.setParameter("name", "Timber")
```

Note: do not use the same parameter name for different values across the query builder. Values will be overridden if you set them multiple times.

You can also supply an array of values, and have them transformed into a list of values in the SQL
statement, by using the special expansion syntax:

```typescript
.where("user.name IN (:...names)", { names: [ "Timber", "Cristal", "Lina" ] })
```

Which becomes:

```sql
WHERE user.name IN ('Timber', 'Cristal', 'Lina')
```

## Adding `WHERE` expression

Adding a `WHERE` expression is as easy as:

```typescript
createQueryBuilder("user")
    .where("user.name = :name", { name: "Timber" })
```

Which will produce:

```sql
SELECT ... FROM users user WHERE user.name = 'Timber'
```

You can add `AND` into an existing `WHERE` expression:

```typescript
createQueryBuilder("user")
    .where("user.firstName = :firstName", { firstName: "Timber" })
    .andWhere("user.lastName = :lastName", { lastName: "Saw" });
```

Which will produce the following SQL query:

```sql
SELECT ... FROM users user WHERE user.firstName = 'Timber' AND user.lastName = 'Saw'
```

You can add `OR` into an existing `WHERE` expression:

```typescript
createQueryBuilder("user")
    .where("user.firstName = :firstName", { firstName: "Timber" })
    .orWhere("user.lastName = :lastName", { lastName: "Saw" });
```

Which will produce the following SQL query:

```sql
SELECT ... FROM users user WHERE user.firstName = 'Timber' OR user.lastName = 'Saw'
```

You can do an `IN` query with the `WHERE` expression:

```typescript
createQueryBuilder("user")
    .where("user.id IN (:...ids)", { ids: [1, 2, 3, 4] })
```

Which will produce the following SQL query:

```sql
SELECT ... FROM users user WHERE user.id IN (1, 2, 3, 4)
```


You can add a complex `WHERE` expression into an existing `WHERE` using `Brackets`

```typescript
createQueryBuilder("user")
    .where("user.registered = :registered", { registered: true })
    .andWhere(new Brackets(qb => {
        qb.where("user.firstName = :firstName", { firstName: "Timber" })
          .orWhere("user.lastName = :lastName", { lastName: "Saw" })
    }))
```

Which will produce the following SQL query:

```sql
SELECT ... FROM users user WHERE user.registered = true AND (user.firstName = 'Timber' OR user.lastName = 'Saw')
```

You can combine as many `AND` and `OR` expressions as you need.
If you use `.where` more than once you'll override all previous `WHERE` expressions.

Note: be careful with `orWhere` - if you use complex expressions with both `AND` and `OR` expressions,
keep in mind that they are stacked without any pretences.
Sometimes you'll need to create a where string instead, and avoid using `orWhere`.

## Adding `HAVING` expression

Adding a `HAVING` expression is easy as:

```typescript
createQueryBuilder("user")
    .having("user.name = :name", { name: "Timber" })
```

Which will produce following SQL query:

```sql
SELECT ... FROM users user HAVING user.name = 'Timber'
```

You can add `AND` into an exist `HAVING` expression:

```typescript
createQueryBuilder("user")
    .having("user.firstName = :firstName", { firstName: "Timber" })
    .andHaving("user.lastName = :lastName", { lastName: "Saw" });
```

Which will produce the following SQL query:

```sql
SELECT ... FROM users user HAVING user.firstName = 'Timber' AND user.lastName = 'Saw'
```

You can add `OR` into a exist `HAVING` expression:

```typescript
createQueryBuilder("user")
    .having("user.firstName = :firstName", { firstName: "Timber" })
    .orHaving("user.lastName = :lastName", { lastName: "Saw" });
```

Which will produce the following SQL query:

```sql
SELECT ... FROM users user HAVING user.firstName = 'Timber' OR user.lastName = 'Saw'
```

You can combine as many `AND` and `OR` expressions as you need.
If you use `.having` more than once you'll override all previous `HAVING` expressions.

## Adding `ORDER BY` expression

Adding an `ORDER BY` expression is easy as:

```typescript
createQueryBuilder("user")
    .orderBy("user.id")
```

Which will produce:

```sql
SELECT ... FROM users user ORDER BY user.id
```

You can change the ordering direction from ascending to descending (or versa):

```typescript
createQueryBuilder("user")
    .orderBy("user.id", "DESC")

createQueryBuilder("user")
    .orderBy("user.id", "ASC")
```

You can add multiple order-by criteria:

```typescript
createQueryBuilder("user")
    .orderBy("user.name")
    .addOrderBy("user.id");
```

You can also use a map of order-by fields:

```typescript
createQueryBuilder("user")
    .orderBy({
        "user.name": "ASC",
        "user.id": "DESC"
    });
```

If you use `.orderBy` more than once you'll override all previous `ORDER BY` expressions.

## Adding `DISTINCT ON` expression (Postgres only)
When using both distinct-on with an order-by expression, the distinct-on expression must match the leftmost order-by.
The distinct-on expressions are interpreted using the same rules as order-by. Please note that, using distinct-on without an order-by expression means that the first row of each set is unpredictable.

Adding a `DISTINCT ON` expression is easy as:

```typescript
createQueryBuilder("user")
    .distinctOn(["user.id"])
    .orderBy("user.id")
```

Which will produce:

```sql
SELECT DISTINCT ON (user.id) ... FROM users user ORDER BY user.id
```

## Adding `GROUP BY` expression

Adding a `GROUP BY` expression is easy as:

```typescript
createQueryBuilder("user")
    .groupBy("user.id")
```

Which will produce the following SQL query:

```sql
SELECT ... FROM users user GROUP BY user.id
```
To add more group-by criteria use `addGroupBy`:

```typescript
createQueryBuilder("user")
    .groupBy("user.name")
    .addGroupBy("user.id");
```

If you use `.groupBy` more than once you'll override all previous `GROUP BY` expressions.

## Adding `LIMIT` expression

Adding a `LIMIT` expression is easy as:

```typescript
createQueryBuilder("user")
    .limit(10)
```

Which will produce the following SQL query:

```sql
SELECT ... FROM users user LIMIT 10
```

The resulting SQL query depends on the type of database (SQL, mySQL, Postgres, etc).
Note: LIMIT may not work as you may expect if you are using complex queries with joins or subqueries.
If you are using pagination, it's recommended to use `take` instead.

## Adding `OFFSET` expression

Adding an SQL `OFFSET` expression is easy as:

```typescript
createQueryBuilder("user")
    .offset(10)
```

Which will produce the following SQL query:

```sql
SELECT ... FROM users user OFFSET 10
```

The resulting SQL query depends on the type of database (SQL, mySQL, Postgres, etc).
Note: OFFSET may not work as you may expect if you are using complex queries with joins or subqueries.
If you are using pagination, it's recommended to use `skip` instead.

## Joining relations

Let's say you have the following entities:

```typescript
import {Entity, PrimaryGeneratedColumn, Column, OneToMany} from "typeorm";
import {Photo} from "./Photo";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @OneToMany(type => Photo, photo => photo.user)
    photos: Photo[];
}
```

```typescript
import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from "typeorm";
import {User} from "./User";

@Entity()
export class Photo {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    url: string;

    @ManyToOne(type => User, user => user.photos)
    user: User;
}
```

Now let's say you want to load user "Timber" with all of his photos:

```typescript
const user = await createQueryBuilder("user")
    .leftJoinAndSelect("user.photos", "photo")
    .where("user.name = :name", { name: "Timber" })
    .getOne();
```

You'll get the following result:

```typescript
{
    id: 1,
    name: "Timber",
    photos: [{
        id: 1,
        url: "me-with-chakram.jpg"
    }, {
        id: 2,
        url: "me-with-trees.jpg"
    }]
}
```

As you can see `leftJoinAndSelect` automatically loaded all of Timber's photos.
The first argument is the relation you want to load and the second argument is an alias you assign to this relation's table.
You can use this alias anywhere in query builder.
For example, let's take all Timber's photos which aren't removed.

```typescript
const user = await createQueryBuilder("user")
    .leftJoinAndSelect("user.photos", "photo")
    .where("user.name = :name", { name: "Timber" })
    .andWhere("photo.isRemoved = :isRemoved", { isRemoved: false })
    .getOne();
```

This will generate following sql query:

```sql
SELECT user.*, photo.* FROM users user
    LEFT JOIN photos photo ON photo.user = user.id
    WHERE user.name = 'Timber' AND photo.isRemoved = FALSE
```

You can also add conditions to the join expression instead of using "where":

```typescript
const user = await createQueryBuilder("user")
    .leftJoinAndSelect("user.photos", "photo", "photo.isRemoved = :isRemoved", { isRemoved: false })
    .where("user.name = :name", { name: "Timber" })
    .getOne();
```

This will generate the following sql query:

```sql
SELECT user.*, photo.* FROM users user
    LEFT JOIN photos photo ON photo.user = user.id AND photo.isRemoved = FALSE
    WHERE user.name = 'Timber'
```

## Inner and left joins

If you want to use `INNER JOIN` instead of `LEFT JOIN` just use `innerJoinAndSelect` instead:

```typescript
const user = await createQueryBuilder("user")
    .innerJoinAndSelect("user.photos", "photo", "photo.isRemoved = :isRemoved", { isRemoved: false })
    .where("user.name = :name", { name: "Timber" })
    .getOne();
```

This will generate:

```sql
SELECT user.*, photo.* FROM users user
    INNER JOIN photos photo ON photo.user = user.id AND photo.isRemoved = FALSE
    WHERE user.name = 'Timber'
```

The difference between `LEFT JOIN` and `INNER JOIN` is that `INNER JOIN` won't return a user if it does not have any photos.
`LEFT JOIN` will return you the user even if it doesn't have photos.
To learn more about different join types, refer to the [SQL documentation](https://msdn.microsoft.com/en-us/library/zt8wzxy4.aspx).

## Join without selection

You can join data without its selection.
To do that, use `leftJoin` or `innerJoin`:

```typescript
const user = await createQueryBuilder("user")
    .innerJoin("user.photos", "photo")
    .where("user.name = :name", { name: "Timber" })
    .getOne();
```

This will generate:

```sql
SELECT user.* FROM users user
    INNER JOIN photos photo ON photo.user = user.id
    WHERE user.name = 'Timber'
```

This will select Timber if he has photos, but won't return his photos.

## Joining any entity or table

You can join not only relations, but also other unrelated entities or tables.
Examples:

```typescript
const user = await createQueryBuilder("user")
    .leftJoinAndSelect(Photo, "photo", "photo.userId = user.id")
    .getMany();
```

```typescript
const user = await createQueryBuilder("user")
    .leftJoinAndSelect("photos", "photo", "photo.userId = user.id")
    .getMany();
```

## Joining and mapping functionality

Add `profilePhoto` to `User` entity and you can map any data into that property using `QueryBuilder`:

```typescript
export class User {    
    /// ...
    profilePhoto: Photo;

}
```

```typescript
const user = await createQueryBuilder("user")
    .leftJoinAndMapOne("user.profilePhoto", "user.photos", "photo", "photo.isForProfile = TRUE")
    .where("user.name = :name", { name: "Timber" })
    .getOne();
```

This will load Timber's profile photo and set it to `user.profilePhoto`.
If you want to load and map a single entity use `leftJoinAndMapOne`.
If you want to load and map multiple entities use `leftJoinAndMapMany`.

## Getting the generated query

Sometimes you may want to get the SQL query generated by `QueryBuilder`.
To do so, use `getSql`:

```typescript
const sql = createQueryBuilder("user")
    .where("user.firstName = :firstName", { firstName: "Timber" })
    .orWhere("user.lastName = :lastName", { lastName: "Saw" })
    .getSql();
```

For debugging purposes you can use `printSql`:

```typescript
const users = await createQueryBuilder("user")
    .where("user.firstName = :firstName", { firstName: "Timber" })
    .orWhere("user.lastName = :lastName", { lastName: "Saw" })
    .printSql()
    .getMany();
```

This query will return users and print the used sql statement to the console.

## Getting raw results

There are two types of results you can get using select query builder: **entities** and **raw results**.
Most of the time, you need to select real entities from your database, for example, users.
For this purpose, you use `getOne` and `getMany`.
However, sometimes you need to select specific data, like the *sum of all user photos*.
Such data is not a entity, it's called raw data.
To get raw data, you use `getRawOne` and `getRawMany`.
Examples:

```typescript
const { sum } = await getRepository(User)
    .createQueryBuilder("user")
    .select("SUM(user.photosCount)", "sum")
    .where("user.id = :id", { id: 1 })
    .getRawOne();
```

```typescript
const photosSums = await getRepository(User)
    .createQueryBuilder("user")
    .select("user.id")
    .addSelect("SUM(user.photosCount)", "sum")
    .groupBy("user.id")
    .getRawMany();

// result will be like this: [{ id: 1, sum: 25 }, { id: 2, sum: 13 }, ...]
```

## Streaming result data

You can use `stream` which returns you a stream.
Streaming returns you raw data and you must handle entity transformation manually:

```typescript
const stream = await getRepository(User)
    .createQueryBuilder("user")
    .where("user.id = :id", { id: 1 })
    .stream();
```

## Using pagination

Most of the time when you develop an application, you need pagination functionality.
This is used if you have pagination, page slider, or infinite scroll components in your application.

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .leftJoinAndSelect("user.photos", "photo")
    .take(10)
    .getMany();
```

This will give you the first 10 users with their photos.

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .leftJoinAndSelect("user.photos", "photo")
    .skip(10)
    .getMany();
```

This will give you all except the first 10 users with their photos.
You can combine those methods:

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .leftJoinAndSelect("user.photos", "photo")
    .skip(5)
    .take(10)
    .getMany();
```

This will skip the first 5 users and take 10 users after them.


`take` and `skip` may look like we are using `limit` and `offset`, but they aren't.
`limit` and `offset` may not work as you expect once you have more complicated queries with joins or subqueries.
Using `take` and `skip` will prevent those issues.

## Set locking

QueryBuilder supports both optimistic and pessimistic locking.
To use pessimistic read locking use the following method:

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .setLock("pessimistic_read")
    .getMany();
```

To use pessimistic write locking use the following method:

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .setLock("pessimistic_write")
    .getMany();
```

To use dirty read locking use the following method:

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .setLock("dirty_read")
    .getMany();
```

To use optimistic locking use the following method:

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .setLock("optimistic", existUser.version)
    .getMany();
```

Optimistic locking works in conjunction with both `@Version` and `@UpdatedDate` decorators.

## Use custom index

We need provide a certain index for database server to use in some cases. Only MySQL driver is supporting at the moment:

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .useIndex("my_index") // name of index
    .getMany();
```

## Max execution time

We can drop slow query to avoid crashing the server. Only MySQL driver is supported at the moment:

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .maxExecutionTime(1000) // milliseconds.
    .getMany();
```

## Partial selection

If you want to select only some entity properties, you can use the following syntax:

```typescript
const users = await getRepository(User)
    .createQueryBuilder("user")
    .select([
        "user.id",
        "user.name"
    ])
    .getMany();
```

This will only select the `id` and `name` of `User`.

## Using subqueries

You can easily create subqueries. Subqueries are supported in `FROM`, `WHERE` and `JOIN` expressions.
Example:

```typescript
const qb = await getRepository(Post).createQueryBuilder("post");
const posts = qb
    .where("post.title IN " + qb.subQuery().select("user.name").from(User, "user").where("user.registered = :registered").getQuery())
    .setParameter("registered", true)
    .getMany();
```

A more elegant way to do the same:

```typescript
const posts = await connection.getRepository(Post)
    .createQueryBuilder("post")
    .where(qb => {
        const subQuery = qb.subQuery()
            .select("user.name")
            .from(User, "user")
            .where("user.registered = :registered")
            .getQuery();
        return "post.title IN " + subQuery;
    })
    .setParameter("registered", true)
    .getMany();
```

Alternatively, you can create a separate query builder and use its generated SQL:

```typescript
const userQb = await connection.getRepository(User)
    .createQueryBuilder("user")
    .select("user.name")
    .where("user.registered = :registered", { registered: true });

const posts = await connection.getRepository(Post)
    .createQueryBuilder("post")
    .where("post.title IN (" + userQb.getQuery() + ")")
    .setParameters(userQb.getParameters())
    .getMany();
```

You can create subqueries in `FROM` like this:

```typescript
const userQb = await connection.getRepository(User)
    .createQueryBuilder("user")
    .select("user.name", "name")
    .where("user.registered = :registered", { registered: true });

const posts = await connection
    .createQueryBuilder()
    .select("user.name", "name")
    .from("(" + userQb.getQuery() + ")", "user")
    .setParameters(userQb.getParameters())
    .getRawMany();
```

or using more a elegant syntax:

```typescript
const posts = await connection
    .createQueryBuilder()
    .select("user.name", "name")
    .from(subQuery => {
        return subQuery
            .select("user.name", "name")
            .from(User, "user")
            .where("user.registered = :registered", { registered: true });
    }, "user")
    .getRawMany();
```

If you want to add a subselect as a "second from" use `addFrom`.

You can use subselects in `SELECT` statements as well:

```typescript
const posts = await connection
    .createQueryBuilder()
    .select("post.id", "id")
    .addSelect(subQuery => {
        return subQuery
            .select("user.name", "name")
            .from(User, "user")
            .limit(1);
    }, "name")
    .from(Post, "post")
    .getRawMany();
```
## Hidden Columns

If the model you are querying has a column with a `select: false` column, you must use the `addSelect` function in order to retrieve the information from the column.

Let's say you have the following entity:

```typescript
import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({select: false})
    password: string;
}
```

Using a standard `find` or query, you will not receive the `password` property for the model. However, if you do the following:

```typescript
const users = await connection.getRepository(User)
    .createQueryBuilder()
    .select("user.id", "id")
    .addSelect("user.password")
    .getMany();
```

You will get the property `password` in your query.
