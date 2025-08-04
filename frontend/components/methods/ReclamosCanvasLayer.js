export function createReclamosCanvasLayer() {
  if (typeof window === 'undefined' || !window.L) return null;
  const L = window.L;

  return L.Layer.extend({
    initialize: function (options) {
      this._groups = [];
      this._hovered = null;
      L.setOptions(this, options);
    },

    setGroups(groups) {
      this._groups = Array.isArray(groups) ? groups : [];
      this._redraw();
    },

    onAdd: function (map) {
      this._map = map;
      this._canvas = L.DomUtil.create('canvas', 'leaflet-reclamos-canvas');
      this._canvas.style.position = 'absolute';
      this._ctx = this._canvas.getContext('2d');
      map.getPane('overlayPane').appendChild(this._canvas);

      map.on('resize move zoom', this._reset, this);
      map.on('mousemove', this._onMouseMove, this);
      map.on('mouseout', this._onMouseOut, this);
      map.on('click', this._onClick, this);

      this._reset();
    },

    onRemove: function () {
      const map = this._map;
      if (!map) return;
      map.getPane('overlayPane').removeChild(this._canvas);
      map.off('resize move zoom', this._reset, this);
      map.off('mousemove', this._onMouseMove, this);
      map.off('mouseout', this._onMouseOut, this);
      map.off('click', this._onClick, this);
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

    _drawIcon(ctx, p, tipo) {
      const color = (tipo || '').toUpperCase() === 'VIP' ? '#007bff' : '#ff0000';
      const r = 10;
      
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      
      // Draw crisp circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Add exclamation mark
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', p.x, p.y);
      
      ctx.restore();
    },

    _redraw: function () {
      if (!this._ctx) return;
      const ctx = this._ctx;
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      if (!this._map) return;

      for (const g of this._groups) {
        const p = this._map.latLngToContainerPoint([g.lat, g.lng]);
        const tipo = g.markers[0]?.tipo || g.markers[0]?.TIPO_RECLAMO;
        this._drawIcon(ctx, p, tipo);
        if (g.markers.length > 1) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(g.markers.length), p.x, p.y);
        }
      }
    },

    _hitTest(g, x, y) {
      const p = this._map.latLngToContainerPoint([g.lat, g.lng]);
      const r = 14;
      const dx = p.x - x;
      const dy = p.y - y;
      return dx * dx + dy * dy <= r * r;
    },

    _handleHover(x, y) {
      let hit = null;
      for (const g of this._groups) {
        if (this._hitTest(g, x, y)) { hit = g; break; }
      }
      if (hit !== this._hovered) {
        if (this._hovered) this.fire('reclamoout', { group: this._hovered });
        if (hit) this.fire('reclamoover', { group: hit });
        this._hovered = hit;
      }
    },

    _onMouseMove: function (e) {
      if (!e.containerPoint) return;
      const { x, y } = e.containerPoint;
      this._handleHover(x, y);
    },

    _onMouseOut: function () {
      if (this._hovered) {
        this.fire('reclamoout', { group: this._hovered });
        this._hovered = null;
      }
    },

    _onClick: function (e) {
      if (!e.containerPoint) return;
      const { x, y } = e.containerPoint;
      for (const g of this._groups) {
        if (this._hitTest(g, x, y)) {
          this.fire('reclamoclick', { group: g });
          break;
        }
      }
    }
  });
}

export default {}