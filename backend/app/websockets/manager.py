from collections import defaultdict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)
        # server_id -> set of online user_ids
        self.online_users: dict[int, set[int]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, channel_id: int, server_id: int, user_id: int):
        await websocket.accept()
        self.active_connections[channel_id].append(websocket)
        self.online_users[server_id].add(user_id)

    def disconnect(self, websocket: WebSocket, channel_id: int, server_id: int, user_id: int):
        self.active_connections[channel_id].remove(websocket)
        if not self.active_connections[channel_id]:
            del self.active_connections[channel_id]

        # проверяем нет ли других соединений этого юзера в том же сервере
        user_still_connected = any(
            user_id in self.online_users[server_id]
            for ws_list in self.active_connections.values()
            for ws in ws_list
        )
        if not user_still_connected:
            self.online_users[server_id].discard(user_id)

    def get_online_users(self, server_id: int) -> set[int]:
        return self.online_users.get(server_id, set())

    async def broadcast(self, message: dict, channel_id: int):
        for connection in self.active_connections[channel_id]:
            await connection.send_json(message)

    async def broadcast_to_server(self, message: dict, server_id: int, channel_ids: list[int]):
        for channel_id in channel_ids:
            await self.broadcast(message, channel_id)

manager = ConnectionManager()