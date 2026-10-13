from django.urls import path

from .views import (
    HealthView,
    ProjectDetailView,
    ProjectListCreateView,
    RegisterView,
    TaskDetailView,
    TaskListCreateView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("projects/", ProjectListCreateView.as_view(), name="project-list-create"),
    path("projects/<str:pk>/", ProjectDetailView.as_view(), name="project-detail"),
    path("tasks/", TaskListCreateView.as_view(), name="task-list-create"),
    path("tasks/<str:pk>/", TaskDetailView.as_view(), name="task-detail"),
]
