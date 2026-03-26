from collections import defaultdict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)
        self.online_users: dict[int, set[int]] = defaultdict(set)
        # server_id -> список presence websocket соединений
        self.presence_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, channel_id: int, server_id: int, user_id: int):
        await websocket.accept()
        self.active_connections[channel_id].append(websocket)
        self.online_users[server_id].add(user_id)

    def disconnect(self, websocket: WebSocket, channel_id: int, server_id: int, user_id: int):
        self.active_connections[channel_id].remove(websocket)
        if not self.active_connections[channel_id]:
            del self.active_connections[channel_id]
        self.online_users[server_id].discard(user_id)

    def add_presence(self, websocket: WebSocket, server_id: int, user_id: int):
        self.presence_connections[server_id].append(websocket)
        self.online_users[server_id].add(user_id)

    def remove_presence(self, websocket: WebSocket, server_id: int, user_id: int):
        if websocket in self.presence_connections[server_id]:
            self.presence_connections[server_id].remove(websocket)
        if not self.presence_connections[server_id]:
            del self.presence_connections[server_id]
        self.online_users[server_id].discard(user_id)

    def get_online_users(self, server_id: int) -> set[int]:
        return self.online_users.get(server_id, set())

    async def broadcast(self, message: dict, channel_id: int):
        for connection in self.active_connections[channel_id]:
            await connection.send_json(message)

    async def broadcast_to_server(self, message: dict, server_id: int, channel_ids: list[int]):
        # рассылаем по каналам
        # for channel_id in channel_ids:
        #     await self.broadcast(message, channel_id)
        # рассылаем по presence соединениям
        for connection in self.presence_connections.get(server_id, []):
            await connection.send_json(message)

manager = ConnectionManager()