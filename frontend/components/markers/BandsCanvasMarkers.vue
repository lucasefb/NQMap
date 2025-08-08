<template>
  <div>
    <Tooltip ref="tooltipRef" extraClass="bands-tooltip" />
  </div>
</template>

<script>
import Tooltip from '~/components/Tooltip.vue';

// Versión simplificada que evita problemas de timing
export default {
  name: 'BandsSimpleCanvas',
  components: {
    Tooltip,
  },
  props: {
    markers: {
      type: Array,
      default: () => []
    },
    zoom: {
      type: Number,
      required: true
    },
    loadCellsWithBigPRB: {
      type: Boolean,
      default: false
    },
    mapInstance: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      canvasLayer: null,
      isInitialized: false,
      activePopupKey: null
    };
  },
  
  computed: {
    shouldRender() {
      return this.zoom >= 14 && this.markers.length > 0;
    }
  },
  
  watch: {
    // Observamos todos los cambios relevantes
    shouldRender(newVal) {
      if (newVal && this.mapInstance && !this.isInitialized) {
        this.initialize();
      } else if (!newVal && this.canvasLayer) {
        this.removeLayer();
      }
    },
    
    markers(newMarkers) {
      if (this.canvasLayer && newMarkers) {
        this.canvasLayer.setBands(newMarkers);
      }
    },
    
    loadCellsWithBigPRB(newValue) {
      if (this.canvasLayer) {
        this.canvasLayer.options.loadCellsWithBigPRB = newValue;
        this.canvasLayer._redraw();
      }
    }
  },
  
  methods: {
    buildBandKey(marker) {
      return [marker.nombre, marker.lat, marker.lng, marker.azimuth, marker.tecnologia, marker.banda].join('|');
    },
    buildBandHtml(marker) {
      return `
        <div>
          <ul style=list-style-type:none>
            <li><strong>Celda:</strong> ${marker.nombre}</li>
            <li><strong>Latitud:</strong> ${marker.lat}</li>
            <li><strong>Longitud:</strong> ${marker.lng}</li>
            <li><strong>Banda:</strong> ${marker.banda}</li>
            <li><strong>Tecnología:</strong> ${marker.tecnologia}</li>
            <li><strong>Azimut:</strong> ${marker.azimuth}</li>
            <li><strong>Solución:</strong> ${marker.solution}</li>
            <li><strong>LOAD:</strong> ${marker.load}</li>
            <li><strong>Desbalanceo:</strong> ${marker.desbalanceo}</li>
            <li><strong>PRB:</strong> ${marker.prb}</li>
          </ul>
        </div>`;
    },
    showTooltip(marker, ev) {
      // No mostrar tooltip si el popup de este mismo elemento está activo
      const key = this.buildBandKey(marker);
      if (this.activePopupKey && this.activePopupKey === key) return;
      const html = this.buildBandHtml(marker);
      this.$refs.tooltipRef?.show(html, ev);
    },
    openPopupForBand(marker) {
      if (!this.mapInstance) return;
      const html = this.buildBandHtml(marker);
      // Guardar clave del elemento cuyo popup está activo
      this.activePopupKey = this.buildBandKey(marker);
      const popup = this.$refs.tooltipRef?.openPopupAt([marker.lat, marker.lng], this.mapInstance, html);
      // Limpiar clave sólo cuando este popup específico se cierra
      if (popup && popup.once) {
        popup.once('remove', () => {
          this.activePopupKey = null;
        });
      }
    },
    hideTooltip() {
      // Siempre ocultar el tooltip al salir, incluso si hay un popup activo
      this.$refs.tooltipRef?.hide();
    },
    async initialize() {
      // Solo inicializamos una vez
      if (this.isInitialized || !process.client) return;
      
      // Verificamos que tengamos todo lo necesario
      if (!window.L || !this.mapInstance) {
        setTimeout(() => this.initialize(), 100);
        return;
      }
      
      try {    
        // Importamos y creamos la capa
        const { createBandsCanvasLayer } = await import('../methods/BandsCanvasLayer.js');
        const BandsCanvasLayerClass = createBandsCanvasLayer();
        
        if (!BandsCanvasLayerClass) {
          console.error('[SimpleCanvas] Error creando la clase');
          return;
        }
        
        // Creamos la instancia
        this.canvasLayer = new BandsCanvasLayerClass({
          loadCellsWithBigPRB: this.loadCellsWithBigPRB
        });
        
        // Eventos
        this.canvasLayer.on('bandover', (e) => {
          if (this.$refs.tooltipRef) {
            this.showTooltip(e.band, e.originalEvent);
          }
        });
        this.canvasLayer.on('bandclick', (e) => {
          this.openPopupForBand(e.band);
        });
        
        this.canvasLayer.on('bandout', () => {
          if (this.$refs.tooltipRef) {
            this.hideTooltip();
          }
        });
        
        // Agregamos al mapa
        this.mapInstance.addLayer(this.canvasLayer);
        
        // Establecemos los marcadores iniciales
        if (this.markers.length > 0) {
          this.canvasLayer.setBands(this.markers);
        }
        
        this.isInitialized = true;
        
      } catch (error) {
        console.error('[SimpleCanvas] Error:', error);
      }
    },
    
    removeLayer() {
      // Elimina la capa y reinicia flags para permitir futura re-creación
      if (this.canvasLayer && this.mapInstance && this.mapInstance.hasLayer(this.canvasLayer)) {
        this.mapInstance.removeLayer(this.canvasLayer);
      }
      // Limpieza de referencias y flags
      this.canvasLayer = null;
      this.isInitialized = false;
    }
  },
  
  beforeDestroy() {
    this.removeLayer();
    this.canvasLayer = null;
  }
};
</script>