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
  },
};
</script>

<style>
.generic-tooltip,
.bands-tooltip,
.preorigin-tooltip,
.rfplans-tooltip,
.custom-tooltip,
.leaflet-tooltip {
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
