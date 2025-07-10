import client from "../db/mongoClient.js";

export async function insertAttraction(attraction) {
  const db = client.db("geocoding_results");
  const collection = db.collection("attractions");
  return await collection.insertOne(attraction);
}