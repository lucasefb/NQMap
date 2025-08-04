export function createPreOriginCanvasLayer() {
  if (typeof window === 'undefined' || !window.L) {
    console.error('[PreOriginCanvasLayer] Leaflet no está disponible');
    return null;
  }

  const L = window.L;

  return L.Layer.extend({
    initialize: function (options = {}) {
      this._origins = [];
      this._hovered = null;
      L.setOptions(this, {
        pointRadius: options.pointRadius || 15,
        borderColor: options.borderColor || 'rgba(255,165,0,0.9)',
        fillColor: options.fillColor || 'rgba(255,165,0,1)',
        opacity: options.opacity || 0.6,
      });
    },

    setOrigins(origins) {
      this._origins = Array.isArray(origins) ? origins : [];
      this._redraw();
    },

    onAdd: function (map) {
      this._map = map;
      this._canvas = L.DomUtil.create('canvas', 'leaflet-preorigin-canvas');
      this._canvas.style.position = 'absolute';
      this._canvas.style.pointerEvents = 'auto';
      this._ctx = this._canvas.getContext('2d');

      map.getPane('overlayPane').appendChild(this._canvas);
      map.on('resize move zoom', this._reset, this);
      // Escuchar eventos de mouse en el mapa para que múltiples capas convivan
      map.on('mousemove', this._onMouseMove, this);
      map.on('mouseout', this._onMouseLeave, this);

      this._reset();
    },

    onRemove: function () {
      const map = this._map;
      map.getPane('overlayPane').removeChild(this._canvas);
      map.off('resize move zoom', this._reset, this);
      map.off('mousemove', this._onMouseMove, this);
      map.off('mouseout', this._onMouseLeave, this);
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

    _scaleRadius(zoom) {
      const minZoom = 12;
      const maxZoom = 18;
      const minSize = 6;
      const maxSize = 50;
      return Math.max(minSize, Math.min(maxSize, ((zoom - minZoom) / (maxZoom - minZoom)) * (maxSize - minSize) + minSize));
    },

    _redraw: function () {
      const ctx = this._ctx;
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

      const zoom = this._map.getZoom();
      if (zoom < 12) return;

      for (const origin of this._origins) {
        if (typeof origin.lat !== 'number' || typeof origin.lng !== 'number') continue;
        const p = this._map.latLngToContainerPoint([origin.lat, origin.lng]);
        const radius = this._scaleRadius(zoom);

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.closePath();

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        gradient.addColorStop(0, this.options.fillColor);
        gradient.addColorStop(1, 'rgba(255,165,0,0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.globalAlpha = this.options.opacity;
        ctx.lineWidth = radius * 0.12;
        ctx.strokeStyle = this.options.borderColor;
        ctx.stroke();
      }
    },

    _onMouseMove: function (e) {
      if (!e.containerPoint) return;
      const x = e.containerPoint.x;
      const y = e.containerPoint.y;
      const radius = this._scaleRadius(this._map.getZoom());
      const hitR2 = radius * radius;

      let found = null;
      for (const origin of this._origins) {
        const p = this._map.latLngToContainerPoint([origin.lat, origin.lng]);
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= hitR2) {
          found = origin;
          break;
        }
      }

      if (found) {
        if (this._hovered !== found) {
          this._hovered = found;
          this.fire('originover', { origin: found });
        }
      } else if (this._hovered) {
        this.fire('originout', { origin: this._hovered });
        this._hovered = null;
      }
    },

    _onMouseLeave: function () {
      if (this._hovered) {
        this.fire('originout', { origin: this._hovered });
        this._hovered = null;
      }
    },
  });
}

export default {}