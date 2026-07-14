from django.urls import path
from . import views

urlpatterns = [
    path("signup/", views.s),
    path("login/", views.l),
    path("logout/", views.logout_view),
    path("me/", views.me),
    path("csrf/", views.csrf),
]