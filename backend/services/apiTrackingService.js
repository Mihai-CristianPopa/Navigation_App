import dbClient from "../db/mongoClient.js";
import logger from "../logger.js";

export async function trackApiRequest(apiProvider, endpoint, query, isSuccessful = true) {
    try {
        const db = dbClient.db("geocoding_results");
        const collection  = db.collection("api_requests");

        const requestLog = {
            apiProvider,
            endpoint,
            query,
            isSuccessful,
            timestamp: new Date(),
            date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        };
        await collection.insertOne(requestLog);
        logger.info(`API request logged: ${apiProvider} - ${endpoint}`);
    } catch (error) {
        logger.error("Failed to log API request", { error: error.message });
    }
} 

export async function getDailyApiRequestCount(apiProvider, date = null) {
    try {
        const db = dbClient.db("geocoding_results");
        const collection = db.collection("api_requests");

        const targetDate = date || new Date().toISOString().split('T')[0];

        const count = await collection.countDocuments({
            apiProvider,
            date: targetDate
        });
    
        return count;
    } catch (error) {
        logger.error("Failed to get daily API request count", { error: error.message });
        return 0;
    }
}

// Only needed to be ran once
export async function createClearingIndex() {
    const db = dbClient.db("geocoding_results");
    const collection = db.collection("api_requests");
    return collection.createIndex("timestamp", {
        expireAfterSeconds: 2 * 24 * 60 * 60
    });
}
