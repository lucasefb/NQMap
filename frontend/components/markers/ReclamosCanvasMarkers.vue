<template>
  <div></div>
</template>

<script>
export default {
  name: 'ReclamosCanvasMarkers',
  props: {
    markers: { type: Array, default: () => [] },
    mapInstance: { type: Object, required: true },
    zoom: { type: Number, required: true }
  },
  data() {
    return {
      layer: null,
      tooltipEl: null,
      activePopupKey: null
    };
  },
  watch: {
    markers: {
      deep: true,
      handler() { this.refreshGroups(); }
    },
    zoom() {
      // hide tooltip if zoomed out <14
      if (this.zoom < 14 && this.tooltipEl) this.tooltipEl.style.display = 'none';
    }
  },
  mounted() { this.init(); },
  beforeDestroy() { this.cleanup(); },
  methods: {
    async init() {
      if (!this.mapInstance || (typeof process !== 'undefined' && !process.client)) return;
      const { createReclamosCanvasLayer } = await import('../methods/ReclamosCanvasLayer.js');
      const Ctor = createReclamosCanvasLayer();
      if (!Ctor) return;
      this.layer = new Ctor();
      this.refreshGroups();
      this.layer.on('reclamoover', e => this.showTooltip(e.group));
      this.layer.on('reclamoout', () => this.hideTooltip());
      this.layer.on('reclamoclick', e => this.openPopup(e.group));
      this.mapInstance.addLayer(this.layer);
    },
    cleanup() {
      if (this.layer && this.mapInstance?.hasLayer(this.layer)) this.mapInstance.removeLayer(this.layer);
      this.layer = null;
      if (this.tooltipEl) this.tooltipEl.remove();
    },
    refreshGroups() {
      if (!this.layer) return;
      const grouped = this.buildGroups(this.markers || []);
      this.layer.setGroups(grouped);
    },
    buildGroups(markers) {
      const groups = {};
      for (const m of markers) {
        const lat = m.LATITUD || m.lat || m.latitud;
        const lng = m.LONGITUD || m.lng || m.longitud;
        const key = `${lat},${lng}`;
        if (!groups[key]) groups[key] = { lat, lng, markers: [] };
        groups[key].markers.push(m);
      }
      return Object.values(groups);
    },
    ensureTooltipEl() {
      if (!this.tooltipEl) {
        this.tooltipEl = document.createElement('div');
        // Usar estilos globales unificados desde Tooltip.vue
        this.tooltipEl.className = 'custom-tooltip';
        this.mapInstance.getContainer().appendChild(this.tooltipEl);
      }
    },
    buildGroupKey(group) {
      return `${group.lat},${group.lng}|${(group.markers && group.markers.length) || 0}`;
    },
    showTooltip(group) {
      if (this.zoom < 14) return;
      const key = this.buildGroupKey(group);
      if (this.activePopupKey && this.activePopupKey === key) return;
      this.ensureTooltipEl();
      // Usar el mismo wrapper que los tooltips/popup globales para unificar padding/estilos
      const inner = group.markers.map(m => this.tooltipHtml(m, group.markers.length > 1)).join('');
      this.tooltipEl.innerHTML = `<div class="tooltip-content">${inner}</div>`;
      const p = this.mapInstance.latLngToContainerPoint([group.lat, group.lng]);
      this.tooltipEl.style.left = `${p.x}px`;
      this.tooltipEl.style.top = `${p.y + 20}px`;
      this.tooltipEl.style.display = 'block';
    },
    hideTooltip() {
      if (this.tooltipEl) this.tooltipEl.style.display = 'none';
    },
    tooltipHtml(m, showHr) {
      const acciones = Array.isArray(m.acciones) ? m.acciones : [];
      // Determinar tipo de cliente (VIP o CORPO por defecto)
      const isVip = (m && (
        m.VIP === true || m.vip === true ||
        m.TIPO_CLIENTE === 'VIP' || m.tipo_cliente === 'VIP' ||
        (m.SEGMENTO && /vip/i.test(m.SEGMENTO)) || (m.segmento && /vip/i.test(m.segmento))
      ));
      return `
        <div style="min-width:220px;" class="reclamo-copy">
          <div class="tooltip-title">Reclamos</div>
          <b>Tipo:</b> ${m.tipo || m.TIPO_RECLAMO}<br>
          <b>Estado:</b> ${m.ESTADO || m.estado}<br>
          <b>Lat/Lon:</b> ${m.lat || m.LATITUD}, ${m.lng || m.LONGITUD}<br>
          <b>Nombre Ref:</b> ${m.NOMBRE_REFERENCIAL.replace(/_/g, ' ') || m.nombre_ref.replace(/_/g, ' ')}<br>
            <div style="display:flex; justify-content:center; margin-top:0px;">
              <button 
                data-reclamo-id="${m.ID || m.id}"
                class="reclamo-btn"
                style="
                  color: inherit;
                  background: rgba(225, 232, 255, 0.5);
                  backdrop-filter: blur(3px); 
                  -webkit-backdrop-filter: blur(3px);
                  border: 1px solid rgba(0,0,0,0.15);
                  border-radius: 8px;
                  cursor: pointer;
                "
              >
                Ver acciones
              </button>
            </div>
          ${showHr ? '<hr>' : ''}
        </div>`;
    },
    openPopup(group) {
      if (typeof process !== 'undefined' && !process.client) return;
      // Ocultar tooltip flotante si está visible para este grupo
      this.hideTooltip();
      const contentInner = group.markers.map(m => this.tooltipHtml(m, group.markers.length > 1)).join('');
      const content = `<div class="tooltip-content">${contentInner}</div>`;
      this.activePopupKey = this.buildGroupKey(group);
      const popup = L.popup({ autoClose: true, closeOnClick: true, closeOnEscapeKey: true })
        .setLatLng([group.lat, group.lng])
        .setContent(content);
      popup.on('add', () => {
        // delegate click on buttons
        const el = popup.getElement();
        if (!el) return;
        const onClick = (evt) => {
          const btn = evt.target.closest('button[data-reclamo-id]');
          if (btn) {
            const id = btn.getAttribute('data-reclamo-id');
            if (id) window.open(`http://10.202.50.82:8080/reclamos/${id}`, '_blank');
          }
        };
        const onOver = (evt) => {
          const btn = evt.target.closest('button[data-reclamo-id]');
          if (!btn) return;
          // Hover sutil: apenas más marcado que el fondo base actual
          btn.style.background = 'rgba(225, 232, 255, 0.6)';
          try {
            // Un solo pulso leve
            if (btn._pulseAnim) { try { btn._pulseAnim.cancel(); } catch (_) {} btn._pulseAnim = null; }
            if (btn.animate) {
              btn._pulseAnim = btn.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(1.02)' },
                { transform: 'scale(1)' }
              ], { duration: 450, iterations: 1, easing: 'ease-out' });
            }
          } catch (_) {}
        };
        const onOut = (evt) => {
          const btn = evt.target.closest('button[data-reclamo-id]');
          if (!btn) return;
          // Volver al color base actual del botón
          btn.style.background = 'rgba(225, 232, 255, 0.5)';
          if (btn._pulseAnim) { try { btn._pulseAnim.cancel(); } catch (_) {} btn._pulseAnim = null; }
        };
        el.addEventListener('click', onClick);
        el.addEventListener('mouseover', onOver);
        el.addEventListener('mouseout', onOut);
        // Cleanup listeners when popup is removed
        popup.once && popup.once('remove', () => {
          try {
            el.removeEventListener('click', onClick);
            el.removeEventListener('mouseover', onOver);
            el.removeEventListener('mouseout', onOut);
          } catch (_) {}
        });
      });
      popup.openOn(this.mapInstance);
      if (popup && popup.once) {
        popup.once('remove', () => {
          this.activePopupKey = null;
        });
      }
    }
  }
};
</script>

<style scoped>
.reclamo-tooltip {
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
</style>
