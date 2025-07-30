// BandsCanvasLayer.js
// Implementación de una capa de canvas personalizada para Leaflet que renderiza las bandas

// IMPORTANTE: Este archivo debe ser importado solo en el cliente
// --- Estilos de bandas (unificado con bandStyleMaps.js) ---
export const BASE_LINE_WIDTH = 6; // grosor default del trazo antes de escalar

// Colores por tecnología y banda
export const COLOR_BY_TECH_BAND = {
  'G    ': {
    'GSM 850': 'green',
    'GSM 1900': 'green'
  },
  'U    ': {
    'BANDA_850': '#FFD700',
    'BANDA_1900': '#FFD700'
  },
  'L    ': {
    '700': 'DeepSkyBlue',
    '850': 'DodgerBlue',
    '1900': 'MediumBlue',
    '2100': 'blue',
    '2600': 'MidnightBlue'
  },
  'NR   ': {
    '3500': 'violet',
    'N257': 'violet'
  }
};

// Tamaños base por tecnología y banda (diámetro antes de escalar)
export const SIZE_BY_TECH_BAND = {
  'G    ': {
    'GSM 850': 40,
    'GSM 1900': 45
  },
  'U    ': {
    'BANDA_850': 55,
    'BANDA_1900': 60
  },
  'L    ': {
    '700': 70,
    '850': 80,
    '1900': 90,
    '2100': 100,
    '2600': 110
  },
  'NR   ': {
    '3500': 125,
    'N257': 135
  }
};

export const DEFAULT_COLOR = 'gray';
export const DEFAULT_SIZE = 75;
// --- Fin estilos bandas ---
// cachés para evitar recalcular colores/tamaños
const colorCache = new Map();
const sizeCache = new Map();
// No usar import directo, usar import dinámico en mounted()

