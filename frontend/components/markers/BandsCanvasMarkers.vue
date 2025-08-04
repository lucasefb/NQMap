<template>
  <div>
    <BandsTooltip ref="tooltipRef" />
  </div>
</template>

<script>
import BandsTooltip from './BandsTooltip.vue';

// Versión simplificada que evita problemas de timing
export default {
  name: 'BandsSimpleCanvas',
  components: {
    BandsTooltip,
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
      isInitialized: false
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
            this.$refs.tooltipRef.showTooltip(e.band);
          }
        });
        
        this.canvasLayer.on('bandout', () => {
          if (this.$refs.tooltipRef) {
            this.$refs.tooltipRef.hideTooltip();
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