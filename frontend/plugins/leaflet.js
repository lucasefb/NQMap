// plugins/leaflet.js
import Vue from 'vue';
import { LMap, LTileLayer, LMarker, LPopup } from 'vue2-leaflet';
import LMarkerCluster from 'vue2-leaflet-markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet-kml';
import 'leaflet-ruler'
import 'leaflet-ruler/src/leaflet-ruler.css';

// Register Vue2-Leaflet components globally
Vue.component('LMap', LMap);
Vue.component('LTileLayer', LTileLayer);
Vue.component('LMarker', LMarker);
Vue.component('LPopup', LPopup);
Vue.component('l-marker-cluster', LMarkerCluster);

// Set default icon paths for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png'
});

Vue.prototype.$leaflet = L;

console.log('Leaflet version:', L.version);