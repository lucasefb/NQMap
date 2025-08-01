const BASE = process.env.APP_ENV === 'prod' ? process.env.API_BASE_URL_PROD : process.env.API_BASE_URL_LOCAL;
const API_BASE_URL = BASE || '';

import { createCoverageCanvasLayer } from './CoverageCanvasLayer.js';

export default {
  async loadCoverageOverlays() {
    
    // Descarga la lista de overlays una sola vez
    if (this.coverageOverlays && this.coverageOverlays.length) return;
    try {
      const res = await this.$axios.get(`${API_BASE_URL}/api/coverage4g`);
      
      this.coverageOverlays = res.data;
      if (this.coverageOverlays.length === 0) {
        
        setTimeout(() => {
          // limpiar para que vuelva a llamar
          this.coverageOverlays = null;
          this.loadCoverageOverlays();
        }, 3000);
        return;
      }
      
      // Intentar crear la capa si el mapa ya está listo
      this._createCoverageLayerIfPossible();
    } catch (e) {
      console.error('Error cargando coverage4g:', e);
    }
  },

  _createCoverageLayerIfPossible() {
    
    if (!this.mapInstance || !this.coverageOverlays || this.coverageOverlays.length === 0) return;
    if (!this.coverageLayer) {
      
      const CoverageLayerClass = createCoverageCanvasLayer();
      if (!CoverageLayerClass) return;
      this.coverageLayer = new CoverageLayerClass();
      this.coverageLayer.addTo(this.mapInstance);
      this.coverageLayer.setOverlays(this.coverageOverlays);
    }
    // Ajustar keys activas cada vez que se cree o cambien filtros
    this._setActiveKeys();
  },

  _setActiveKeys() {
    const before = this._activeKeysCount || 0;
    if (!this.coverageLayer) return;
    const activeKeys = Object.entries(this.filterByCoverageLTE || {})
      .filter(([k, v]) => v)
      .map(([k]) => k);
    
    this.coverageLayer.setActiveKeys(activeKeys);
    this._activeKeysCount = activeKeys.length;
    
  },

  updateCoverageLayer() {
    // Intenta crear la capa si aún no existe
    this._createCoverageLayerIfPossible();
    // Si ya existe, sólo actualiza las keys
    this._setActiveKeys();
  }
};
