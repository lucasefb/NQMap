<template>
  <div v-if="zoom >= 14">
    <l-marker v-for="(marker, index) in markers" :key="`${marker.nombre}`" :lat-lng="[marker.lat, marker.lng]"
      :icon="iconForAllCellBands(marker.azimuth, marker.banda, marker.tecnologia, marker.solution, marker.load)"
      @mouseover="showTooltip(marker)" @mouseout="hideTooltip" @mousedown="hideTooltip" />

    <BandsTooltip ref="tooltipRef" />
  </div>
</template>

<script>
import BandsTooltip from './BandsTooltip.vue';

export default {
  components: {
    BandsTooltip,
  },
  props: {
    markers: Array,
    zoom: Number,
    loadCellsWithBigPRB: Boolean
  },
  methods: {
    iconForAllCellBands(azimuth, banda, tecnologia, solution, load) {
      if (!L) {
        console.error('Leaflet is not available!');
        return null;
      }
      const scaleTotal = 0.7;
      const scaleFactor = (zoom) => {
        const minZoom = 12;
        const maxZoom = 18;
        const minSize = 0.1;
        const maxSize = 2;
        return Math.max(minSize, Math.min(maxSize, (zoom - minZoom) / (maxZoom - minZoom) * (maxSize - minSize) + minSize));
      };

      const createIcon = (size, color, size1, solution) => {
        const scaledSize = size * scaleFactor(this.zoom);
        const scaledSizeWicap = size1 * scaleFactor(this.zoom);
        const scaledBorder = 6 * scaleFactor(this.zoom);
        const smallCellSolutions = [
          'Small Cell',
          'DAS pasivo',
          'DAS Activo',
          'Airscale_indoor',
          'Femto',
          'Subte',
          'Estadios',
          'NBIoT',
        ];

        if (smallCellSolutions.includes(solution)) {
          const adjustedSize = scaledSize / 6;
          return L.divIcon({
            html: `<div style="
                width: ${adjustedSize}px; 
                height: ${adjustedSize}px; 
                border: ${scaledBorder}px solid violet; 
                border-radius: 50%;
                opacity: 0.4;
                background-color: transparent; 
                box-shadow: none; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                text-align: center;
                ">
                <span style="
                    color: ${color}; 
                    font-size: ${adjustedSize / 8}px; 
                    position: relative; 
                    top: 3px;">${solution}</span>
                </div>`,
            iconSize: [adjustedSize, adjustedSize],
            iconAnchor: [adjustedSize / 2, adjustedSize / 2],
            className: 'custom-icon-class'
          });
        } else if (solution === 'Wicap') {
          const scaledBorderWicap = scaledBorder / 2;
          return L.divIcon({
            html: `<div style="
                position: relative; 
                width: ${scaledSizeWicap}px; 
                height: ${scaledSizeWicap}px; 
                background-color: transparent;
                pointer-events: none;
                border-radius: ${scaledSizeWicap / 2}px ${scaledSizeWicap / 2}px 0 0; 
                clip-path: inset(0 19%);
                transform: rotate(${azimuth}deg);
            ">
                <div style="
                width: ${scaledSizeWicap}px; 
                height: ${scaledSizeWicap / 2}px;
                border: ${scaledBorderWicap}px solid ${color}; 
                border-bottom: none;
                border-radius: ${scaledSizeWicap / 2}px ${scaledSizeWicap / 2}px 0 0;
                clip-path: inset(0 0 50% 0 round ${scaledSizeWicap / 2}px ${scaledSizeWicap / 2}px 0 0);
                opacity: 0.4;
                box-shadow: none;
                pointer-events: auto;
                cursor: pointer;
                position: absolute;
                top: 0;
                left: 0;
                transition: opacity 0.3s;
                overflow: hidden;
                "
                onmouseover="this.style.opacity='0.9'; this.nextElementSibling.style.display='block';"
                onmouseout="this.style.opacity='0.4'; this.nextElementSibling.style.display='none';">
                </div>

                <div style="
                display: none;
                position: absolute; 
                top: -80px;
                left: 50%; 
                transform: translateX(-50%);
                background-color: white; 
                color: black; 
                padding: 15px;
                border-radius: 10px;
                box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.3);
                white-space: nowrap;
                font-size: 16px;
                pointer-events: none;
                max-width: 200px;
                text-align: center;
                ">
                Azimuth: ${azimuth}°
                </div>
            </div>`,
            iconAnchor: [scaledSizeWicap / 2, scaledSizeWicap / 2],
            className: 'custom-icon-class'
          });
        } else if (solution === 'QUATRA') {
          const adjustedSize = scaledSize / 2;

          return L.divIcon({
            html: `<div style="
                width: ${adjustedSize}px; 
                height: ${adjustedSize}px; 
                border: ${scaledBorder}px solid red; 
                border-radius: 50%;
                opacity: 0.4;
                background-color: transparent; 
                box-shadow: none; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                text-align: center;
                ">
                <span style="
                    color: blue; 
                    font-size: ${adjustedSize / 8}px; 
                    position: relative; 
                    top: 3px;">${solution}</span>
                </div>`,
            iconSize: [adjustedSize, adjustedSize],
            iconAnchor: [adjustedSize / 2, adjustedSize / 2],
            className: 'custom-icon-class'
          });
        } else if (solution === 'BDA') {
          const adjustedSize = scaledSize / 2;
          return L.divIcon({
            html: `<div style="
                width: ${adjustedSize}px; 
                height: ${adjustedSize}px; 
                border: ${scaledBorder}px solid red; 
                border-radius: 50%;
                opacity: 0.4;
                background-color: transparent; 
                box-shadow: none; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                text-align: center;
                ">
                <span style="
                    color: blue; 
                    font-size: ${adjustedSize / 8}px; 
                    position: relative; 
                    top: 3px;">${solution}</span>
                </div>`,
            iconSize: [adjustedSize, adjustedSize],
            iconAnchor: [adjustedSize / 2, adjustedSize / 2],
            className: 'custom-icon-class'
          });
        } else {
          return L.divIcon({
            html: `<div style="
                position: relative; 
                width: ${scaledSize}px; 
                height: ${scaledSize}px; 
                background-color: transparent;
                pointer-events: none;
                border-radius: ${scaledSize / 2}px ${scaledSize / 2}px 0 0; 
                clip-path: inset(0 19%);
                transform: rotate(${azimuth}deg);
            ">
        
                <div style="
                width: ${scaledSize}px; 
                height: ${scaledSize / 2}px;
                border: ${scaledBorder}px solid ${color}; 
                border-bottom: none;
                border-radius: ${scaledSize / 2}px ${scaledSize / 2}px 0 0;
                clip-path: inset(0 0 50% 0 round ${scaledSize / 2}px ${scaledSize / 2}px 0 0);
                opacity: 0.4;
                box-shadow: none;
                pointer-events: auto;
                cursor: pointer;
                position: absolute;
                top: 0;
                left: 0;
                transition: opacity 0.3s;
                overflow: hidden;
                "
                onmouseover="this.style.opacity='0.9'; this.nextElementSibling.style.display='block';"
                onmouseout="this.style.opacity='0.4'; this.nextElementSibling.style.display='none';">
                </div>

                <div style="
                display: none;
                position: absolute; 
                top: -80px;
                left: 50%; 
                transform: translateX(-50%);
                background-color: white; 
                color: black; 
                padding: 15px;
                border-radius: 10px;
                box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.3);
                white-space: nowrap;
                font-size: 16px;
                pointer-events: none;
                max-width: 200px;
                text-align: center;
                ">
                Azimuth: ${azimuth}°
                </div>
            </div>`,
            iconAnchor: [scaledSize / 2, scaledSize / 2],
            className: 'custom-icon-class'
          });
        }
      };

      const config = {
        'G    ': {
          'GSM 850': { size: 110 * scaleTotal, color: 'green' },
          'GSM 1900': { size: 120 * scaleTotal, color: 'green' }
        },
        'U    ': {
          'BANDA_850': { size: 130 * scaleTotal, color: '#FFD700', size1: 57 * scaleTotal },
          'BANDA_1900': { size: 140 * scaleTotal, color: '#FFD700', size1: 64 * scaleTotal }
        },
        'L    ': {
          '700': { size: 180 * scaleTotal, color: this.loadCellsWithBigPRB && load === 1 ? 'red' : 'DeepSkyBlue', size1: 72 * scaleTotal },
          '850': { size: 200 * scaleTotal, color: this.loadCellsWithBigPRB && load === 1 ? 'red' : 'DodgerBlue', size1: 79 * scaleTotal },
          '1900': { size: 220 * scaleTotal, color: this.loadCellsWithBigPRB && load === 1 ? 'red' : 'MediumBlue', size1: 86 * scaleTotal },
          '2100': { size: 240 * scaleTotal, color: this.loadCellsWithBigPRB && load === 1 ? 'red' : 'blue', size1: 93 * scaleTotal },
          '2600': { size: 260 * scaleTotal, color: this.loadCellsWithBigPRB && load === 1 ? 'red' : 'MidnightBlue', size1: 100 * scaleTotal }
        },
        'NR   ': {
          '3500': { size: 280 * scaleTotal, color: 'violet' },
          'N257': { size: 300 * scaleTotal, color: 'violet' }
        }
      };

      if (config[tecnologia] && config[tecnologia][banda]) {
        const { size, color, size1 } = config[tecnologia][banda];
        return createIcon(size, color, size1, solution);
      } else if (tecnologia === 'BDA  ') {
        return createIcon(75, '', 75, solution)
      }
      return null;
    },
    showTooltip(marker) {
      this.$refs.tooltipRef?.showTooltip(marker);
    },
    hideTooltip() {
      this.$refs.tooltipRef?.hideTooltip();
    }
  }
};
</script>
