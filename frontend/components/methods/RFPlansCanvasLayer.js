export function createRFPlansCanvasLayer() {
  if (typeof window === 'undefined' || !window.L) {
    console.error('[RFPlansCanvasLayer] Leaflet no está disponible');
    return null;
  }

  const L = window.L;

  return L.Layer.extend({
    initialize: function (options = {}) {
      // options.radius, options.opacity etc.
      this._plans = [];
      this._hoveredPlan = null;
      L.setOptions(this, {
        pointRadius: options.pointRadius || 12,
        opacity: options.opacity || 0.8,
        borderColor: options.borderColor || 'rgba(255,0,0,0.8)',
        fillColor: options.fillColor || 'rgba(0,128,255,0.8)',
      });
    },

    setRFPlans(plans) {
      this._plans = Array.isArray(plans) ? plans : [];
      this._redraw();
    },

    onAdd: function (map) {
      this._map = map;

      this._canvas = L.DomUtil.create('canvas', 'leaflet-rfplans-canvas');
      this._canvas.style.position = 'absolute';
      this._canvas.style.pointerEvents = 'auto';

      this._ctx = this._canvas.getContext('2d');

      const container = map.getPane('overlayPane');
      container.appendChild(this._canvas);

      // Bind events
      // Mantener canvas alineado con el mapa en todos los movimientos y zooms
      map.on('resize move zoom', this._reset, this);

      // Mouse interactions - escuchar en el mapa para que múltiples capas reciban el evento
      map.on('mousemove', this._onMouseMove, this);
      map.on('mouseout', this._onMouseLeave, this);

      // Iniciamos animación de pulso
      this._pulseTime = performance.now();
      const _animate = () => {
        this._pulseTime = performance.now();
        this._reset();
        this._animationFrame = requestAnimationFrame(_animate);
      };
      this._animationFrame = requestAnimationFrame(_animate);
      this._reset();
    },

    onRemove: function () {
      const map = this._map;
      map.getPane('overlayPane').removeChild(this._canvas);
      map.off('resize move zoom', this._reset, this);
      map.off('mousemove', this._onMouseMove, this);
      map.off('mouseout', this._onMouseLeave, this);
      // Detenemos animación
      if (this._animationFrame) {
        cancelAnimationFrame(this._animationFrame);
        this._animationFrame = null;
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
      if (!ctx) return;

      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

      const zoom = this._map.getZoom();
      if (zoom < 12) return; // same threshold as DOM version

      for (const plan of this._plans) {
        if (typeof plan.lat !== 'number' || typeof plan.lng !== 'number') continue;
        const point = this._map.latLngToContainerPoint([plan.lat, plan.lng]);

        let radius = this._scaleRadius(zoom);
        const time = this._pulseTime || performance.now();
        const waveSpeed = 3000;
        const phase = ((time / waveSpeed) - (radius / 200)) * 2 * Math.PI;
        const pulseFactor = 1 + 0.025 * Math.sin(phase);
        radius = radius * pulseFactor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.closePath();

        // Gradient fill similar visual
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
        gradient.addColorStop(0, this.options.fillColor);
        gradient.addColorStop(1, 'rgba(0,128,255,0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.lineWidth = radius * 0.1;
        ctx.strokeStyle = this.options.borderColor;
        ctx.globalAlpha = this.options.opacity;
        ctx.stroke();
      }
    },

    _scaleRadius(zoom) {
      const minZoom = 12;
      const maxZoom = 18;
      const minSize = 4; // px
      const maxSize = 40; // px
      return Math.max(minSize, Math.min(maxSize, ((zoom - minZoom) / (maxZoom - minZoom)) * (maxSize - minSize) + minSize));
    },

    _onMouseMove: function (e) {
      if (!e.containerPoint) return;
      const x = e.containerPoint.x;
      const y = e.containerPoint.y;
      const zoom = this._map.getZoom();
      const radius = this._scaleRadius(zoom);
      const hitRadiusSq = radius * radius;

      let found = null;
      for (const plan of this._plans) {
        const p = this._map.latLngToContainerPoint([plan.lat, plan.lng]);
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= hitRadiusSq) {
          found = plan;
          break;
        }
      }

      if (found) {
        if (this._hoveredPlan !== found) {
          this._hoveredPlan = found;
          this.fire('planover', { plan: found });
        }
      } else {
        if (this._hoveredPlan) {
          this.fire('planout', { plan: this._hoveredPlan });
          this._hoveredPlan = null;
        }
      }
    },

    _onMouseLeave: function () {
      if (this._hoveredPlan) {
        this.fire('planout', { plan: this._hoveredPlan });
        this._hoveredPlan = null;
      }
    },
  });
}

export default {}
