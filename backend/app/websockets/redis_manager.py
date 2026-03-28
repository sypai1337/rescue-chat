import json
import asyncio
from redis.asyncio import Redis
from app.core.config import settings

redis: Redis = None

async def get_redis() -> Redis:
    global redis
    if redis is None:
        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis

async def publish(channel: str, message: dict):
    r = await get_redis()
    await r.publish(channel, json.dumps(message))

async def subscribe(channel: str):
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(channel)
    return pubsub