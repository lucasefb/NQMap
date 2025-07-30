<template>
  <div class="main-container">
    <div class="map-container">
      <Header
        :mapInstance="mapInstance"
        @updateMarkerForLatitudLongitudSearch="updateMarkerForLatitudLongitudSearch"
      />
      <client-only>
        <l-map
          ref="map"
          style="height: 100%; width: 100%;"
          :zoom="zoom"
          :center="center"
          @ready="onMapReady"
        >
          <l-tile-layer :url="url" :attribution="attribution" />
          <SitesMarkers
            v-if="mapInstance"
            :markersForAllCells="markersForAllCells"
            :mapInstance="mapInstance"
            :zoom="zoom"
          />
          <BandsCanvasMarkers :mapInstance="mapInstance"
            :markers="bandsMarkers"
            :zoom="zoom"
            :loadCellsWithBigPRB="loadCellsWithBigPRB"
          />
          <PreOriginMarkers :markers="preOriginMarkers" :zoom="zoom" />
          <RFPlansMarkers :markers="rfPlansMarkers" :zoom="zoom" />
          <!-- Reclamos markers -->
          <ReclamosMarkers :markers="reclamosMarkers" :zoom="zoom" />
          <div v-if="reclamosMarkers && reclamosMarkers.length === 0 && (corpoVipFilter.CORPO || corpoVipFilter.VIP)" class="no-markers-msg">
            <span style="color: red; background: #fff; padding: 4px 8px; border-radius: 4px; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 9999;">
              No hay reclamos visibles para el filtro y zona actual
            </span>
          </div>
          <LatLngMarker :marker="markerForLatitudLongitudSearch" />
        </l-map>
      </client-only>

      <KMZLegends
        :isAnyRSRPFilterActive="isAnyRSRPFilterActive"
        :isAnyRSRQFilterActive="isAnyRSRQFilterActive"
        :isAnyTRPFilterActive="isAnyTRPFilterActive"
      />

      <LoadingSpinner :isLoading="isLoading" />
    </div>

    <FilterBox
      :filterByCoverageLTE="filterByCoverageLTE"
      :filterForSolution="filterForSolution"
      :filterForTechnology="filterForTechnology"
      :filterForRFPlans="filterForRFPlans"
      :filterForPreOrigin="filterForPreOrigin"
      :mapType="mapType"
      :corpoVipFilter="corpoVipFilter"
      :urls="urls"
      :loadCellsWithBigPRB="loadCellsWithBigPRB"
      @toggleBigPRB="loadCellsWithBigPRB = $event"
      @updateFilterForSolution="updateFilterForSolution"
      @updateFilterForTechnology="updateFilterForTechnology"
      @updatefilterByCoverageLTE="updatefilterByCoverageLTE"
      @updateMapType="updateMapType"
      @input="corpoVipFilter = $event"
    />
  </div>
</template>

<script>
import { DEFAULT_CONFIG } from '~/config/mapConfig';
import debounce from 'lodash/debounce';
import 'leaflet/dist/leaflet.css';

import Header from './Header.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import LatLngMarker from './markers/LatLngMarker.vue';
import SitesMarkers from './markers/SitesMarkers.vue';
import BandsCanvasMarkers from './markers/BandsCanvasMarkers.vue';
import RFPlansMarkers from './markers/RFPlansMarkers.vue';
import ReclamosMarkers from './markers/ReclamosMarkers.vue';
import axios from 'axios';
import PreOriginMarkers from './markers/PreOriginMarkers.vue';
import FilterBox from './filterBox/FilterBox.vue';
import KMZLegends from './filterBox/KMZLegends.vue';

import KMZMethods from './methods/KMZMethods';
import FetchMarkers from './methods/FetchMarkers';
import OnMapReady from './methods/OnMapReady';

