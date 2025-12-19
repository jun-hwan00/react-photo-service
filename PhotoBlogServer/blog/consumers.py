import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        print(f"WebSocket 연결됨: {self.channel_name}")
        
        # 연결 성공 메시지
        await self.send(text_data=json.dumps({
            'type': 'edge_status',
            'status': 'connected',
            'message': '카메라 연결됨'
        }))

    async def disconnect(self, close_code):
        print(f"WebSocket 연결 해제: {self.channel_name}")

    async def receive(self, text_data):
        # 메시지 수신 처리
        data = json.loads(text_data)
        
        # 에코백
        await self.send(text_data=json.dumps({
            'type': 'echo',
            'message': data
        }))