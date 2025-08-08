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

    _scaleRadius(zoom) {
      const minZoom = 12;
      const maxZoom = 18;
      const minSize = 6;
      const maxSize = 50;
      return Math.max(minSize, Math.min(maxSize, ((zoom - minZoom) / (maxZoom - minZoom)) * (maxSize - minSize) + minSize));
    },

    _redraw: function () {
      const ctx = this._ctx;
      if (!ctx) return;

      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

      const zoom = this._map.getZoom();
      
      for (const origin of this._origins) {
        if (typeof origin.lat !== 'number' || typeof origin.lng !== 'number') continue;
        const point = this._map.latLngToContainerPoint([origin.lat, origin.lng]);

        if (origin.isCluster) {
          this._drawCluster(ctx, point, origin, zoom);
        } else {
          this._drawIndividualOrigin(ctx, point, origin, zoom);
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
        // Pre-Origin específicos
        'Nuevo_Sitio': '#2196F3',
        'Nuevo_Anillo': '#4CAF50', 
        'Expansion_LTE': '#FF9800',
        'Expansion_NR': '#9C27B0',
        'Nuevo_Sector': '#F44336',
        'Expansion_Multiplexacion': '#00BCD4',
        'Punto_de_Interes_Indoor': '#FFC107',
        // Fallbacks
        'PRE_ORIGIN': '#FF9800',
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

    _drawIndividualOrigin: function(ctx, point, origin, zoom) {
      const radius = this._scaleRadius(zoom);

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      gradient.addColorStop(0, this.options.fillColor);
      gradient.addColorStop(1, 'rgba(255,165,0,0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.globalAlpha = this.options.opacity;
      ctx.lineWidth = radius * 0.12;
      ctx.strokeStyle = this.options.borderColor;
      ctx.stroke();
      ctx.globalAlpha = 1.0; // Resetear alpha
    },

    _onMouseMove: function (e) {
      if (!e.containerPoint) return;
      const x = e.containerPoint.x;
      const y = e.containerPoint.y;

      let found = null;
      for (const origin of this._origins) {
        const p = this._map.latLngToContainerPoint([origin.lat, origin.lng]);
        const dx = p.x - x;
        const dy = p.y - y;
        
        // Calcular radio según si es cluster o individual
        let hitRadius;
        if (origin.isCluster) {
          const count = origin.count || 1;
          let size = 45;
          if (count >= 100) size = 65;
          else if (count >= 50) size = 55;
          else if (count === 1) size = 35;
          hitRadius = size * 0.77 / 2;
        } else {
          hitRadius = this._scaleRadius(this._map.getZoom());
        }
        
        const hitR2 = hitRadius * hitRadius;
        if (dx * dx + dy * dy <= hitR2) {
          found = origin;
          break;
        }
      }

      if (found) {
        if (this._hovered !== found) {
          this._hovered = found;
          this.fire('originover', { origin: found, event: e });
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

    _onClick: function (e) {
      if (!e.containerPoint) return;
      const x = e.containerPoint.x;
      const y = e.containerPoint.y;
      
      let found = null;
      for (const origin of this._origins) {
        const p = this._map.latLngToContainerPoint([origin.lat, origin.lng]);
        const dx = p.x - x;
        const dy = p.y - y;
        
        // Calcular radio según si es cluster o individual
        let hitRadius;
        if (origin.isCluster) {
          const count = origin.count || 1;
          let size = 45;
          if (count >= 100) size = 65;
          else if (count >= 50) size = 55;
          else if (count === 1) size = 35;
          hitRadius = size * 0.77 / 2;
        } else {
          hitRadius = this._scaleRadius(this._map.getZoom());
        }
        
        const hitR2 = hitRadius * hitRadius;
        if (dx * dx + dy * dy <= hitR2) {
          found = origin;
          break;
        }
      }
      
      if (found) {
        this.fire('originclick', { origin: found, event: e });
      }
    },
  });
}

export default {}