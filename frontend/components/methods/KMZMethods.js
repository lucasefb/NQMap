const API_BASE_URL = process.env.APP_ENV === 'prod' ? process.env.API_BASE_URL_PROD : process.env.API_BASE_URL_LOCAL;

export default {
  async loadKMZ() {
    this.isLoading = true;
    try {
      await this.processKMZFiles(this.filterByCoverageLTE);
    } catch (error) {
      console.error('Error loading KMZ files:', error);
    } finally {
      this.isLoading = false;
    }
  },

  async processKMZFiles(filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (value === true && !this.loadedKMZFiles.has(key)) {
        const filename = encodeURIComponent(key);
        console.log(`📂 Solicitando KMZ: ${filename}`);

        try {
          const response = await this.$axios.get(`${API_BASE_URL}/api/get-kmz/${filename}`);
          const parser = new DOMParser();
          const kmlXml = parser.parseFromString(response.data.kml, 'text/xml');
          const groundoverlays = kmlXml.getElementsByTagName('GroundOverlay');

          const newOverlays = [];

          for (const overlay of groundoverlays) {
            const icon = overlay.getElementsByTagName('Icon')[0];
            let href = icon.getElementsByTagName('href')[0].textContent;
            href = href.replace(/\\/g, '/');
            const imageUrl = `${API_BASE_URL}${href}`;

            const latLonBox = overlay.getElementsByTagName('LatLonBox')[0];
            const north = parseFloat(latLonBox.getElementsByTagName('north')[0].textContent);
            const south = parseFloat(latLonBox.getElementsByTagName('south')[0].textContent);
            const east = parseFloat(latLonBox.getElementsByTagName('east')[0].textContent);
            const west = parseFloat(latLonBox.getElementsByTagName('west')[0].textContent);
            const bounds = [[south, west], [north, east]];

            const overlayLayer = L.imageOverlay(imageUrl, bounds, {
              opacity: 0.3
            }).addTo(this.mapInstance);

            newOverlays.push({ key, overlay: overlayLayer });
          }

          // Guardar overlays nuevos
          newOverlays.forEach(obj => {
            this.groundOverlays.push(obj);
          });

          this.loadedKMZFiles.add(key);
          console.log(`✅ KMZ ${key} agregado al mapa.`);
        } catch (error) {
          console.error(`❌ Error cargando KMZ "${key}":`, error);
        }
      }
    }
  },

  updateKMZLayer() {
    const allFalse = Object.values(this.filterByCoverageLTE).every(v => v === false);

    if (allFalse || this.zoom < 12) {
      // Si no hay nada activado o no hay zoom suficiente → limpiar todo
      this.groundOverlays.forEach(obj => this.mapInstance.removeLayer(obj.overlay));
      this.groundOverlays = [];
      this.loadedKMZFiles = new Set();
      return;
    }

    // Eliminar overlays que fueron desactivados
    const activeKeys = Object.entries(this.filterByCoverageLTE)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);

    const overlaysToKeep = [];
    const overlaysToRemove = [];

    for (const obj of this.groundOverlays) {
      if (activeKeys.includes(obj.key)) {
        overlaysToKeep.push(obj);
      } else {
        this.mapInstance.removeLayer(obj.overlay);
        this.loadedKMZFiles.delete(obj.key);
      }
    }

    this.groundOverlays = overlaysToKeep;

    // Cargar archivos nuevos (si los hay)
    this.loadKMZ();

    this.previousZoom = this.zoom;
  }
};
