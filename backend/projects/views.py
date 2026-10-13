from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Project, Task
from .serializers import ProjectSerializer, TaskSerializer

User = get_user_model()


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "status": "ok",
            "service": "gestion-proyectos-api",
        })


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        username = str(request.data.get("username", "")).strip()
        email = str(request.data.get("email", "")).strip().lower()
        password = request.data.get("password", "")

        if not username or not email or not isinstance(password, str):
            return Response(
                {"detail": "username, email y password son obligatorios."},
                status=400,
            )

        if len(password) < 8:
            return Response(
                {"password": "La contraseña debe tener al menos 8 caracteres."},
                status=400,
            )

        if User.objects.filter(username=username).exists():
            return Response({"username": "Este usuario ya existe."}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({"email": "Este correo ya está registrado."}, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )
        return Response(
            {
                "id": str(user.pk),
                "username": user.username,
                "email": user.email,
            },
            status=201,
        )


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(project__owner=self.request.user)

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if project.owner_id != self.request.user.pk:
            raise PermissionDenied("No puedes agregar tareas a un proyecto ajeno.")
        serializer.save()


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(project__owner=self.request.user)

    def perform_update(self, serializer):
        project = serializer.validated_data.get(
            "project",
            serializer.instance.project,
        )
        if project.owner_id != self.request.user.pk:
            raise PermissionDenied("No puedes mover tareas a un proyecto ajeno.")
        serializer.save()
