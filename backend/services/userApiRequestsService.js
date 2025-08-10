import dbClient from "../db/mongoClient.js";
import logger from "../logger.js";
export async function incrementRequestCount(userId, email, apiProvider, endpoint, version) {
    try {
        const db = dbClient.db("authentication");
        const collection  = db.collection("user_api_requests");

        const requestLog = {
            user_id: userId,
            email,
            apiProvider,
            endpoint,
            version,
            timestamp: new Date(),
            date: new Date().toISOString().split('T')[0]
        };
        await collection.insertOne(requestLog);
        logger.info(`API request logged: ${apiProvider}`);
    } catch (error) {
        logger.error("Failed to log API request", { error: error.message });
    }
}

export async function getDailyApiRequestCount(apiProvider, endpoint, version, userId=null, date = null) {
    try {
        const db = dbClient.db("authentication");
        const collection  = db.collection("user_api_requests");

        const targetDate = date || new Date().toISOString().split('T')[0];

        const options = {
            apiProvider,
            endpoint,
            version,
            date: targetDate 
        }

        if (userId) options.user_id = userId;

        const count = await collection.countDocuments(options);
    
        return count;
    } catch (error) {
        logger.error("Failed to get daily API request count", { error: error.message });
        return 0;
    }
}