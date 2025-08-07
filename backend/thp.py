import schedule
import dotenv
import time
import os
import zipfile
import geojson
import shutil
import json
from pykml import parser

dotenv.load_dotenv()

def generate_overlay_data_for_frontend(kmz_path, base_name, extract_to_path, api_base_url=None):
    if api_base_url is None:
        # Detect base URL from environment
        app_env = os.getenv('APP_ENV', 'prod').lower()
        if app_env == 'prod':
            api_base_url = os.getenv('API_BASE_URL_PROD', '')
        else:
            api_base_url = os.getenv('API_BASE_URL_LOCAL', 'http://localhost:3000')
    overlays = []
    
    kmz_extract_path = os.path.join(extract_to_path, base_name)
    if os.path.exists(kmz_extract_path):
        shutil.rmtree(kmz_extract_path, ignore_errors=True)
    os.makedirs(kmz_extract_path, exist_ok=True)

    # Directorio central para las imágenes de overlay
    central_img_dir = os.path.join(extract_to_path, 'overlay_images')
    os.makedirs(central_img_dir, exist_ok=True)
    
    with zipfile.ZipFile(kmz_path, 'r') as kmz:
        kmz.extractall(kmz_extract_path)

    kml_file = os.path.join(kmz_extract_path, "doc.kml")
    if not os.path.exists(kml_file):
        print(f"No se encontró doc.kml en {kmz_extract_path}")
        return overlays
        
    with open(kml_file, 'r', encoding='utf-8') as f:
        kml_doc = parser.parse(f)

    kml_root = kml_doc.getroot()
    groundoverlays = kml_root.findall(".//GroundOverlay")
    
    for i, overlay in enumerate(groundoverlays):
        try:
            icon_href = overlay.Icon.href.text
            bounds_element = overlay.LatLonBox
            north = float(bounds_element.north.text)
            south = float(bounds_element.south.text)
            east = float(bounds_element.east.text)
            west = float(bounds_element.west.text)
            
            # Construir URL de imagen para el frontend (normalizar barras para web)
            icon_href_normalized = icon_href.replace('\\', '/')
            dest_img_name = f"{base_name}_{os.path.basename(icon_href_normalized)}"
            # Ignorar overlays que contengan "site" en el nombre de la imagen
            if 'site' in dest_img_name.lower():
                continue
            # Copiar imagen al directorio central con nombre único
            src_img_path = os.path.join(kmz_extract_path, icon_href_normalized)
            dest_img_path = os.path.join(central_img_dir, dest_img_name)
            try:
                shutil.copyfile(src_img_path, dest_img_path)
            except FileNotFoundError:
                print(f"Imagen {src_img_path} no encontrada para copiar")
            image_url = f"{api_base_url}/extracted/overlay_images/{dest_img_name}"
            
            overlay_data = {
                "key": f"{base_name}.kmz",
                "imageUrl": image_url,
                "bounds": [south, west, north, east]
            }
            overlays.append(overlay_data)
            
        except Exception as e:
            print(f"Error procesando overlay {i} en {base_name}: {e}")
            continue
    
    return overlays

def process_kmz_folder(folder_path, extract_to_path):

    consolidated_data = []
    all_overlays = []

    for file_name in os.listdir(folder_path):
        # Procesar todos los archivos KMZ y descartar los que contengan "site" en su nombre
        if not file_name.lower().endswith('.kmz'):
            continue
        if 'site' in file_name.lower():
            print(f"Omitiendo archivo Site: {file_name}")
            continue
        kmz_path = os.path.join(folder_path, file_name)
        base_name = os.path.splitext(file_name)[0]

        print(f"Procesando archivo: {file_name}")

        # Omitir procesamiento de puntos y GroundOverlays para evitar carpetas images/placemarks
        points_data = []
        overlays_data = []

        # Generar datos de overlay para el frontend
        try:
            frontend_overlays = generate_overlay_data_for_frontend(kmz_path, base_name, extract_to_path) if 'site' not in base_name.lower() else []
            all_overlays.extend(frontend_overlays)
            print(f"Generados {len(frontend_overlays)} overlays para {file_name}")
        except Exception as e:
            print(f"Error generando overlays para frontend en {file_name}: {e}")

        consolidated_data.extend(points_data)
        consolidated_data.extend(overlays_data)

        # Eliminar la carpeta de extracción específica para mantener el directorio limpio
        kmz_extract_path = os.path.join(extract_to_path, base_name)
        shutil.rmtree(kmz_extract_path, ignore_errors=True)

    # Omitir generación de GeoJSON consolidado ya que no procesamos puntos ni overlays
    # geojson_data = geojson.FeatureCollection(consolidated_data)
    # consolidated_file = os.path.join(extract_to_path, "consolidated_data.geojson")
    # with open(consolidated_file, "w", encoding="utf-8") as f:
    #     geojson.dump(geojson_data, f, indent=2, ensure_ascii=False)

    # Guardar los datos de overlay para el frontend, fusionando con los existentes si ya hay archivo
    overlays_file = os.path.join(extract_to_path, "coverage_overlays.json")

    if os.path.exists(overlays_file):
        try:
            with open(overlays_file, "r", encoding="utf-8") as f:
                existing_overlays = json.load(f)
        except Exception as e:
            print(f"[ADVERTENCIA] No se pudo leer el archivo existente de overlays ({e}), se sobrescribirá.")
            existing_overlays = []
    else:
        existing_overlays = []

    # Combinar evitando duplicados exactos
    combined_overlays = existing_overlays + [ov for ov in all_overlays if ov not in existing_overlays]

    with open(overlays_file, "w", encoding="utf-8") as f:
        json.dump(combined_overlays, f, indent=2, ensure_ascii=False)

    print(f"Overlays para frontend guardados como {overlays_file} ({len(combined_overlays)} overlays)")

