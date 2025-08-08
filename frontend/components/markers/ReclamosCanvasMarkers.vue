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
      if (!this.mapInstance || !process.client) return;
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
        this.tooltipEl.className = 'reclamo-tooltip';
        Object.assign(this.tooltipEl.style, {
          position: 'absolute',
          pointerEvents: 'auto',
          background: '#fff',
          padding: '6px',
          border: '1px solid #333',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        });
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
      this.tooltipEl.innerHTML = group.markers.map(m => this.tooltipHtml(m, group.markers.length > 1)).join('');
      const p = this.mapInstance.latLngToContainerPoint([group.lat, group.lng]);
      this.tooltipEl.style.left = `${p.x}px`;
      this.tooltipEl.style.top = `${p.y - 20}px`;
      this.tooltipEl.style.display = 'block';
    },
    hideTooltip() {
      if (this.tooltipEl) this.tooltipEl.style.display = 'none';
    },
    tooltipHtml(m, showHr) {
      const acciones = Array.isArray(m.acciones) ? m.acciones : [];
      return `
        <div style="min-width:220px;" class="reclamo-copy">
          <b>${m.tipo || m.TIPO_RECLAMO}</b><br>
          <span>ESTADO:</span> ${m.ESTADO || m.estado}<br>
          <span>LAT/LON:</span> ${m.lat || m.LATITUD}, ${m.lng || m.LONGITUD}<br>
          <span>NOMBRE_REF:</span> ${m.NOMBRE_REFERENCIAL || m.nombre_ref}<br>
          <button data-reclamo-id="${m.ID || m.id}" style="margin-top:6px;">Ver acciones</button>
          ${showHr ? '<hr>' : ''}
        </div>`;
    },
    openPopup(group) {
      if (!process.client) return;
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
        popup.getElement().addEventListener('click', evt => {
          const btn = evt.target.closest('button[data-reclamo-id]');
          if (btn) {
            const id = btn.getAttribute('data-reclamo-id');
            if (id) window.open(`http://10.202.50.82:8080/reclamos/${id}`, '_blank');
          }
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
