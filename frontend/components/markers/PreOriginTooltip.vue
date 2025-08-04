<template>
  <div
    id="preorigin-tooltip"
    v-show="visible"
    v-html="tooltipContent"
    class="preorigin-tooltip"
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
      this.tooltipContent = `
        <div class="preorigin-tooltip-inner">
          <div><b>Tipo:</b> ${marker.tipo || ''}</div>
          <div><b>Sitio:</b> ${marker.sitio || ''}</div>
          <div><b>Latitud:</b> ${marker.lat || ''}</div>
          <div><b>Longitud:</b> ${marker.lng || ''}</div>
          <div><b>Descripción:</b> ${marker.descripcion || ''}</div>
          <div><b>Fecha:</b> ${(() => {
  const f = marker.fecha ? marker.fecha.slice(0,10) : '';
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
})()}</div>
        </div>`;
      this.visible = true;
      document.addEventListener('mousemove', this.updateTooltipPosition);
    },
    hideTooltip() {
      this.visible = false;
      document.removeEventListener('mousemove', this.updateTooltipPosition);
    },
    updateTooltipPosition(event) {
      const tooltip = document.getElementById('preorigin-tooltip');
      if (tooltip) {
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
      }
    },
  },
};
</script>

<style scoped>
.preorigin-tooltip {
  max-width: 500px;


  white-space: normal;

  position: absolute;
  background: #fff;
  color: #222;
  border: 1px solid #bbb;
  padding: 10px 14px;
  border-radius: 7px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  pointer-events: none;
  z-index: 1000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  line-height: 1.4;
}
.preorigin-tooltip-inner {
  padding: 0;
}
</style>
