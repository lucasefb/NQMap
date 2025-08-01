<template>
  <div class="main-container">
    <div class="map-container">
      <Header :mapInstance="mapInstance" @updateMarkerForLatitudLongitudSearch="updateMarkerForLatitudLongitudSearch" />
      <client-only>
        <l-map ref="map" style="height: 100%; width: 100%;" :zoom="zoom" :center="center" @ready="onMapReady">
          <l-tile-layer :url="url" :attribution="attribution" />
          <SitesCanvasMarkers v-if="mapInstance" :markersForAllCells="markersForAllCells" :mapInstance="mapInstance" :zoom="zoom" />
          <BandsCanvasMarkers :mapInstance="mapInstance" :markers="bandsMarkers" :zoom="zoom"
            :loadCellsWithBigPRB="loadCellsWithBigPRB" />
          <PreOriginCanvasMarkers :mapInstance="mapInstance" :markers="preOriginMarkers" :zoom="zoom" />
          <RFPlansCanvasMarkers :mapInstance="mapInstance" :markers="rfPlansMarkers" :zoom="zoom" />
          <ReclamosMarkers :markers="reclamosMarkers" :zoom="zoom" />
          <div v-if="reclamosMarkers && reclamosMarkers.length === 0 && (corpoVipFilter.CORPO || corpoVipFilter.VIP)"
            class="no-markers-msg">
            <span
              style="color: red; background: #fff; padding: 4px 8px; border-radius: 4px; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 9999;">
              No hay reclamos visibles para el filtro y zona actual
            </span>
          </div>
          <LatLngMarker :marker="markerForLatitudLongitudSearch" />
        </l-map>
      </client-only>

      <KMZLegends :isAnyRSRPFilterActive="isAnyRSRPFilterActive" :isAnyRSRQFilterActive="isAnyRSRQFilterActive"
        :isAnyTRPFilterActive="isAnyTRPFilterActive" />

      <LoadingSpinner :isLoading="isLoading" />
    </div>

    <FilterBox :filterByCoverageLTE="filterByCoverageLTE" :filterForSolution="filterForSolution"
      :filterForTechnology="filterForTechnology" :filterForRFPlans="filterForRFPlans"
      :filterForPreOrigin="filterForPreOrigin" :mapType="mapType" :corpoVipFilter="corpoVipFilter" :urls="urls"
      :loadCellsWithBigPRB="loadCellsWithBigPRB" @toggleBigPRB="loadCellsWithBigPRB = $event"
      @updateFilterForSolution="updateFilterForSolution" @updateFilterForTechnology="updateFilterForTechnology"
      @updatefilterByCoverageLTE="updatefilterByCoverageLTE" @updateMapType="updateMapType"
      @input="corpoVipFilter = $event" />
  </div>
</template>

<script>
import { DEFAULT_CONFIG } from '~/config/mapConfig';
import debounce from 'lodash/debounce';
import 'leaflet/dist/leaflet.css';

import Header from './Header.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import LatLngMarker from './markers/LatLngMarker.vue';
import SitesCanvasMarkers from './markers/SitesCanvasMarkers.vue';
import BandsCanvasMarkers from './markers/BandsCanvasMarkers.vue';
import RFPlansCanvasMarkers from './markers/RFPlansCanvasMarkers.vue';
import ReclamosMarkers from './markers/ReclamosMarkers.vue';
import PreOriginCanvasMarkers from './markers/PreOriginCanvasMarkers.vue';

import FilterBox from './filterBox/FilterBox.vue';
import KMZLegends from './filterBox/KMZLegends.vue';

import CoverageMethods from './methods/CoverageMethods';
import FetchMarkers from './methods/FetchMarkers';
import OnMapReady from './methods/OnMapReady';

export default {
  components: {
    Header,
    LoadingSpinner,
    LatLngMarker,
    SitesCanvasMarkers,
    BandsCanvasMarkers,
    RFPlansCanvasMarkers,
    PreOriginCanvasMarkers,
    FilterBox,
    KMZLegends,
    ReclamosMarkers
  },
  data() {
    return { ...DEFAULT_CONFIG };
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
    ...FetchMarkers,
    ...OnMapReady,
    ...CoverageMethods,
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
      this.filterByCoverageLTE = newfilterByCoverageLTE;
      this.updateCoverageLayer(); // <- Asegura actualización de la capa aunque el zoom no cambie
      this.debouncedFetchReclamos();
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
          this.updateCoverageLayer();
        },
        deep: true
      },
    zoom(newZoom) {
      this.updateCoverageLayer();
      this.debouncedFetchReclamos();
    },
    corpoVipFilter: {
      handler() {
        this.debouncedFetchReclamos();
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
    // Cargar overlays de cobertura 4G una vez
    this.loadCoverageOverlays();
    this.debouncedFetchMarkers = debounce(this.fetchMarkers, 300);
    this.debouncedFetchBandsMarkers = debounce(this.fetchBandsMarkers, 300);
    this.debouncedFetchPreOriginMarkers = debounce(this.fetchPreOriginMarkers, 300);
    this.debouncedFetchReclamos = debounce(this.fetchReclamos, 300);
    this.debouncedFetchReclamos();
  }
}

</script>

<style scoped></style>