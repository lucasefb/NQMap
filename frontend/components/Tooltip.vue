<template>
  <div
    :class="['generic-tooltip', extraClass]"
    v-show="visible"
    ref="tooltipRoot"
  >
    <div class="tooltip-content">
      <div v-if="tooltipTitle" class="tooltip-title">{{ tooltipTitle }}</div>
      <slot v-if="$slots.default"></slot>
      <div v-else v-html="tooltipContent"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Tooltip',
  props: {
    extraClass: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      tooltipContent: '',
      visible: false,
      side: 'left',
      tooltipTitle: '',
      pinned: false,
    };
  },
  methods: {
    show(html, ev) {
      if (this.extraClass && this.extraClass.includes('rfplans-tooltip')) {
        this.side = 'right';
        this.tooltipTitle = 'RF Plans';
      } else if (this.extraClass && this.extraClass.includes('preorigin-tooltip')) {
        this.side = 'left';
        this.tooltipTitle = 'Pre-Origin';
      } else if (this.extraClass && this.extraClass.includes('bands-tooltip')) {
        this.side = 'center';
        this.tooltipTitle = 'Bandas';
      } else {
        if (!window.__tooltipSideToggle) window.__tooltipSideToggle = false;
        this.side = window.__tooltipSideToggle ? 'right' : 'left';
        window.__tooltipSideToggle = !window.__tooltipSideToggle;
        this.tooltipTitle = '';
      }

      if (html !== null) this.tooltipContent = html;
      this.visible = true;
      // Añadir clase al body para cambiar el cursor mientras el tooltip esté visible
      document.body.classList.add('cursor-tooltip');
      document.addEventListener('mousemove', this.updatePosition);
      if (ev) this.updatePosition(ev);
    },
    hide() {
      this.visible = false;
      // Quitar la clase del body cuando el tooltip se oculta
      document.body.classList.remove('cursor-tooltip');
      document.removeEventListener('mousemove', this.updatePosition);
    },
    pin() {
      this.pinned = true;
    },
    unpin() {
      this.pinned = false;
    },
    updatePosition(ev) {
      const el = this.$refs.tooltipRoot;
      if (!el) return;

      const tooltipWidth = el.offsetWidth || 150;
      const spacing = 5;
      const offsetY = 25;

      let left;
      if (this.side === 'left') {
        left = ev.pageX - tooltipWidth - spacing;
      } else if (this.side === 'right') {
        left = ev.pageX + spacing;
      } else {
        left = ev.pageX - tooltipWidth / 2;
      }

      const maxLeft = document.documentElement.clientWidth - tooltipWidth - 10;
      if (left < 10) left = 10;
      if (left > maxLeft) left = maxLeft;

      el.style.left = `${left}px`;
      el.style.top = `${ev.pageY + offsetY}px`;


    },
    // Abre un Leaflet Popup en un lat/lng con el mismo contenido del Tooltip
    // Uso: this.$refs.tooltipRef.openPopupAt([lat, lng], mapInstance [, htmlOverride])
    openPopupAt(latLng, map, htmlOverride = null) {
      try {
        if (!process.client || !window.L || !map || !latLng) return;
        // Mientras el popup está abierto, ocultamos el tooltip flotante y lo marcamos como "fijado"
        if (this.visible) this.hide();
        const contentInner = htmlOverride !== null ? htmlOverride : this.tooltipContent;
        const titleHtml = this.tooltipTitle ? `<div class="tooltip-title">${this.tooltipTitle}</div>` : '';
        const contentHtml = `<div class="tooltip-content">${titleHtml}${contentInner}</div>`;
        const popup = window.L.popup({
          autoClose: true,
          closeOnClick: true,
          closeOnEscapeKey: true
        })
        .setLatLng(latLng)
        .setContent(contentHtml)
        .openOn(map);
        this.pin();
        // Desanclar al cerrar el popup
        map.once('popupclose', () => {
          this.unpin();
        });
        return popup;
      } catch (e) {
        // fallback: no-op
        // console.error('[Tooltip] openPopupAt failed', e);
      }
    }
  },
};
</script>

<style>
.generic-tooltip,
.bands-tooltip,
.preorigin-tooltip,
.rfplans-tooltip,
.custom-tooltip {
  position: absolute;
  background: rgba(225, 232, 255, 0.65);
  backdrop-filter: blur(3px); 
  -webkit-backdrop-filter: blur(3px);
  border: 1px solid #bbb;
  border-radius: 7px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 1000;
  max-width: 300px;
  font-family: 'Rubik', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  animation: scale-estreme 0.2s ease-out;
  transform-origin: top center;
  padding: 0;
}
.tooltip-content {
  padding: 10px 14px;
  color: #222;
  background: transparent;
  
}

.tooltip-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 5px;
  color: #5f6266;
  letter-spacing: 0.2px;
}

.cursor-tooltip,
.cursor-tooltip * {
  cursor: pointer !important;
}

/* Leaflet Tooltip: unificar visual sin romper interactividad/posición */
.leaflet-tooltip {
  background: rgba(225, 232, 255, 0.65);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  border: 1px solid #bbb;
  border-radius: 7px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  font-family: 'Rubik', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  padding: 0; /* el relleno lo maneja .tooltip-content interna */
}

/* Popup Leaflet: unificar estilos con Tooltip */
.leaflet-popup-content-wrapper {
  background: rgba(225, 232, 255, 0.65);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  border: 1px solid #bbb;
  border-radius: 7px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  font-family: 'Rubik', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  padding: 0; /* el padding lo maneja .leaflet-popup-content */
  animation: scale-estreme 0.2s ease-out;
}

.leaflet-popup-tip {
  background: rgba(225, 232, 255, 0.65);
  border: 1px solid #bbb;
}

/* Contenido del popup: replicar .tooltip-content */
.leaflet-popup-content {
  margin: 0; /* quitar margen por defecto de Leaflet */
  padding: 10px 14px;
  color: #222;
  background: transparent;
}

/* Botón de cierre del popup: estilo sutil */
.leaflet-container a.leaflet-popup-close-button {
  color: #444;
  font-weight: 600;
}

@keyframes scale-estreme {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
