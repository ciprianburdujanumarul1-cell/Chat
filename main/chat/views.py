from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from .models import SupportMessage


def serialize(msg):
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_username": msg.sender.username,
        "is_admin": msg.sender.is_staff,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


@login_required
def my_messages(request):
    messages = SupportMessage.objects.filter(thread_user=request.user)
    return JsonResponse({"messages": [serialize(m) for m in messages]})


@login_required
def admin_thread_list(request):
    if not request.user.is_staff:
        return JsonResponse({"error": "Forbidden"}, status=403)

    thread_user_ids = SupportMessage.objects.values_list("thread_user_id", flat=True).distinct()
    threads = []
    for uid in thread_user_ids:
        user = User.objects.get(id=uid)
        last = SupportMessage.objects.filter(thread_user_id=uid).last()
        threads.append({
            "user_id": user.id,
            "username": user.username,
            "last_message": last.content if last else "",
            "last_message_at": last.created_at.isoformat() if last else None,
        })
    threads.sort(key=lambda t: t["last_message_at"] or "", reverse=True)
    return JsonResponse({"threads": threads})


@login_required
def admin_thread_messages(request, user_id):
    if not request.user.is_staff:
        return JsonResponse({"error": "Forbidden"}, status=403)

    messages = SupportMessage.objects.filter(thread_user_id=user_id)
    return JsonResponse({"messages": [serialize(m) for m in messages]})