export default {
  components: {
    Header,
    LoadingSpinner,
    LatLngMarker,
    SitesMarkers,
    BandsCanvasMarkers,
    RFPlansMarkers,
    PreOriginMarkers,
    FilterBox,
    KMZLegends,
    ReclamosMarkers
  },
  data() {
    return {
      ...DEFAULT_CONFIG,
      center: [-38, -63],
      zoom: 4,
      reclamosMarkers: [],
      reclamosAll: [],
      previousZoom: null,
      groundOverlays: [],

      corpoVipFilter: {
        CORPO: false,
        VIP: false
      },
      // Controla si se resaltan sitios con alta carga PRB en bandas 4G
      loadCellsWithBigPRB: false
    };
  },
  computed: {
    url() {
      return this.urls[this.mapType];
    },
    filtersCombined() {
      return {
        solution: this.filterForSolution,
        technology: this.filterForTechnology
      };
    },
    isAnyRSRPFilterActive() {
      return Object.entries(this.filterByCoverageLTE).some(
        ([key, value]) => key.toUpperCase().includes('RSRP') && !key.toUpperCase().includes('RSRQ') && value
      );
    },
    isAnyRSRQFilterActive() {
      return Object.entries(this.filterByCoverageLTE).some(
        ([key, value]) => key.toUpperCase().includes('RSRQ') && value
      );
    },
    isAnyTRPFilterActive() {
      return Object.entries(this.filterByCoverageLTE).some(
        ([key, value]) => key.toUpperCase().includes('AVG_TH_DL') && value
      );
    }
  },
  methods: {
    async fetchReclamosClusters() {
      // Solo pedir reclamos si CORPO o VIP está activo
      const { CORPO, VIP } = this.corpoVipFilter || {};
      if (!CORPO && !VIP) {
        this.reclamosAll = [];
        this.reclamosMarkers = [];
        return;
      }
      // Esperar a que el mapa esté listo
      if (!this.mapInstance) {
        this.reclamosAll = [];
        this.reclamosMarkers = [];
        return;
      }
      const bounds = this.mapInstance.getBounds();
      const zoom = this.mapInstance.getZoom();
      const tipos = [];
      if (CORPO) tipos.push('CORPO');
      if (VIP) tipos.push('VIP');
      try {
        const res = await this.$axios.$get('/api/reclamosByBounds', {
          params: {
            neLat: bounds.getNorthEast().lat,
            neLng: bounds.getNorthEast().lng,
            swLat: bounds.getSouthWest().lat,
            swLng: bounds.getSouthWest().lng,
            zoom,
            tipos: tipos.join(',')
          }
        });
        this.reclamosAll = Array.isArray(res) ? res : [];
        this.filterReclamos();
      } catch (err) {
        this.reclamosAll = [];
        this.reclamosMarkers = [];
        console.error('Error fetching reclamos clusters', err);
      }
    },
    filterReclamos: debounce(function() {
      // Usar la respuesta de reclamosAll que ahora puede contener clusters o puntos individuales
      if (!this.reclamosAll || !Array.isArray(this.reclamosAll)) {
        this.reclamosMarkers = [];
        return;
      }
      // Si el zoom es >= 14, mostrar puntos individuales; si es < 14, mostrar clusters
      const zoom = this.mapInstance ? this.mapInstance.getZoom() : this.zoom;
      // Filtrar y adaptar los clusters/puntos según tipo y zoom
      const markers = [];
      for (const feature of this.reclamosAll) {
        if (feature.type !== 'Feature' || !feature.geometry) continue;
        const coords = feature.geometry.coordinates;
        if (feature.properties.cluster) {
          // Es un cluster (más de un punto)
          markers.push({
            lat: coords[1],
            lng: coords[0],
            isCluster: true,
            point_count: feature.properties.point_count,
            ...feature.properties
          });
        } else {
          // Punto individual
          markers.push({
            lat: coords[1],
            lng: coords[0],
            ...feature.properties
          });
        }
      }
      this.reclamosMarkers = markers;
    }, 100), // Debounce 100ms para evitar recálculos excesivos

    ...FetchMarkers,
    ...OnMapReady,
    ...KMZMethods,
    updateMarkerForLatitudLongitudSearch(newMarker) {
      this.markerForLatitudLongitudSearch = newMarker;
    },
    updateMapType(newMapType) {
      this.mapType = newMapType;
    },
    updateFilterForSolution(newFilterForSolution) {
      this.filterForSolution = newFilterForSolution;
    },
    updateFilterForPreOrigin(newFilterForPreOrigin) {
      this.filterForPreOrigin = newFilterForPreOrigin;
    },
    updateFilterForRFPlans(newFilterForRFPlans) {
      this.filterForRFPlans = newFilterForRFPlans;
    },
    updateFilterForTechnology(newFilterForTechnology) {
      this.filterForTechnology = newFilterForTechnology;
    },
    updatefilterByCoverageLTE(newfilterByCoverageLTE) {
  console.log('[padre recibe]', newfilterByCoverageLTE);
      this.filterByCoverageLTE = newfilterByCoverageLTE;
      this.updateKMZLayer(); // <- Asegura actualización de la capa aunque el zoom no cambie
      this.filterReclamos();
    }
  },
  watch: {
    filtersCombined: {
      handler() {
        if (!this.mapInstance) return;
        this.debouncedFetchMarkers();
        this.debouncedFetchBandsMarkers();
      },
      deep: true
    },
    filterForPreOrigin: {
      handler() {
        this.debouncedFetchPreOriginMarkers();
      },
      deep: true
    },
    filterForRFPlans: {
      async handler(newVal) {
        const allFalse = Object.values(newVal).every(v => v === false);
        if (allFalse) {
          this.rfPlansMarkers = [];
          return;
        }
        const markers = await this.fetchRFPlansMarkers(newVal);
        this.rfPlansMarkers = markers;
      },
      deep: true
    },
    filterByCoverageLTE: {
      handler() {
        this.updateKMZLayer();
      },
      deep: true
    },
    zoom(newZoom) {
      this.fetchReclamosClusters();
      this.updateKMZLayer();
    },
    corpoVipFilter: {
      handler() {
        this.fetchReclamosClusters();
      },
      deep: true
    },
    loadCellsWithBigPRB(newVal) {
      if (!newVal) {
        this.bandsMarkers = [];
      }
      this.debouncedFetchBandsMarkers();
    }
  },
  created() {
    this.debouncedFetchMarkers = debounce(this.fetchMarkers, 300);
    this.debouncedFetchBandsMarkers = debounce(this.fetchBandsMarkers, 300);
    this.debouncedFetchPreOriginMarkers = debounce(this.fetchPreOriginMarkers, 300);

    // Fetch reclamos agrupados dinámicamente según bounds y zoom
    this.fetchReclamosClusters();
    this.debouncedFetchMarkers = debounce(this.fetchMarkers, 300);
    this.debouncedFetchBandsMarkers = debounce(this.fetchBandsMarkers, 300);
    this.debouncedFetchPreOriginMarkers = debounce(this.fetchPreOriginMarkers, 300);
  }
}
</script>

<style scoped>
</style>
