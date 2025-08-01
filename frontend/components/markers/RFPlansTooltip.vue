<template>
  <div
    id="rfplans-tooltip"
    v-show="visible"
    v-html="tooltipContent"
    class="rfplans-tooltip"
  ></div>
</template>

<script>
export default {
  data() {
    return {
      tooltipContent: '',
      visible: false,
    };
  },
  methods: {
    showTooltip(marker) {
      console.log('marker RFPlansTooltip:', marker);
      this.tooltipContent = `
        <div class="rfplans-tooltip-inner">
          <div><b>Tipo:</b> ${marker.nombre || ''}</div>
          <div><b>Latitud:</b> ${marker.lat || ''}</div>
          <div><b>Longitud:</b> ${marker.lng || ''}</div>
          <div><b>Estado del Plan:</b> ${marker.fecha || ''}</div>
        </div>`;
      this.visible = true;
      document.addEventListener('mousemove', this.updateTooltipPosition);
    },
    hideTooltip() {
      this.visible = false;
      document.removeEventListener('mousemove', this.updateTooltipPosition);
    },
    updateTooltipPosition(event) {
      const tooltip = document.getElementById('rfplans-tooltip');
      if (tooltip) {
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
      }
    },
  },
};
</script>

<style scoped>
.rfplans-tooltip {
  position: absolute;
  background: #fff;
  color: #222;
  border: 1px solid #bbb;
  padding: 10px 14px;
  border-radius: 7px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  pointer-events: none;
  z-index: 1000;
  max-width: 260px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  line-height: 1.4;
}
.rfplans-tooltip-inner {
  padding: 0;
}
.rfplans-tooltip-title {
  font-weight: bold;
  font-size: 16px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-size: 12px;
  z-index: 1000;
  pointer-events: none;
  max-width: 250px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.rfplans-tooltip h2 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: bold;
  color: black;
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: bold;
  color: #4CAF50;
}

.rfplans-tooltip ul {
  margin: 0;
  padding: 0;
}

.rfplans-tooltip li {
  margin: 3px 0;
  line-height: 1.3;
}

.rfplans-tooltip strong {
  color: black;
}
</style>
