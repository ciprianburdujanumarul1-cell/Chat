import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application
from django.urls import re_path  # <-- Switched from 'path' to 're_path'

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "main.settings")

# Initialize Django ASGI application early
django_asgi_app = get_asgi_application()

# Safe to import consumers now
from chat.consumers import AdminChatConsumer, PublicChatConsumer

application = ProtocolTypeRouter({
    # Django's ASGI application to handle traditional HTTP requests
    "http": django_asgi_app,

    # WebSocket chat handler
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter([
                # Explicitly anchors paths so they never collide
                re_path(r"^chat/admin/$", AdminChatConsumer.as_asgi()),
                re_path(r"^chat/$", PublicChatConsumer.as_asgi()),
            ])
        )
    ),
})