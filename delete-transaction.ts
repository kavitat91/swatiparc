import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = new Redis({
    url: redisUrl || '',
    token: redisToken || '',
});

async function run() {
    try {
        const data: any = await redis.get('appData');
        if (!data) {
            console.log("No data found");
            return;
        }

        const initialCount = data.transactions.length;

        // Find entry of 100 in October 2023
        const octTrans = data.transactions.filter((t: any) => t.date.startsWith('2023-10') && t.amount === 100);
        console.log("Found transactions to delete:", octTrans);

        data.transactions = data.transactions.filter((t: any) => !(t.date.startsWith('2023-10') && t.amount === 100));

        if (data.transactions.length < initialCount) {
            await redis.set('appData', data);
            console.log(`Deleted ${initialCount - data.transactions.length} transaction(s). Saved to Redis.`);
        } else {
            console.log("No such transaction found.");
        }
    } catch (e) {
        console.error(e);
    }
}

run();
