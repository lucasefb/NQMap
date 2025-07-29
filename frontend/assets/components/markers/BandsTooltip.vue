<template>
    <div
      id="custom-tooltip"
      v-show="visible"
      v-html="tooltipContent"
      class="bands-tooltip"
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
          <div>
            <h2>${marker.nombre}</h2>
            <ul style="padding-left: 20px; list-style-type: none; margin: 0;">
              <li><strong>Latitud:</strong> ${marker.lat}</li>
              <li><strong>Longitud:</strong> ${marker.lng}</li>
              <li><strong>Banda:</strong> ${marker.banda}</li>
              <li><strong>Tecnología:</strong> ${marker.tecnologia}</li>
              <li><strong>Azimut:</strong> ${marker.azimuth}</li>
              <li><strong>Solución:</strong> ${marker.solution}</li>
              <li><strong>LOAD:</strong> ${marker.load}</li>
              <li><strong>Desbalanceo:</strong> ${marker.desbalanceo}</li>
              <li><strong>PRB:</strong> ${marker.prb}</li>
            </ul>
          </div>`;
        this.visible = true;
        document.addEventListener('mousemove', this.updateTooltipPosition);
      },
      hideTooltip() {
        this.visible = false;
        document.removeEventListener('mousemove', this.updateTooltipPosition);
      },
      updateTooltipPosition(event) {
        const tooltip = document.getElementById('custom-tooltip');
        if (tooltip) {
          tooltip.style.left = `${event.pageX + 10}px`;
          tooltip.style.top = `${event.pageY + 10}px`;
        }
      },
    },
  };
  </script>
  
  <style scoped>
  .bands-tooltip {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    padding: 8px;
    border-radius: 6px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    z-index: 9999;
    max-width: 300px;
  }

  .custom-tooltip {
  background-color: white;
  color: black;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.15);
}
  </style>
  