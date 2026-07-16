import json

from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.http import require_POST
from .models import Userdetail

@require_POST
def s(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return JsonResponse({"error": "Missing required fields"}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({"error": "Email already registered"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "Username already registered"}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )

    Userdetail.objects.create(user=user)

    login(request, user)

    return JsonResponse({
        "user": {
            "username": user.username,
            "email": user.email
        }
    })

def l(request):
    data = json.loads(request.body)

    email = data["email"]
    password = data["password"]

    user_obj = User.objects.filter(email=email).first()

    if user_obj is None:
        return JsonResponse(
            {"error": "Invalid email or password"},
            status=400
        )

    user = authenticate(
        request,
        username=user_obj.username,
        password=password
    )

    if user is None:
        return JsonResponse(
            {"error": "Invalid email or password"},
            status=400
        )

    login(request, user)

    return JsonResponse({
        "user": {
            "username": user.username,
            "email": user.email
        }
    })


def logout_view(request):
    logout(request)
    return JsonResponse({"ok": True})


def me(request):
    if request.user.is_authenticated:
        return JsonResponse({
            "user": {
                "username": request.user.username,
                "email": request.user.email,
                "is_staff": request.user.is_staff,
            }
        })
    return JsonResponse({"user": None})

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({
        "detail": "csrf cookie set"
    })