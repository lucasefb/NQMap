const BASE = process.env.APP_ENV === 'prod' ? process.env.API_BASE_URL_PROD : process.env.API_BASE_URL_LOCAL;
const API_BASE_URL = BASE || '';

// Coverage Canvas Layer - Leaflet layer for rendering coverage overlays on canvas
function createCoverageCanvasLayer() {
  if (typeof window === 'undefined' || !window.L) {
    console.error('[CoverageCanvasLayer] Leaflet no está disponible');
    return null;
  }

  const L = window.L;

  return L.Layer.extend({
    initialize: function (options) {
      this._overlays = [];
      this._imagesCache = new Map();
      this._activeKeys = new Set();
      L.setOptions(this, options);
    },

    onAdd: function (map) {
      this._map = map;
      this._canvas = L.DomUtil.create('canvas', 'leaflet-coverage-canvas');
      this._ctx = this._canvas.getContext('2d');
      const pane = map.getPane('overlayPane');
      pane.appendChild(this._canvas);

      this._canvas.style.position = 'absolute';

      map.on('resize move zoom', this._reset, this);
      this._reset();
    },

    onRemove: function (map) {
      L.DomUtil.remove(this._canvas);
      map.off('resize move zoom', this._reset, this);
    },

    setOverlays: function (overlays) {
      this._overlays = overlays;
      this._preloadImages(overlays);
      this._reset();
    },

    _normalizeKey: function (k) {
      return (k || '').replace(/\s+/g, ' ').trim().toUpperCase();
    },

    setActiveKeys: function (keys) {
      this._activeKeys = new Set(keys.map(this._normalizeKey));
      this._reset();
    },

    _preloadImages: function (overlays) {
      for (const ov of overlays) {
        if (this._imagesCache.has(ov.imageUrl)) continue;
        const img = new Image();
        img.src = ov.imageUrl;
        img.onload = () => {
          this._imagesCache.set(ov.imageUrl, img);
          this._reset();
        };
      }
    },

    _reset: function () {
      if (!this._map) return;
      const size = this._map.getSize();
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      this._canvas.width = size.x;
      this._canvas.height = size.y;
      this._redraw();
    },

    _redraw: function () {
      const ctx = this._ctx;
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      const zoom = this._map.getZoom();
      if (zoom < 12) return; // No dibujar si el zoom es muy lejano

      for (const ov of this._overlays) {
        // Match overlay key with any active type (RSRP, RSRQ, TH_DL)
    const normKey = this._normalizeKey(ov.key);
    const isActive = [...this._activeKeys].some(active => normKey.includes(active));
    if (!isActive) continue;
        const img = this._imagesCache.get(ov.imageUrl);
        if (!img) continue; // Aún no cargó

        const [south, west, north, east] = ov.bounds;
        const nw = this._map.latLngToContainerPoint([north, west]);
        const se = this._map.latLngToContainerPoint([south, east]);
        const width = se.x - nw.x;
        const height = se.y - nw.y;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(img, nw.x, nw.y, width, height);
      }
    }
  });
}

// Main logic for handling KMZ overlays
export default {
  // Descarga overlays visibles al viewport actual y actualiza la capa
async loadCoverageOverlays() {
    // Evitar múltiples llamadas simultáneas
    if (this._loadingCoverage) return;
    
    // Solo cargar si el zoom es suficiente
    if (this.mapInstance && this.mapInstance.getZoom() < 12) {
      return;
    }

    this._loadingCoverage = true;
    
    try {
      if (!this.mapInstance) return;
    const b = this.mapInstance.getBounds();
    const params = {
      neLat: b.getNorthEast().lat,
      neLng: b.getNorthEast().lng,
      swLat: b.getSouthWest().lat,
      swLng: b.getSouthWest().lng,
    };
    const res = await this.$axios.get(`${API_BASE_URL}/api/coverage4g-python`, { params });
      
      this.coverageOverlays = res.data;
    // Si la capa ya existe, actualizarla al vuelo
    if (this.coverageLayer) {
      this.coverageLayer.setOverlays(this.coverageOverlays);
      this._setActiveKeys();
    }
      
      // Intentar crear la capa si el mapa ya está listo
      this._createCoverageLayerIfPossible();
    } catch (e) {
      console.error('Error cargando overlays:', e);
    } finally {
      this._loadingCoverage = false;
    }
  },

  _createCoverageLayerIfPossible() {
    
    if (!this.mapInstance || !this.coverageOverlays || this.coverageOverlays.length === 0) return;
    if (!this.coverageLayer) {
      
      const CoverageLayerClass = createCoverageCanvasLayer();
      if (!CoverageLayerClass) return;
      this.coverageLayer = new CoverageLayerClass();
      this.coverageLayer.addTo(this.mapInstance);
      this.coverageLayer.setOverlays(this.coverageOverlays);
    }
    // Ajustar keys activas cada vez que se cree o cambien filtros
    this._setActiveKeys();
  },

  _setActiveKeys() {
    const before = this._activeKeysCount || 0;
    if (!this.coverageLayer) return;
    const activeKeys = Object.entries(this.filterByCoverageLTE || {})
      .filter(([k, v]) => v)
      .map(([k]) => k);
    
    this.coverageLayer.setActiveKeys(activeKeys);
    this._activeKeysCount = activeKeys.length;
    
  },

  updateCoverageLayer() {
    // Intenta crear la capa si aún no existe
    this._createCoverageLayerIfPossible();
    // Si ya existe, sólo actualiza las keys
    this._setActiveKeys();
  }
};
