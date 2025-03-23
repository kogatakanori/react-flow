# React Flow sample

# Settings local

## initial

- install docker for mac.

1. Setup

   ```shell
   make setup
   ```

2. build

   ```shell
   make build
   ```

## up

```shell
make up
```

# MongoDB Setup and Run

## Prerequisites

- Ensure MongoDB is installed on your local machine. You can download and install it from the official MongoDB website.

## Configuration

1. Update the `.env` file in the `app` directory with your MongoDB credentials. For example:

   ```shell
   DB_HOST=localhost
   DB_PORT=27017
   DB_USER=yourUsername
   DB_PASS=yourPassword
   DB_NAME=yourDatabaseName
   ```

2. Ensure the MongoDB connection URI is correctly set in `app/db/index.ts`. The URI should be `mongodb://localhost:27017` if you are running MongoDB locally.

## Running MongoDB

1. Start your MongoDB server by running the `mongod` command in your terminal.

2. Use the provided `Makefile` to set up and run your application. You can use the `make up` command to start the application.

3. To start the MongoDB service, use the following command:

   ```shell
   make start-mongodb
   ```

4. To stop the MongoDB service, use the following command:

   ```shell
   make stop-mongodb
   ```
