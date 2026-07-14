# chat/consumers.py
from channels.consumer import AsyncConsumer
import json

class PublicChatConsumer(AsyncConsumer):
    async def websocket_connect(self, event):
        # Allow any public user to connect
        await self.send({
            "type": "websocket.accept",
        })

    async def websocket_receive(self, event):
        # Broadcast or echo public text data
        text_data = event.get("text", "{}")
        await self.send({
            "type": "websocket.send",
            "text": f"Public Broadcast: {text_data}",
        })

    async def websocket_disconnect(self, event):
        pass


class AdminChatConsumer(AsyncConsumer):
    async def websocket_connect(self, event):
        # Access user session data safely provided by AuthMiddlewareStack
        user = self.scope.get("user")
        
        # Check if the user is an authenticated staff member
        if user and user.is_authenticated and user.is_staff:
            await self.send({
                "type": "websocket.accept",
            })
        else:
            # Reject the connection if they aren't an admin
            await self.send({
                "type": "websocket.close",
                "code": 4003, # Custom close code for forbidden access
            })

    async def websocket_receive(self, event):
        text_data = event.get("text", "{}")
        await self.send({
            "type": "websocket.send",
            "text": f"Admin Secure Channel: {text_data}",
        })

    async def websocket_disconnect(self, event):
        pass