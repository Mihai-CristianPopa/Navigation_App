import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from "../configs/config.js";

const mongoUser = config.mongoUser;
const mongoPassword = config.mongoPassword;

const uri = `mongodb+srv://${mongoUser}:${mongoPassword}@map-navigation.lim17rk.mongodb.net/?retryWrites=true&w=majority&appName=Map-Navigation`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export default client;