def process_kmz_points(kmz_path):

    with zipfile.ZipFile(kmz_path, 'r') as kmz:
        kml_filename = 'doc.kml'
        if kml_filename in kmz.namelist():
            with kmz.open(kml_filename, 'r') as kml_file:
                kml_doc = parser.parse(kml_file)
        else:
            raise FileNotFoundError(f"El archivo {kml_filename} no se encontró en {kmz_path}.")

    kml_root = kml_doc.getroot()
    folders = kml_root.Document.Folder
    placemarks = []
    for folder in folders:
        placemarks.extend(folder.findall(".Placemark"))

    geojson_features = []
    for placemark in placemarks:
        name = placemark.find(".name")
        point = placemark.find(".Point")

        coordinates = None
        if point is not None:
            coordinates_element = point.find(".coordinates")
            if coordinates_element is not None:
                coordinates_text = coordinates_element.text.strip()
                coords = coordinates_text.split(",")
                if len(coords) >= 2:
                    lon, lat = map(float, coords[:2])  # Asegurarse de que solo se usen longitud y latitud
                    coordinates = (lon, lat)

        if name is not None:
            name = name.text

        if coordinates:
            feature = geojson.Feature(
                geometry=geojson.Point(coordinates),
                properties={"name": name}
            )
            geojson_features.append(feature)

    return geojson_features

def process_kmz_groundoverlays(kmz_path, base_name, extract_to_path):

    with zipfile.ZipFile(kmz_path, 'r') as kmz:
        kmz.extractall(extract_to_path)

    kml_file = os.path.join(extract_to_path, "doc.kml")
    with open(kml_file, 'r', encoding='utf-8') as f:
        kml_doc = parser.parse(f)

    kml_root = kml_doc.getroot()
    groundoverlays = kml_root.findall(".//GroundOverlay")
    geojson_features = []

    for overlay in groundoverlays:
        icon_href = overlay.Icon.href.text
        image_path = os.path.join(extract_to_path, icon_href)

        # Modificar la ruta de la imagen para que use barras normales
        image_path = image_path.replace("\\", "/")

        bounds = overlay.LatLonBox
        north = float(bounds.north.text)
        south = float(bounds.south.text)
        east = float(bounds.east.text)
        west = float(bounds.west.text)

        coordinates = [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south]
        ]

        feature = geojson.Feature(
            geometry=geojson.Polygon([coordinates]),
            properties={"image_path": image_path}
        )
        geojson_features.append(feature)

    return geojson_features, extract_to_path

# Función que ejecuta el procesamiento
def ejecutar_proceso():
    app_env = os.getenv('APP_ENV', 'prod').lower()
    base_dir_key = f"BASE_DIR_{app_env.upper()}"
    folder_paths_env = os.getenv(base_dir_key)
    if not folder_paths_env:
        raise ValueError(f"No se encontró la variable {base_dir_key} en .env")

    # Permitir múltiples rutas separadas por el separador de PATH del sistema (p. ej. ';' en Windows, ':' en Unix)
    folder_paths = [p.strip() for p in folder_paths_env.split(os.pathsep) if p.strip()]
    if not folder_paths:
        raise ValueError(f"La variable {base_dir_key} no contiene rutas válidas")

    # Directorio de extracción dentro del backend
    extract_to_path = os.path.join(os.path.dirname(__file__), 'extracted')
    os.makedirs(extract_to_path, exist_ok=True)

    print(f"Ejecutando proceso de actualización de KMZ... ({time.strftime('%Y-%m-%d %H:%M:%S')})")
    print(f"APP_ENV={app_env} | folder_paths={folder_paths} | extract_to_path={extract_to_path}")

    for folder_path in folder_paths:
        if not os.path.isdir(folder_path):
            print(f"[ADVERTENCIA] La ruta {folder_path} no es un directorio válido, se omite.")
            continue
        process_kmz_folder(folder_path, extract_to_path)

    print("Proceso completado.")

# Programar ejecución solo los domingos a las 06:00 AM
# schedule.every().sunday.at("06:00").do(ejecutar_proceso)
# schedule.every().day.at("08:54").do(ejecutar_proceso)  # Deshabilitado para ejecución inmediata
# print("Programación establecida. El script se ejecutará automáticamente.")

# Ejecutar inmediatamente para pruebas
if __name__ == "__main__":
    ejecutar_proceso()

# Mantener el programa corriendo para que PM2 lo administre
# while True:
#     schedule.run_pending()
#     time.sleep(50)