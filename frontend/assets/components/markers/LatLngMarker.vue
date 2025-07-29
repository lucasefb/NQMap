<template>
  <l-marker v-if="hasCoordinates" :lat-lng="latLng" :icon="iconForLatitudLongitudSearcher()"></l-marker>
</template>

<script>
export default {
  props: {
    marker: {
      type: Object,
      required: true,
    }
  },
  computed: {
    hasCoordinates() {
      return typeof this.marker.lat === 'number' && typeof this.marker.lng === 'number';
    },
    latLng() {
      return [this.marker.lat, this.marker.lng];
    }
  },
  methods: {
    iconForLatitudLongitudSearcher() {
      const createIcon = () => {

        if (L) {
          return L.divIcon({
            html: `<div style="
                    width: 15px;
                    height: 15px;
                    background-color: red;
                    border-radius: 50%;
                ">
                </div>`,
            className: 'custom-icon-class'
          });
        } else {
          console.error('Leaflet is not available!');
          return null;
        }
      }
      return createIcon()
    }
  }
};
</script>
