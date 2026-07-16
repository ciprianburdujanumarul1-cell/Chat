from django.db import migrations
from django.contrib.auth.hashers import make_password
import uuid

def create_bot_user(apps, schema_editor):
    User = apps.get_model("auth", "User")
    if not User.objects.filter(username="SupportBot").exists():
        User.objects.create(
            username="SupportBot",
            email="bot@support.local",
            is_staff=True,
            password="!" + uuid.uuid4().hex,  # unusable password marker
        )

def remove_bot_user(apps, schema_editor):
    User = apps.get_model("auth", "User")
    User.objects.filter(username="SupportBot").delete()

class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0001_initial"),
    ]
    operations = [
        migrations.RunPython(create_bot_user, remove_bot_user),
    ]