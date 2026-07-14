
import os

from channels.routing import ProtocolTypeRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'main.settings')

application = get_asgi_application()

ASGI_APPLICATION = "main.asgi.application"
application = ProtocolTypeRouter({
    "http": application,
})