import json
from channels.consumer import AsyncConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User

from .models import SupportMessage
from .bot import get_bot_reply

BOT_USERNAME = "SupportBot"


def serialize_message(msg):
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_username": msg.sender.username,
        "is_admin": msg.sender.is_staff,
        "is_bot": msg.sender.username == BOT_USERNAME,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


class PublicChatConsumer(AsyncConsumer):
    """A regular logged-in user's own private thread — replied to by the bot."""

    async def websocket_connect(self, event):
        user = self.scope.get("user")

        if not user or not user.is_authenticated:
            await self.send({"type": "websocket.close", "code": 4001})
            return

        self.group_name = f"support_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.send({"type": "websocket.accept"})

    async def websocket_receive(self, event):
        user = self.scope.get("user")
        try:
            payload = json.loads(event.get("text", "{}"))
            content = payload["message"].strip()
        except (json.JSONDecodeError, KeyError, AttributeError):
            return
        if not content:
            return

        msg = await self._save_message(user, user, content)
        await self.channel_layer.group_send(
            self.group_name, {"type": "chat.message", "message": serialize_message(msg)}
        )

        await self._send_bot_reply(user)

    async def chat_message(self, event):
        await self.send({"type": "websocket.send", "text": json.dumps(event["message"])})

    async def websocket_disconnect(self, event):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def _send_bot_reply(self, thread_user):
        history = await self._get_history(thread_user)
        try:
            reply_text = await get_bot_reply(history)
        except Exception as e:
            print("Bot reply failed:", e)
            reply_text = "Sorry, I'm having trouble responding right now. Please try again shortly."

        bot_user = await self._get_bot_user()
        bot_msg = await self._save_message(thread_user, bot_user, reply_text)
        await self.channel_layer.group_send(
            self.group_name, {"type": "chat.message", "message": serialize_message(bot_msg)}
        )

    @database_sync_to_async
    def _save_message(self, thread_user, sender, content):
        return SupportMessage.objects.create(thread_user=thread_user, sender=sender, content=content)

    @database_sync_to_async
    def _get_bot_user(self):
        return User.objects.get(username=BOT_USERNAME)

    @database_sync_to_async
    def _get_history(self, thread_user):
        qs = SupportMessage.objects.filter(thread_user=thread_user).order_by("-created_at")[:10]
        messages = list(reversed(qs))
        bot_user = User.objects.get(username=BOT_USERNAME)
        return [
            {"role": "assistant" if m.sender_id == bot_user.id else "user", "content": m.content}
            for m in messages
        ]


class AdminChatConsumer(AsyncConsumer):
    """Admin's live view into one specific user's thread (optional, still works if needed)."""

    async def websocket_connect(self, event):
        user = self.scope.get("user")
        thread_user_id = self.scope["url_route"]["kwargs"]["user_id"]

        if not user or not user.is_authenticated or not user.is_staff:
            await self.send({"type": "websocket.close", "code": 4003})
            return

        self.thread_user_id = thread_user_id
        self.group_name = f"support_{thread_user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.send({"type": "websocket.accept"})

    async def websocket_receive(self, event):
        admin_user = self.scope.get("user")
        try:
            payload = json.loads(event.get("text", "{}"))
            content = payload["message"].strip()
        except (json.JSONDecodeError, KeyError, AttributeError):
            return
        if not content:
            return

        msg = await self._save_message(self.thread_user_id, admin_user, content)
        await self.channel_layer.group_send(
            self.group_name, {"type": "chat.message", "message": serialize_message(msg)}
        )

    async def chat_message(self, event):
        await self.send({"type": "websocket.send", "text": json.dumps(event["message"])})

    async def websocket_disconnect(self, event):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    @database_sync_to_async
    def _save_message(self, thread_user_id, sender, content):
        return SupportMessage.objects.create(thread_user_id=thread_user_id, sender=sender, content=content)