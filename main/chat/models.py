from django.db import models
from django.contrib.auth.models import User


class SupportMessage(models.Model):
    thread_user = models.ForeignKey(
        User, related_name="support_messages", on_delete=models.CASCADE
    )
    sender = models.ForeignKey(
        User, related_name="sent_support_messages", on_delete=models.CASCADE
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender.username} -> thread {self.thread_user.username}: {self.content[:30]}"