import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Connect to the in-memory database.
 */
export const connect = async (): Promise<{
  mongoServer: MongoMemoryServer;
  mongoUri: string;
}> => {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  return { mongoServer, mongoUri };
};

/**
 * Drop database, close the connection and stop mongod.
 */
export const closeDatabase = async (mongoServer: MongoMemoryServer): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

/**
 * Remove all the data for all db collections.
 */
export const clearDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};