export function createBandsCanvasLayer() {
  // Verificamos que estemos en el cliente y que Leaflet esté disponible
  if (typeof window === 'undefined' || !window.L) {
    console.error('[BandsCanvasLayer] Leaflet no está disponible');
    return null;
  }
  
  const L = window.L;
  
  return L.Layer.extend({
    initialize: function(options) {
      this._bands = [];
      this._hoveredBand = null;
      L.setOptions(this, options);
    },

    onAdd: function(map) {
      this._map = map;
      
      // Creamos el elemento canvas
      this._canvas = L.DomUtil.create('canvas', 'leaflet-bands-canvas');
      this._ctx = this._canvas.getContext('2d');
      
      // Configuramos el contenedor
      const container = map.getPane('overlayPane');
      container.appendChild(this._canvas);
      
      // Estilos del canvas
      this._canvas.style.position = 'absolute';
      this._canvas.style.pointerEvents = 'auto';
      
      // Eventos del mapa
      map.on('resize', this._reset, this);
      // Redraw continuo pero con throttling para evitar saltos
      this._scheduleRedraw = this._scheduleRedraw.bind(this);
      map.on('move', this._scheduleRedraw, this);
      map.on('zoom', this._scheduleRedraw, this);
      
      // Eventos del mouse para interactividad
      L.DomEvent.on(this._canvas, 'mousemove', this._onMouseMove, this);
      L.DomEvent.on(this._canvas, 'mouseout', this._onMouseOut, this);
      L.DomEvent.on(this._canvas, 'click', this._onClick, this);
      
      this._reset();
    },

    _scheduleRedraw: function() {
      if (this._redrawScheduled) return;
      this._redrawScheduled = true;
      requestAnimationFrame(() => {
        this._redrawScheduled = false;
        this._reset();
      });
    },

    onRemove: function(map) {
      L.DomUtil.remove(this._canvas);
      map.off('resize', this._reset, this);
      map.off('move', this._scheduleRedraw, this);
      map.off('zoom', this._scheduleRedraw, this);
      map.off('move', this._onMove, this);
      L.DomEvent.off(this._canvas, 'mousemove', this._onMouseMove, this);
      L.DomEvent.off(this._canvas, 'mouseout', this._onMouseOut, this);
      L.DomEvent.off(this._canvas, 'click', this._onClick, this);
    },

    // Método para actualizar las bandas
    setBands: function(bands) {
      const previousCount = this._bands.length;
      this._bands = bands;
      
      if (bands.length > 0) {
        // Contamos por tecnología para información útil
        const techCount = {};
        bands.forEach(band => {
          const tech = band.tecnologia.trim();
          techCount[tech] = (techCount[tech] || 0) + 1;
        });
        
        const techInfo = Object.entries(techCount)
          .map(([tech, count]) => `${tech}: ${count}`)
          .join(', ');
        
        console.log(`[Canvas] 📡 Actualizando bandas: ${previousCount} → ${bands.length} (${techInfo})`);
      }
      
      this._reset();
    },

    // Redibuja todo el canvas
    _reset: function() {
      if (!this._map || !this._canvas) return;
      
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);

      const size = this._map.getSize();
      this._canvas.width = size.x;
      this._canvas.height = size.y;

      this._redraw();
    },

    // Ajusta la posición durante el movimiento
    _onMove: function() {
      if (!this._canvas) return;
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
    },

    // Dibuja todas las bandas en el canvas
    _redraw: function() {
      if (!this._ctx || !this._canvas) return;
      
      const startTime = performance.now();
      const ctx = this._ctx;
      const map = this._map;
      
      // Limpiamos el canvas
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      
      // Configuraciones de dibujo comunes
      ctx.lineCap = 'round'; // Extremos redondeados para las líneas
      ctx.globalAlpha = 0.4;
      
      let bandsDrawn = 0;
      
      // Ordenamos las bandas por tamaño (las más grandes primero)
      // Esto ayuda a que las bandas más pequeñas se dibujen encima
      const sortedBands = [...this._bands].sort((a, b) => {
        const sizeA = this._getSizeForBand(a);
        const sizeB = this._getSizeForBand(b);
        return sizeB - sizeA;
      });
      
      // Dibujamos cada banda
      sortedBands.forEach(band => {
        const point = map.latLngToContainerPoint([band.lat, band.lng]);
        
        // Solo dibujamos si está dentro del viewport
        if (point.x >= -50 && point.x <= this._canvas.width + 50 &&
            point.y >= -50 && point.y <= this._canvas.height + 50) {
          this._drawBand(ctx, band, point);
          bandsDrawn++;
        }
      });
      
      const drawTime = performance.now() - startTime;
      
      // Información más detallada del rendimiento
      if (bandsDrawn > 0) {
        const fps = Math.round(1000 / drawTime);
        console.log(`[Canvas] ✅ ${bandsDrawn} bandas dibujadas en ${drawTime.toFixed(1)}ms (~${fps} FPS) | ${(drawTime/bandsDrawn).toFixed(2)}ms por banda`);
      }
    },

    // Dibuja una banda individual
    _drawBand: function(ctx, band, point) {
      ctx.save();
      
      // Traducimos al punto central
      ctx.translate(point.x, point.y);
      
      // Rotamos según el azimuth
      ctx.rotate(band.azimuth * Math.PI / 180);
      
      // Determinamos el color según la tecnología y banda
      const color = this._getColorForBand(band);
      
      // Calculamos el tamaño basado en el zoom y la escala original
      const baseSize = this._getSizeForBand(band);
      const zoom = this._map.getZoom();
      const scaleFactor = this._getScaleFactor(zoom);
      const size = baseSize * scaleFactor * 0.7; // 0.7 es el scaleTotal del original
      
      // NUEVO: Dibujamos solo una franja curva, no un cono completo
      // Configuramos el estilo de la línea
      ctx.strokeStyle = color;
      ctx.lineCap = 'butt'; // Extremos planos para que se vea más como el original
      
      // Agregamos una sombra sutil para mejor visibilidad cuando se superponen
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      // El grosor depende del zoom y es proporcional al tamaño
      const baseLineWidth = BASE_LINE_WIDTH; // Grosor base más delgado
      const lineWidth = baseLineWidth * scaleFactor * 0.8;
      ctx.lineWidth = lineWidth;
      
      // Dibujamos solo el arco (sin líneas hacia el centro)
      ctx.beginPath();
      // El arco va de 135° a 225° (semicírculo inferior)
      // Ajustamos para que sea más parecido al original (menos de 180°)
      ctx.arc(0, 0, size, -Math.PI * 0.65, -Math.PI * 0.35, false);
      
      // Si está resaltada (hover), la dibujamos con mayor opacidad
      if (this._hoveredBand === band) {
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = lineWidth * 1.2; // Un poco más gruesa en hover
      } else {
        ctx.globalAlpha = 0.4;
      }
      
      // Solo dibujamos el trazo
      ctx.stroke();
      
      // Limpiamos la sombra para que no afecte otros dibujos
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      ctx.restore();
    },

    // Factor de escala según el zoom (igual que en el original)
    _getScaleFactor: function(zoom) {
      const minZoom = 12;
      const maxZoom = 18;
      const minSize = 0.1;
      const maxSize = 2;
      return Math.max(minSize, Math.min(maxSize, 
        (zoom - minZoom) / (maxZoom - minZoom) * (maxSize - minSize) + minSize
      ));
    },

    // Obtiene el color según tecnología y banda (mapeo del original)
    _getColorForBand: function(band) {
      // Incluimos el estado del filtro loadCellsWithBigPRB en la key del cache
      const key = `${band.tecnologia}-${band.banda}-${band.load}-${this.options.loadCellsWithBigPRB}`;
      if (colorCache.has(key)) return colorCache.get(key);

      // 4G con mucha carga solo si el filtro está activo
      if (band.tecnologia === 'L    ' && band.load === 1 && this.options.loadCellsWithBigPRB) {
        colorCache.set(key, 'red');
        return 'red';
      }

      const techMap = COLOR_BY_TECH_BAND[band.tecnologia] || {};
      const color = techMap[band.banda] || DEFAULT_COLOR;
      colorCache.set(key, color);
      return color;
    },

    // Obtiene el tamaño base según tecnología y banda (del original)
    _getSizeForBand: function(band) {
      const key = `${band.tecnologia}-${band.banda}`;
      if (sizeCache.has(key)) return sizeCache.get(key);
      const techMap = SIZE_BY_TECH_BAND[band.tecnologia] || {};
      const size = techMap[band.banda] || DEFAULT_SIZE;
      sizeCache.set(key, size);
      return size;
    },

    // Manejo del mouse para hover
    _onMouseMove: function(e) {
      const point = this._map.mouseEventToContainerPoint(e);
      const hoveredBand = this._findBandAtPoint(point);
      
      if (hoveredBand !== this._hoveredBand) {
        this._hoveredBand = hoveredBand;
        this._redraw();
        
        // Emitimos evento para mostrar tooltip
        if (hoveredBand) {
          this._canvas.style.cursor = 'pointer';
          this.fire('bandover', { band: hoveredBand, originalEvent: e });
        } else {
          this._canvas.style.cursor = '';
          this.fire('bandout');
        }
      }
    },

    _onMouseOut: function() {
      if (this._hoveredBand) {
        this._hoveredBand = null;
        this._canvas.style.cursor = '';
        this._redraw();
        this.fire('bandout');
      }
    },

    _onClick: function(e) {
      const point = L.DomEvent.getMousePosition(e, this._canvas);
      const clickedBand = this._findBandAtPoint(point);
      
      if (clickedBand) {
        this.fire('bandclick', { band: clickedBand, originalEvent: e });
      }
    },

    // Encuentra la banda en un punto específico
    _findBandAtPoint: function(point) {
      // Iteramos en orden inverso para detectar las bandas superiores primero
      for (let i = this._bands.length - 1; i >= 0; i--) {
        const band = this._bands[i];
        const bandPoint = this._map.latLngToContainerPoint([band.lat, band.lng]);
        
        // Calculamos la distancia y el ángulo
        const dx = point.x - bandPoint.x;
        const dy = point.y - bandPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Verificamos si está dentro del rango de la banda
        const size = this._getSizeForBand(band) * this._getScaleFactor(this._map.getZoom()) * 0.7;
        const lineWidth = 6 * this._getScaleFactor(this._map.getZoom()) * 0.8;
        
        // Para una franja, verificamos si está cerca del arco (no dentro del área completa)
        const innerRadius = size - lineWidth * 1.5;
        const outerRadius = size + lineWidth * 1.5;
        
        if (distance >= innerRadius && distance <= outerRadius) {
          // Verificamos el ángulo
          let angle = Math.atan2(-dy, dx) * 180 / Math.PI;
          angle = (angle + 360) % 360;
          
          // Ajustamos por el azimuth de la banda
          let canvasAzimuth = (450 - band.azimuth) % 360;
          let relativeAngle = (angle - canvasAzimuth + 360) % 360;
          
          // Verificamos si está dentro del sector visible (arco de 135° a 225° dibujado)
            // Debido a que el resultado puede envolver 0°, evaluamos dos rangos equivalentes
            const inSector = (relativeAngle >= 315 || relativeAngle <= 45);
            if (inSector) {
            return band;
          }
        }
      }
      
      return null;
    }
  });
}

// Evitamos errores del sistema de auto-import de Nuxt que espera una exportación por defecto en archivos dentro de components/
export default {}