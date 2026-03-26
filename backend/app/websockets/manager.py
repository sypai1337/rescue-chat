from collections import defaultdict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # channel_id -> список активных соединений
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, channel_id: int):
        await websocket.accept()
        self.active_connections[channel_id].append(websocket)

    def disconnect(self, websocket: WebSocket, channel_id: int):
        self.active_connections[channel_id].remove(websocket)
        if not self.active_connections[channel_id]:
            del self.active_connections[channel_id]

    async def broadcast(self, message: dict, channel_id: int):
        for connection in self.active_connections[channel_id]:
            await connection.send_json(message)

manager = ConnectionManager()