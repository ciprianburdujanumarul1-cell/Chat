from django.db import models
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User


# Create your models here.
class Userdetail(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='detail')
    def clean(self):
        try:
            validate_password(self.password)
        except ValidationError as e:
            raise ValidationError({'password': e.messages})
    def __str__(self):
        return self.user.username