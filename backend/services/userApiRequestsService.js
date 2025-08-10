import dbClient from "../db/mongoClient.js";
import logger from "../logger.js";
import { FAILED_TO_INCREMENT_REQUEST_COUNT, FAILED_TO_GET_REQUEST_COUNT } from "../utils/constants.js";

/** Used for counting the requests made by the external APIs to count against the daily limits. */
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
    } catch (error) {
        logger.error(FAILED_TO_INCREMENT_REQUEST_COUNT(email, apiProvider, endpoint, version), error);
    }
}

/** Used for checking whether the daily limits for the external APIs have beeen reached. */
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
        logger.error(FAILED_TO_GET_REQUEST_COUNT(apiProvider, endpoint, version), error);
        return 0;
    }
}