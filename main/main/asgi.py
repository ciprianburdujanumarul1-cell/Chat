import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application
from django.urls import re_path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "main.settings")

django_asgi_app = get_asgi_application()

from chat.consumers import AdminChatConsumer, PublicChatConsumer

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter([
                re_path(r"^chat/admin/(?P<user_id>\d+)/$", AdminChatConsumer.as_asgi()),
                re_path(r"^chat/$", PublicChatConsumer.as_asgi()),
            ])
        )
    ),
})