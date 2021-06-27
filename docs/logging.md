# Logging

* [Enabling logging](#enabling-logging)
* [Logging options](#logging-options)
* [Log long-running queries](#log-long-running-queries)
* [Changing default logger](#changing-default-logger)
* [Using custom logger](#using-custom-logger)

## Enabling logging

You can enable logging of all queries and errors by simply setting `logging: true` in your connection options:

```typescript
{
    name: "mysql",
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "test",
    password: "test",
    database: "test",
    ...
    logging: true
}
```

## Logging options

You can enable different types of logging in connection options:

```typescript
{ 
    host: "localhost",
    ...
    logging: ["query", "error"]
}
```

If you want to enable logging of failed queries only then only add `error`:

```typescript
{
    host: "localhost",
    ...
    logging: ["error"]
}
```

There are other options you can use:

* `query` - logs all queries.
* `error` - logs all failed queries and errors.
* `schema` - logs the schema build process.
* `warn` - logs internal orm warnings.
* `info` - logs internal orm informative messages.
* `log` - logs internal orm log messages.

You can specify as many options as needed.
If you want to enable all logging you can simply specify `logging: "all"`:

```typescript
{
    host: "localhost",
    ...
    logging: "all"
}
```

## Log long-running queries

If you have performance issues, you can log queries that take too much time to execute
by setting `maxQueryExecutionTime` in connection options:

```typescript
{
    host: "localhost",
    ...
    maxQueryExecutionTime: 1000
}
```

This code will log all queries which run more then `1 second`.

## Changing default logger

TypeORM ships with 4 different types of logger:

* `advanced-console` - this is the default logger which logs all messages into the console using color
and sql syntax highlighting (using [chalk](https://github.com/chalk/chalk)).
* `simple-console` - this is a simple console logger which is exactly the same as the advanced logger, but it does not use any color highlighting.
This logger can be used if you have problems / or don't like colorized logs.
* `file` - this logger writes all logs into `ormlogs.log` in the root folder of your project (near `package.json` and `ormconfig.json`).
* `debug` - this logger uses [debug package](https://github.com/visionmedia/debug), to turn on logging set your env variable `DEBUG=typeorm:*` (note logging option has no effect on this logger).

You can enable any of them in connection options:

```typescript
{
    host: "localhost",
    ...
    logging: true,
    logger: "file"
}
```

## Using custom logger

You can create your own logger class by implementing the `Logger` interface:

```typescript
import {Logger} from "typeorm";

export class MyCustomLogger implements Logger {
    
    // implement all methods from logger class
    
}
```

And specify it in connection options:

```typescript
import {createConnection} from "typeorm";
import {MyCustomLogger} from "./logger/MyCustomLogger";

createConnection({
    name: "mysql",
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "test",
    password: "test",
    database: "test",
    logger: new MyCustomLogger()
});
```

If you defined your connection options in the `ormconfig` file,
then you can use it and override it in the following way:

```typescript
import {createConnection, getConnectionOptions} from "typeorm";
import {MyCustomLogger} from "./logger/MyCustomLogger";

// getConnectionOptions will read options from your ormconfig file
// and return it in connectionOptions object
// then you can simply append additional properties to it
getConnectionOptions().then(connectionOptions => {
    return createConnection(Object.assign(connectionOptions, {
        logger: new MyCustomLogger()
    }))
});
```

Logger methods can accept `QueryRunner` when it's available. It's helpful if you want to log additional data.
Also, via query runner, you can get access to additional data passed during persist/remove, or attached to a local instance of `EntityManager`. For example:

```typescript
// either: (1) user sends request during entity save
postRepository.save(post, { data: { request: request } });

// or: (2) user creates request-scoped entity manager, and attaches request
const manager = connection.createEntityManager();
manager.data = { request: request };
manager.query("SELECT * FROM post");

// in logger you can access it this way:
logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    const requestUrl = queryRunner && queryRunner.data["request"] ? "(" + queryRunner.data["request"].url + ") " : "";
    console.log(requestUrl + "executing query: " + query);
}
```
