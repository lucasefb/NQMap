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
      
      for (const plan of this._plans) {
        if (typeof plan.lat !== 'number' || typeof plan.lng !== 'number') continue;
        const point = this._map.latLngToContainerPoint([plan.lat, plan.lng]);

        if (plan.isCluster) {
          this._drawCluster(ctx, point, plan, zoom);
        } else {
          this._drawIndividualPlan(ctx, point, plan, zoom);
        }
      }
    },

    _drawCluster: function(ctx, point, cluster, zoom) {
      const count = cluster.count || 1;
      let size = 45;
      if (count >= 100) {
        size = 65;
      } else if (count >= 50) {
        size = 55;
      } else if (count === 1) {
        size = 35;
      }

      const colorMap = {
        // RF Plans específicos
        'Expansiones 4G': '#FF9800', // Naranja para 4G/LTE
        'Expansiones 5G': '#9C27B0', // Morado para 5G
        // Pre-Origin (para futura implementación)
        'Nuevo_Sitio': '#2196F3',
        'Nuevo_Anillo': '#4CAF50', 
        'Expansion_LTE': '#FF9800',
        'Expansion_NR': '#9C27B0',
        'Nuevo_Sector': '#F44336',
        'Expansion_Multiplexacion': '#00BCD4',
        'Punto_de_Interes_Indoor': '#FFC107',
        // Fallbacks
        'RF_PLAN': '#E91E63',
        'DEFAULT': '#9E9E9E',
      };

      const bgColor = colorMap[cluster.tipo] || colorMap['DEFAULT'];
      const ringColor = bgColor + '4D'; // Transparencia

      // Dibujar anillo exterior
      const outerRadius = size * 0.77 / 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = ringColor;
      ctx.fill();

      // Dibujar círculo interior
      const innerRadius = size * 0.65 / 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = bgColor;
      ctx.fill();

      // Dibujar texto del contador
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.floor(size / 4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count.toString(), point.x, point.y);
    },

    _drawIndividualPlan: function(ctx, point, plan, zoom) {
      if (zoom < 12) return; // threshold para planes individuales
      
      const radius = this._scaleRadius(zoom);
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
      ctx.globalAlpha = 1; // Reset alpha
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

      let found = null;
      for (const plan of this._plans) {
        const p = this._map.latLngToContainerPoint([plan.lat, plan.lng]);
        const dx = p.x - x;
        const dy = p.y - y;
        
        let hitRadius;
        if (plan.isCluster) {
          // Para clusters, usar el tamaño del cluster
          const count = plan.count || 1;
          let size = 45;
          if (count >= 100) size = 65;
          else if (count >= 50) size = 55;
          else if (count === 1) size = 35;
          hitRadius = size * 0.77 / 2;
        } else {
          // Para planes individuales, usar el radio escalado
          hitRadius = this._scaleRadius(zoom);
        }
        
        const hitRadiusSq = hitRadius * hitRadius;
        if (dx * dx + dy * dy <= hitRadiusSq) {
          found = plan;
          break;
        }
      }

      if (found) {
        if (this._hoveredPlan !== found) {
          this._hoveredPlan = found;
          this.fire('planover', { plan: found, event: e });
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
    
    _onClick: function(e) {
      if (!e.containerPoint) return;
      const x = e.containerPoint.x;
      const y = e.containerPoint.y;
      const zoom = this._map.getZoom();
      
      let found = null;
      for (const plan of this._plans) {
        const p = this._map.latLngToContainerPoint([plan.lat, plan.lng]);
        const dx = p.x - x;
        const dy = p.y - y;
        
        let hitRadius;
        if (plan.isCluster) {
          // Para clusters, usar el tamaño del cluster
          const count = plan.count || 1;
          let size = 45;
          if (count >= 100) size = 65;
          else if (count >= 50) size = 55;
          else if (count === 1) size = 35;
          hitRadius = size * 0.77 / 2;
        } else {
          // Para planes individuales, usar el radio escalado
          hitRadius = this._scaleRadius(zoom);
        }
        
        const hitRadiusSq = hitRadius * hitRadius;
        if (dx * dx + dy * dy <= hitRadiusSq) {
          found = plan;
          break;
        }
      }
      if (found) {
        this.fire('planclick', { plan: found, event: e });
      }
    },
  });
}

export default {}
