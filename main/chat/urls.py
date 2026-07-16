from django.urls import path
from . import views

app_name = "chat"

urlpatterns = [
    path("messages/", views.my_messages, name="my_messages"),
    path("admin/threads/", views.admin_thread_list, name="admin_thread_list"),
    path("admin/threads/<int:user_id>/", views.admin_thread_messages, name="admin_thread_messages"),
]