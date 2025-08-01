export const DEFAULT_CONFIG = {
  previousZoom: null,
  mapInstance: null,
  zoom: 4,
  center: [-41.4168, -64.1836],
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  markers: [],
  markersForAllCells: [],
  bandsMarkers: [],
  preOriginMarkers: [],
  rfPlansMarkers: [],
  markerForLatitudLongitudSearch: { lat: null, lng: null },
  filterForRFPlans: {
    Expansiones_LTE: false,
    Expansiones_5G: false,
  },
  filterForPreOrigin: {
    Nuevo_Sitio: false,
    Nuevo_Anillo: false,
    Expansion_LTE: false,
    Expansion_NR: false,
    Nuevo_Sector: false,
    Expansion_Multiplexacion: false,
    Punto_de_Interes_Indoor: false,
  },
  filterForSolution: {
    Sitio_Micro: false,
    MACRO: false,
    Subte: false,
    Estadios: false,
    Small_Cell: false,
    QUATRA: false,
    DAS_pasivo: false,
    DAS_Activo: false,
    NBIoT: false,
    TECO_RanSharing: false,
    Wicap: false,
    Sitio_Bajo: false,
    MVS_RanSharing: false,
    Airscale_indoor: false,
    COW: false,
    BDA: false,
    Femto: false,
  },
  filterByCoverageLTE: {
    'LTE RSRP AMBA.kmz': false,
    'LTE RSRP BLAP.kmz': false,
    'LTE RSRP CUYO.kmz': false,
    'LTE RSRP LINO.kmz': false,
    'LTE RSRP LISU.kmz': false,
    'LTE RSRP MEDI.kmz': false,
    'LTE RSRP NOA.kmz': false,
    'LTE RSRP PAT1.kmz': false,
    'LTE RSRP PAT2.kmz': false,
    'LTE RSRP PY.kmz': false,
    'LTE RSRP UY.kmz': false,

    'LTE RSRQ AMBA.kmz': false,
    'LTE RSRQ BLAP.kmz': false,
    'LTE RSRQ CUYO.kmz': false,
    'LTE RSRQ LINO.kmz': false,
    'LTE RSRQ LISU.kmz': false,
    'LTE RSRQ MEDI.kmz': false,
    'LTE RSRQ NOA.kmz': false,
    'LTE RSRQ PAT1.kmz': false,
    'LTE RSRQ PAT2.kmz': false,
    'LTE RSRQ PY.kmz': false,
    'LTE RSRQ UY.kmz': false,

    'LTE  Avg_TH_DL AMBA.kmz': false,
    'LTE  Avg_TH_DL BLAP.kmz': false,
    'LTE  Avg_TH_DL CUYO.kmz': false,
    'LTE  Avg_TH_DL LINO.kmz': false,
    'LTE  Avg_TH_DL LISU.kmz': false,
    'LTE  Avg_TH_DL MEDI.kmz': false,
    'LTE  Avg_TH_DL NOA.kmz': false,
    'LTE  Avg_TH_DL PAT1.kmz': false,
    'LTE  Avg_TH_DL PAT2.kmz': false,
    'LTE  Avg_TH_DL PY.kmz': false,
    'LTE  Avg_TH_DL UY.kmz': false
  },
  showRFplans: false,
  showOrigin: false,
  showNitroGeo: false,
  showSolutions: false,
  showSites: false,
  showSite2G: false,
  showSite3G: false,
  showSite4G: false,
  showSite5G: false,
  showRSRPFilters: false,
  showRSRQFilters: false,
  allCellsStorage: [],
  CellsStorage4G: {
    banda2600: [],
    banda2100: [],
    banda1900: [],
    banda850: [],
    banda700: []
  },
  CellsStorage5G: {
    banda3500: [],
    bandaN257: []
  },
  filterForTechnology: {
    filter2G: {
      banda850: false,
      banda1900: false
    },
    filter3G: {
      banda850: false,
      banda1900: false
    },
    filter4G: {
      banda2600: false,
      banda2100: false,
      banda1900: false,
      banda700: false
    },
    filter5G: {
      banda3500: false,
      bandaN257: false
    },
  },
  mapType: 'carto',
  urls: {
    roadmap: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&style=feature:poi|element:all|visibility:off&style=feature:poi.park|element:geometry|visibility:off&style=feature:poi.medical|element:geometry|visibility:off',
    satellite: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    carto: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  },
  cellToShow: [],
  kmzLayer: null,
  changeOfStatusNitroGeo: false,
  groundOverlays: [],
  isLoading: false,
  loadCellsWithBigPRB: false,
  reclamosMarkers: [],
  reclamosAll: [],
  corpoVipFilter: {
    CORPO: false,
    VIP: false
  }
}
 