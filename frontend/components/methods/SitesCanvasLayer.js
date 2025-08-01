export function createSitesCanvasLayer() {
  if (typeof window === 'undefined' || !window.L) return null;
  const L = window.L;

  return L.Layer.extend({
    initialize: function () {
      this._sites = [];
      this._hovered = null;
    },

    setSites(sites) {
      this._sites = Array.isArray(sites) ? sites : [];
      this._redraw();
    },

    onAdd: function (map) {
      this._map = map;
      this._canvas = L.DomUtil.create('canvas', 'leaflet-sites-canvas');
      this._canvas.style.position = 'absolute';
      this._canvas.style.pointerEvents = 'auto';
      this._ctx = this._canvas.getContext('2d');

      map.getPane('overlayPane').appendChild(this._canvas);
      map.on('resize move zoom', this._reset, this);
      map.on('mousemove', this._onMouseMove, this);
      map.on('mouseout', this._onMouseLeave, this);
      map.on('click', this._onClick, this);

      this._reset();
    },

    onRemove: function () {
      const map = this._map;
      map.getPane('overlayPane').removeChild(this._canvas);
      map.off('resize move zoom', this._reset, this);
      map.off('mousemove', this._onMouseMove, this);
      map.off('mouseout', this._onMouseLeave, this);
      map.off('click', this._onClick, this);
    },

    _reset: function () {
      const size = this._map.getSize();
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      this._canvas.width = size.x;
      this._canvas.height = size.y;
      this._redraw();
    },

    _scaleRadius(count) {
      if (count >= 100) return 32;
      if (count >= 50) return 26;
      if (count === 1) return 18;
      return 22;
    },

    _redraw: function () {
      if (!this._ctx) return;
      const ctx = this._ctx;
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      const zoom = this._map.getZoom();
      if (zoom < 10) return;

      for (const s of this._sites) {
        const p = this._map.latLngToContainerPoint([s.lat, s.lng]);
        if (s.isCluster) {
          const r = this._scaleRadius(s.count || 1);
          const color = 'rgba(25, 118, 210, 0.8)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = `bold ${Math.floor(r * 0.7)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(s.count || 1), p.x, p.y);
        } else {
          const name = s.nombre || '';
          ctx.font = '12px sans-serif';
          const padding = 4;
          const textW = ctx.measureText(name).width;
          const rectW = textW + padding * 2;
          const rectH = 16;
          ctx.fillStyle = 'yellow';
          ctx.fillRect(p.x - rectW / 2, p.y - rectH / 2, rectW, rectH);
          ctx.fillStyle = 'black';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(name, p.x, p.y);
        }
      }
    },

    _hitTest(site, x, y) {
      const p = this._map.latLngToContainerPoint([site.lat, site.lng]);
      if (site.isCluster) {
        const r = this._scaleRadius(site.count || 1);
        const dx = p.x - x;
        const dy = p.y - y;
        return dx * dx + dy * dy <= r * r;
      } else {
        return Math.abs(p.x - x) <= 10 && Math.abs(p.y - y) <= 4;
      }
    },

    _onMouseMove: function (e) {
      if (!e.containerPoint) return;
      const { x, y } = e.containerPoint;
      let found = null;
      for (const s of this._sites) {
        if (this._hitTest(s, x, y)) { found = s; break; }
      }
      if (found && this._hovered !== found) {
        this._hovered = found;
        this.fire('siteover', { site: found });
      } else if (!found && this._hovered) {
        this.fire('siteout', { site: this._hovered });
        this._hovered = null;
      }
    },

    _onMouseLeave: function () {
      if (this._hovered) {
        this.fire('siteout', { site: this._hovered });
        this._hovered = null;
      }
    }
  });
}
