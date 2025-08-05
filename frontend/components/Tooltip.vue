<template>
  <div
    :class="['generic-tooltip', extraClass, { pinned }]"
    v-show="visible"
    @click.stop="togglePin"
    ref="tooltipRoot"
  >
    <button
      v-if="pinned"
      class="tooltip-close"
      @click.stop="unpin"
    >×</button>

    <!-- default slot for custom markup -->
    <slot v-if="$slots.default"></slot>

    <!-- or raw HTML string -->
    <div v-else v-html="tooltipContent"></div>
  </div>
</template>

<script>
export default {
  name: 'Tooltip',
  props: {
    /* Optional extra class (e.g. 'bands-tooltip') for custom width/effects */
    extraClass: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      tooltipContent: '',
      visible: false,
      pinned: false,
    };
  },
  methods: {
    /**
     * Show tooltip with provided HTML or pass null to use slot.
     * @param {String|null} html HTML string
     * @param {MouseEvent} [ev] optional event for positioning
     */
    show(html, ev) {
      if (html !== null) this.tooltipContent = html;
      this.visible = true;
      if (!this.pinned) {
        document.addEventListener('mousemove', this.updatePosition);
      }
      if (ev) this.updatePosition(ev);
    },
    hide() {
      if (this.pinned) return;
      this.visible = false;
      document.removeEventListener('mousemove', this.updatePosition);
    },
    /** Fix/unfix tooltip on click */
    togglePin() {
      this.pinned = !this.pinned;
      if (this.pinned) {
        document.removeEventListener('mousemove', this.updatePosition);
      } else {
        document.addEventListener('mousemove', this.updatePosition);
      }
    },
    unpin() {
      this.pinned = false;
      this.hide();
    },
    updatePosition(ev) {
      const el = this.$refs.tooltipRoot;
      if (!el) return;
      el.style.left = `${ev.pageX + 10}px`;
      el.style.top = `${ev.pageY + 10}px`;
    },
  },
};
</script>

<style>
.bands-tooltip,
.preorigin-tooltip,
.rfplans-tooltip,
.custom-tooltip,
.leaflet-tooltip {
  position: absolute;
  background: rgba(225, 232, 255, 0.986);
  color: #222;
  border: 1px solid #bbb;
  padding: 10px 14px;
  border-radius: 7px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  pointer-events: auto; /* allow click interactions */
  z-index: 1000;
  max-width: 300px;
  font-family: 'Poppins';
  font-size: 14px;
  line-height: 1.4;
  /* animation will be declared below */
}

/* Inner container styling if needed */
.bands-tooltip-inner,
.preorigin-tooltip-inner,
.rfplans-tooltip-inner {
  padding: 0;
}

/* ---- Global Tooltip Animation (scale & fade) ---- */
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

.bands-tooltip,
.preorigin-tooltip,
.rfplans-tooltip,
.custom-tooltip,
.leaflet-tooltip {
  animation: scale-estreme 0.2s ease-out;
  transform-origin: top left;
}

/* End Animation */

/* Close button */
.tooltip-close {
  position: absolute;
  top: 4px;
  right: 6px;
  background: transparent;
  border: none;
  font-size: 16px;
  font-weight: bold;
  color: #555;
  cursor: pointer;
}
.tooltip-close:hover {
  color: #000;
}
</style>
