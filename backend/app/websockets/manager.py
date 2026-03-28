import json
import asyncio
from collections import defaultdict
from fastapi import WebSocket
from app.websockets.redis_manager import publish, subscribe, get_redis

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)
        self.presence_connections: dict[int, list[WebSocket]] = defaultdict(list)
        self._listeners: dict[int, asyncio.Task] = {}

    async def _add_online(self, server_id: int, user_id: int):
        r = await get_redis()
        await r.sadd(f"online:{server_id}", user_id)

    async def _remove_online(self, server_id: int, user_id: int):
        r = await get_redis()
        await r.srem(f"online:{server_id}", user_id)

    async def get_online_users(self, server_id: int) -> set[int]:
        r = await get_redis()
        members = await r.smembers(f"online:{server_id}")
        return {int(m) for m in members}

    async def connect(self, websocket: WebSocket, channel_id: int, server_id: int, user_id: int):
        await websocket.accept()
        self.active_connections[channel_id].append(websocket)
        await self._add_online(server_id, user_id)
        await self._ensure_listener(f"channel:{channel_id}")

    def disconnect(self, websocket: WebSocket, channel_id: int, server_id: int, user_id: int):
        self.active_connections[channel_id].remove(websocket)
        if not self.active_connections[channel_id]:
            del self.active_connections[channel_id]
            task = self._listeners.pop(f"channel:{channel_id}", None)
            if task:
                task.cancel()

    async def disconnect_async(self, websocket: WebSocket, channel_id: int, server_id: int, user_id: int):
        self.disconnect(websocket, channel_id, server_id, user_id)
        await self._remove_online(server_id, user_id)

    async def add_presence(self, websocket: WebSocket, server_id: int, user_id: int):
        self.presence_connections[server_id].append(websocket)
        await self._add_online(server_id, user_id)

    async def remove_presence(self, websocket: WebSocket, server_id: int, user_id: int):
        if websocket in self.presence_connections[server_id]:
            self.presence_connections[server_id].remove(websocket)
        if not self.presence_connections[server_id]:
            del self.presence_connections[server_id]
        await self._remove_online(server_id, user_id)

    async def broadcast(self, message: dict, channel_id: int):
        await publish(f"channel:{channel_id}", message)

    async def broadcast_to_presence(self, message: dict, server_id: int):
        await publish(f"presence:{server_id}", message)

    async def _ensure_listener(self, redis_channel: str):
        if redis_channel in self._listeners:
            return
        task = asyncio.create_task(self._listen(redis_channel))
        self._listeners[redis_channel] = task

    async def _listen(self, redis_channel: str):
        pubsub = await subscribe(redis_channel)
        try:
            async for raw in pubsub.listen():
                if raw["type"] != "message":
                    continue
                message = json.loads(raw["data"])

                if redis_channel.startswith("channel:"):
                    channel_id = int(redis_channel.split(":")[1])
                    connections = self.active_connections.get(channel_id, []).copy()
                    for ws in connections:
                        try:
                            await ws.send_json(message)
                        except Exception:
                            pass

                elif redis_channel.startswith("presence:"):
                    server_id = int(redis_channel.split(":")[1])
                    connections = self.presence_connections.get(server_id, []).copy()
                    for ws in connections:
                        try:
                            await ws.send_json(message)
                        except Exception:
                            pass
        except asyncio.CancelledError:
            await pubsub.unsubscribe(redis_channel)

manager = ConnectionManager()