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
          <BandsMarkers
            :markers="bandsMarkers"
            :zoom="zoom"
            :loadCellsWithBigPRB="loadCellsWithBigPRB"
          />
          <PreOriginMarkers :markers="preOriginMarkers" :zoom="zoom" />
          <RFPlansMarkers :markers="rfPlansMarkers" :zoom="zoom" />
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
      :filterForRSRP="filterForRSRP"
      :filterForSolution="filterForSolution"
      :filterForTechnology="filterForTechnology"
      :filterForRFPlans="filterForRFPlans"
      :filterForPreOrigin="filterForPreOrigin"
      :mapType="mapType"
      :urls="urls"
      :loadCellsWithBigPRB="loadCellsWithBigPRB"
      @toggleBigPRB="loadCellsWithBigPRB = $event"
      @updateFilterForSolution="updateFilterForSolution"
      @updateFilterForTechnology="updateFilterForTechnology"
      @updateFilterForRSRP="updateFilterForRSRP"
      @updateMapType="updateMapType"
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
import BandsMarkers from './markers/BandsMarkers.vue';
import RFPlansMarkers from './markers/RFPlansMarkers.vue';
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
    BandsMarkers,
    RFPlansMarkers,
    PreOriginMarkers,
    FilterBox,
    KMZLegends
  },
  data() {
    return {
      ...DEFAULT_CONFIG,
      previousZoom: null,
      groundOverlays: [],
      filterForRSRP: {
        'LTE RSRP MEDI.kmz': false,
        'LTE RSRQ MEDI.kmz': false,
        'LTE Avg_TH_DL MEDI.kmz': false
      }
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
      return Object.entries(this.filterForRSRP).some(
        ([key, value]) => key.toUpperCase().includes('RSRP') && !key.toUpperCase().includes('RSRQ') && value
      );
    },
    isAnyRSRQFilterActive() {
      return Object.entries(this.filterForRSRP).some(
        ([key, value]) => key.toUpperCase().includes('RSRQ') && value
      );
    },
    isAnyTRPFilterActive() {
      return Object.entries(this.filterForRSRP).some(
        ([key, value]) => key.toUpperCase().includes('AVG_TH_DL') && value
      );
    }
  },
  methods: {
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
    updateFilterForRSRP(newFilterForRSRP) {
      this.filterForRSRP = newFilterForRSRP;
      this.updateKMZLayer(); // <- Asegura actualización de la capa aunque el zoom no cambie
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
        const markers = await this.fetchRFPlansMarkers(newVal);
        this.rfPlansMarkers = markers;
      },
      deep: true
    },
    filterForRSRP: {
      handler() {
        this.updateKMZLayer();
      },
      deep: true
    },
    zoom(newZoom) {
      this.updateKMZLayer();
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
  }
};
</script>

<style scoped>
</style>
