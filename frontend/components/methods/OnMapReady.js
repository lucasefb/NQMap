export default {
  onMapReady(map) {
    this.mapInstance = map;
    this._lastCenter = map.getCenter();

    const rulerControl = L.control.ruler({
      position: 'bottomleft',
      circleMarker: { color: 'red', radius: 2 },
      lineStyle: { color: 'red', dashArray: '1,6' },
      lengthUnit: { display: 'Km', decimal: 2 }
    });

    rulerControl.addTo(this.mapInstance);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && rulerControl._measuring) {
        rulerControl._measuring = false;
        rulerControl.disable();
      }
    });

    // Crear capa coverage si ya tenemos overlays descargados
    if (typeof this._createCoverageLayerIfPossible === 'function') {
      this._createCoverageLayerIfPossible();
    }

    this.mapInstance.on('moveend', async () => {
      const newCenter = this.mapInstance.getCenter();
      if (!newCenter.equals(this._lastCenter)) {
        await this.fetchMarkers();
        await this.fetchBandsMarkers();
        // Solo llamar fetchPreOriginMarkers si hay filtros activos
        const hasActivePreOriginFilters = Object.values(this.filterForPreOrigin || {}).some(v => v === true);
        if (hasActivePreOriginFilters) {
          const markers = await this.fetchPreOriginMarkers(this.filterForPreOrigin);
          this.preOriginMarkers = markers;
        }
        // Solo llamar fetchRFPlansMarkers si hay filtros activos
        const hasActiveRFPlanFilters = Object.values(this.filterForRFPlans || {}).some(v => v === true);
        if (hasActiveRFPlanFilters) {
          const markers = await this.fetchRFPlansMarkers(this.filterForRFPlans);
          this.rfPlansMarkers = markers;
        }
        await this.loadCoverageOverlays();
      }
    });
  },
};
