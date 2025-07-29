<template>
  <div>
    <div v-if="isAnyRSRPFilterActive" class="bottom-left-container rsrp">
      <p>RSRP</p>
      <div class="legend">
        <div class="legend-item" v-for="(range, color) in rsrpLegend" :key="color">
          <div class="color-box" :style="{ backgroundColor: color }"></div>
          <span>{{ range }}</span>
        </div>
      </div>
    </div>

    <div v-if="isAnyRSRQFilterActive" class="bottom-left-container rsrq">
      <p>RSRQ</p>
      <div class="legend">
        <div class="legend-item" v-for="(range, color) in rsrqLegend" :key="color">
          <div class="color-box" :style="{ backgroundColor: color }"></div>
          <span>{{ range }}</span>
        </div>
      </div>
    </div>

    <div v-if="isAnyTRPFilterActive" class="bottom-left-container trp">
      <p>Throughput (DL)</p>
      <div class="legend">
        <div class="legend-item" v-for="(range, color) in trpLegend" :key="color">
          <div class="color-box" :style="{ backgroundColor: color }"></div>
          <span>{{ range }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "KMZLegends",
  props: {
    isAnyRSRPFilterActive: Boolean,
    isAnyRSRQFilterActive: Boolean,
    isAnyTRPFilterActive: Boolean
  },
  data() {
    return {
      rsrpLegend: {
        '#000000': "-150 to -118",
        '#e60000': "-118 to -114",
        '#ffe766': "-114 to -105",
        '#8797f1': "-105 to -90",
        '#6ff7f0': "-90 to -85",
        '#89e59a': "-85 to 0"
      },
      rsrqLegend: {
        '#000000': "-30 to -17",
        '#e60000': "-17 to -15",
        '#ffe766': "-15 to -12",
        '#8797f1': "-12 to -8",
        '#89e59a': "-8 to 0"
      },
      trpLegend: {
        '#000000': "0 to 1 Mbps",
        '#e60000': "1 to 3 Mbps",
        '#ffe766': "3 to 5 Mbps",
        '#8797f1': "5 to 10 Mbps",
        '#6ff7f0': "10 to 20 Mbps",
        '#89e59a': "20+ Mbps"
      }
    };
  }
};
</script>

<style scoped>
.bottom-left-container {
  position: absolute;
  bottom: 10px;
  left: 50px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 5px;
  z-index: 1000;
  margin-bottom: 10px;
  font-size: 13px;
}

.legend {
  display: flex;
  flex-direction: column;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.color-box {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  border: 1px solid #000;
}
</style>
