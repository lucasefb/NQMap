# NQMap

Proyecto para visualizar cobertura y datos geoespaciales de la red NQ.

## Contenidos del proyecto

```
NQMap/
├── backend/      # API Express y scripts de procesamiento de datos
│   ├── server.js
│   ├── thp.py    # Script de extracción y generación de overlays
│   └── ...
├── frontend/     # Aplicación Nuxt 3
│   ├── pages/
│   ├── components/
│   └── ...
└── README.md     # (este archivo)
```

## Requisitos previos

1. **Node.js** >= 18.x y **npm** para el frontend y el backend Node.
2. **Python** >= 3.9 para ejecutar el script `thp.py`.

## Instalación

### 1. Clonar el repositorio

```bash
# Ejemplo
git clone https://github.com/lucasefb/NQMap.git
cd NQMap
```

### 2. Variables de entorno

Copia los archivos `.env` de ejemplo o crea los tuyos:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Ajusta las variables según tu entorno (puertos, credenciales, rutas, etc.).

### 3. Backend (Node)

```bash
cd backend
npm install
# Arrancar el servidor
node server.js
```

El backend se iniciará por defecto en `http://localhost:3000` o en el puerto configurado.

### 4. Frontend (Nuxt 3)

```bash
cd frontend
npm install
npm run dev
```

La aplicación web estará disponible típicamente en `http://localhost:8080`.

### 5. Script de procesamiento `thp.py`

Este script procesa archivos KMZ/KML y genera recursos utilizados por el backend.

Instala las dependencias de Python:

```bash
pip install schedule python-dotenv geojson pykml
```

Ejecuta el script manualmente (o programa su ejecución con *cron*/`schedule`):

```bash
cd backend
python thp.py
```

## Estructura de carpetas relevante

- `backend/extracted/` – Directorio donde se almacenan los recursos generados (imágenes, overlays, JSON, etc.).
- `backend/routes/` – Rutas Express para exponer la API REST.
- `frontend/components/` – Componentes Vue/Nuxt de la interfaz.

## Despliegue en producción

1. Establece `APP_ENV=prod` en los archivos `.env`.
2. Construye el backend y frontend

---

¡Listo! Con esto ya tendrás la aplicación NQMap funcionando tanto en desarrollo como en producción.