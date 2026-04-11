import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "./db";

const rawClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await rawClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err: any) {
    if (
      err.name === "ResourceNotFoundException" ||
      err.__type?.includes("ResourceNotFoundException")
    ) {
      return false;
    }
    throw err;
  }
}

async function createTableIfNotExists(
  tableName: string,
  keySchema: { AttributeName: string; KeyType: string }[],
  attributeDefinitions: { AttributeName: string; AttributeType: string }[]
) {
  if (await tableExists(tableName)) {
    console.log(`Table ${tableName} already exists`);
    return;
  }
  await rawClient.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: keySchema,
      AttributeDefinitions: attributeDefinitions,
      BillingMode: "PAY_PER_REQUEST",
    })
  );
  console.log(`Created table: ${tableName}`);
  await new Promise((r) => setTimeout(r, 5000));
}

export async function ensureTables() {
  await createTableIfNotExists(
    TABLES.properties,
    [{ AttributeName: "id", KeyType: "HASH" }],
    [{ AttributeName: "id", AttributeType: "N" }]
  );

  await createTableIfNotExists(
    TABLES.calls,
    [{ AttributeName: "id", KeyType: "HASH" }],
    [{ AttributeName: "id", AttributeType: "N" }]
  );

  await createTableIfNotExists(
    TABLES.counters,
    [{ AttributeName: "counterName", KeyType: "HASH" }],
    [{ AttributeName: "counterName", AttributeType: "S" }]
  );

  await createTableIfNotExists(
    TABLES.users,
    [{ AttributeName: "id", KeyType: "HASH" }],
    [{ AttributeName: "id", AttributeType: "S" }]
  );

  for (const name of ["properties", "calls"]) {
    let attempts = 0;
    while (attempts < 5) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: TABLES.counters,
            Item: { counterName: name, value: 0 },
            ConditionExpression: "attribute_not_exists(counterName)",
          })
        );
        break;
      } catch (err: any) {
        if (err.name?.includes("ConditionalCheckFailed")) break;
        attempts++;
        if (attempts < 5) await new Promise((r) => setTimeout(r, 2000));
        else console.error(`Counter init error for ${name}:`, err.message);
      }
    }
  }

  console.log("DynamoDB tables ready");
}
