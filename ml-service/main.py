from fastapi import FastAPI
from redis import Redis
import os

app = FastAPI()
redis = Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))

@app.get("/")
async def root():
    return {"message": "ML Service is running"}

@app.get("/health")
async def health():
    redis_status = "connected" if redis.ping() else "disconnected"
    return {
        "status": "ok",
        "redis": redis_status
    } 