# Gestión de Proyectos — Django + React

Aplicación de gestión de proyectos y tareas con backend Django REST Framework
y frontend React con TypeScript.

## Tecnologías

### Backend
- Python
- Django
- Django REST Framework
- JWT con Simple JWT
- MongoDB mediante Django MongoDB Backend

### Frontend
- React
- TypeScript
- Vite
- Bootstrap
- SweetAlert2

## Estructura

- `backend/`: API, configuración Django y aplicación de proyectos.
- `frontend/`: interfaz web React.
- `backend/requirements.txt`: dependencias Python.
- `backend/.env.example`: ejemplo de variables de entorno.

## Configuración local

### Backend

1. Crear un entorno virtual e instalar las dependencias:

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Crear `backend/.env` tomando como referencia `backend/.env.example`.
3. Configurar MongoDB según el entorno local.
4. Iniciar la API:

   ```bash
   python manage.py runserver
   ```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

## Seguridad

No publicar archivos `.env`, credenciales, claves privadas ni datos reales.
Configurar secretos y orígenes permitidos mediante variables de entorno.
