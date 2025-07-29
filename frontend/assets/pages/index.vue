<template>
  <div class="full-screen-container">
    <Map />
  </div>
</template>

<script>
import Map from '~/components/Map.vue';

export default {
  name: 'IndexPage',
  components: {
    Map,
  },
}
</script>

<style src="~/assets/styles/main.css"></style>