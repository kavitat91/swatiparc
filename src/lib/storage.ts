import { AppData } from '../types';
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
// Note: You must add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your .env / Vercel Environment Variables
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// console.log("Redis Initialization - URL:", redisUrl ? `[SET] ${redisUrl}` : "[UNDEFINED]");

const redis = new Redis({
    url: redisUrl || 'http://localhost:8079',
    token: redisToken || 'example_token',
});

const defaultData: AppData = {
    residents: [],
    transactions: [],
};

export const getAppData = async (): Promise<AppData> => {
    try {
        // Fetch data from Redis under the key 'appData'
        const data = await redis.get<AppData>('appData');
        return data || defaultData;
    } catch (error) {
        console.error('Error reading data from Redis:', error);
        return defaultData;
    }
};

export const saveAppData = async (data: AppData): Promise<void> => {
    try {
        // Save the entire data structure back to Redis
        await redis.set('appData', data);
    } catch (error) {
        console.error('Error writing data to Redis:', error);
        throw new Error('Failed to save data');
    }
};
