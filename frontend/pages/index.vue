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
  mounted() {
    console.log('[INDEX PAGE] Este log DEBE aparecer en consola si el build es correcto');
  }
}
</script>

<style src="~/assets/styles/main.css"></style>