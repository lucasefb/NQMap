<template>
  <div class="corpo-vip-filter">
    <FilterItem :checked="safeValue.CORPO" @update="toggle('CORPO', $event)">CORPO</FilterItem>
    <FilterItem :checked="safeValue.VIP" @update="toggle('VIP', $event)">VIP</FilterItem>

  </div>
</template>


<script>
import FilterItem from './FilterItem.vue';

export default {
  name: 'CorpoVipFilterBox',
  components: { FilterItem },
  props: {
    value: { type: Object, required: false, default: () => ({ CORPO: false, VIP: false }) }
  },
  computed: {
    safeValue() {
      return {
        CORPO: this.value && typeof this.value.CORPO === 'boolean' ? this.value.CORPO : false,
        VIP: this.value && typeof this.value.VIP === 'boolean' ? this.value.VIP : false
      }
    }
  },
  methods: {
    toggle (key, checked) {
      this.$emit('input', { ...this.value, [key]: checked });
    }
  }
};
</script>

<style scoped>
.corpo-vip-filter {
  display: flex;
  flex-direction: column;
}
</style>
