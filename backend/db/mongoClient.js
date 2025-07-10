import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from "dotenv";

dotenv.config();

const MONGO_USER = process.env.MONGO_USER
const MONGO_PASSWORD = process.env.MONGO_PASSWORD

const uri = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@map-navigation.lim17rk.mongodb.net/?retryWrites=true&w=majority&appName=Map-Navigation`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export default client;