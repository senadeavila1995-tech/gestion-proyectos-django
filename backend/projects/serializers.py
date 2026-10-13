from rest_framework import serializers

from .models import Project, Task


class TaskSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        pk_field=serializers.CharField(),
    )
    project_name = serializers.CharField(
        source="project.name",
        read_only=True,
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "project_name",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_due_date(self, value):
        project = self.initial_data.get("project")
        if value and project:
            parent = Project.objects.filter(pk=project).first()
            if parent and parent.due_date and value > parent.due_date:
                raise serializers.ValidationError(
                    "La tarea no puede vencer después de la fecha límite del proyecto."
                )
        return value


class ProjectSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    task_count = serializers.IntegerField(
        source="tasks.count",
        read_only=True,
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "status",
            "start_date",
            "due_date",
            "created_at",
            "updated_at",
            "tasks",
            "task_count",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "tasks",
            "task_count",
        ]

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None),
        )
        due_date = attrs.get(
            "due_date",
            getattr(self.instance, "due_date", None),
        )

        if start_date and due_date and due_date < start_date:
            raise serializers.ValidationError({
                "due_date": (
                    "La fecha límite no puede ser anterior "
                    "a la fecha de inicio."
                )
            })

        return attrs
