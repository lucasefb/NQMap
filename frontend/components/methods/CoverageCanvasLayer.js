// CoverageCanvasLayer.js
// Capa Leaflet que dibuja los GroundOverlay de cobertura (RSRP/RSRQ/THDL) sobre un canvas
// Mucho más rápida que usar múltiples L.imageOverlay.
// Sólo se necesita mostrar la imagen, sin interactividad por polígono.

/*
 * overlay: {
 *   key: 'LTE RSRP MEDI.kmz',
 *   imageUrl: 'http://localhost:3000/extracted/LTE RSRP MEDI/overlay_0.png',
 *   bounds: [south, west, north, east]
 * }
 */

export function createCoverageCanvasLayer() {
  if (typeof window === 'undefined' || !window.L) {
    console.error('[CoverageCanvasLayer] Leaflet no está disponible');
    return null;
  }

  const L = window.L;

  return L.Layer.extend({
    initialize: function (options) {
      this._overlays = [];
      this._imagesCache = new Map(); // key -> HTMLImageElement
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
        if (!this._activeKeys.has(this._normalizeKey(ov.key))) continue;
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

// Evitamos que Nuxt intente autoimportar por defecto
export default {};
