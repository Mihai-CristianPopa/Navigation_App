import dbClient from "../db/mongoClient.js";
import logger from "../logger.js";
// Only needed to be ran once
/**
 * @description Creates or updates a TTL (Time To Live) index for automatic document expiration
 * @param {String} databaseName - the database name in which to find the collection
 * @param {String} collectionName - the collection name for which we want to create the index
 * @param {String} timestampColumn - the name of column on which to base the expiration time
 * @param {number} numberOfSecondsBeforeExpiry - the number of seconds that each object from the collection will be kept
 * @returns A promise which resolves when the index is either created/updated or the operation fails
 * @throws any error that might come up.
 */
export async function createClearingIndex(databaseName, collectionName, timestampColumn, numberOfSecondsBeforeExpiry) {
    const db = dbClient.db(databaseName);
    const collection = db.collection(collectionName);
    
    const indexName = `${timestampColumn}_1`; // MongoDB's default naming convention
    
    try {
        // Check if index exists
        const indexExists = await collection.indexExists(indexName);
        
        if (indexExists) {
            // Get current index info to check if TTL value is different
            const indexes = await collection.indexes();
            const currentIndex = indexes.find(index => index.name === indexName);
            
            // Check if TTL value needs updating
            if (currentIndex && currentIndex.expireAfterSeconds !== numberOfSecondsBeforeExpiry) {
                logger.info(`Updating TTL index ${indexName} from ${currentIndex.expireAfterSeconds}s to ${numberOfSecondsBeforeExpiry}s`)

                // Drop the existing index
                await collection.dropIndex(indexName);
                
                // Create new index with updated TTL
                return collection.createIndex(
                    { [timestampColumn]: 1 }, 
                    { 
                        expireAfterSeconds: numberOfSecondsBeforeExpiry,
                        name: indexName 
                    }
                );
            } else {
                logger.info(`TTL index ${indexName} already exists with correct expiration time.`);
                return; // Index exists with correct TTL value
            }
        } else {
            // Create new index
            logger.info(`Creating new TTL index ${indexName} with ${numberOfSecondsBeforeExpiry}s expiration.`);
            return collection.createIndex(
                { [timestampColumn]: 1 }, 
                { 
                    expireAfterSeconds: numberOfSecondsBeforeExpiry,
                    name: indexName 
                }
            );
        }
    } catch (error) {
        logger.error(`Failed to create/update TTL index ${indexName}:`, error);
        throw error;
    }
}