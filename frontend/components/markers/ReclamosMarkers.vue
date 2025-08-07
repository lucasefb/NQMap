<template>
  <div>
    <client-only>
      <!-- Show markers only after data loaded -->
      <div v-if="markers && markers.length">
        <template v-for="(group, idx) in groupedMarkers">
          <l-marker
            :lat-lng="[group.lat, group.lng]"
            :icon="iconFor(group.markers[0])"
          >
            <l-popup :autoClose="false" :closeOnEscapeKey="true" :closeOnClick="false">
              <div v-for="m in group.markers" :key="m.ID || m.id" class="reclamo-copy" style="min-width:220px;">
                <b>{{ m.tipo || m.TIPO_RECLAMO }}</b><br>

                <span>ESTADO:</span> {{ m.ESTADO || m.estado }}<br>
                <span>LAT/LON:</span> {{ m.lat || m.LATITUD }}, {{ m.lng || m.LONGITUD }}<br>
                <span>NOMBRE_REF:</span> {{ m.NOMBRE_REFERENCIAL || m.nombre_ref }}<br>
                <button @click="openAcciones(m)" style="margin-top:6px;">Ver acciones</button>
                <hr v-if="group.markers.length > 1" />
              </div>
            </l-popup>
            <l-tooltip v-if="$parent.zoom >= 14" :direction="'top'" :interactive="true">
              <div v-for="m in group.markers" :key="m.ID || m.id" class="reclamo-copy">
                <b>{{ m.tipo || m.TIPO_RECLAMO }}</b><br>
                <span>ESTADO:</span> {{ m.ESTADO || m.estado }}<br>
                <span>LAT/LON:</span> {{ m.lat || m.LATITUD }}, {{ m.lng || m.LONGITUD }}<br>
                <span>NOMBRE_REF:</span> {{ m.NOMBRE_REFERENCIAL || m.nombre_ref }}<br>
                <template v-if="m.acciones && m.acciones.length">
                  <div style="margin-top:2px;">
                    <span>Acciones:</span>
                    <ul style="padding-left:14px;">
                      <li v-for="(a, idx) in m.acciones" :key="(a.ID_RECLAMO || m.ID || m.id) + '-' + (a.TIPO_TAREA || a.tipo_tarea || idx)">
                        <span>Estado:</span> {{ a.ESTADO || a.estado }}<br>
                        <span>Tarea:</span> {{ a.TIPO_TAREA || a.tipo_tarea }}
                      </li>
                    </ul>
                  </div>
                </template>
                <hr v-if="group.markers.length > 1" />
              </div>
            </l-tooltip>
          </l-marker>
        </template>
      </div>
    </client-only>
  </div>
</template>

<script>

// Marker SVG para reclamos (VIP/CORPO)
function getReclamoSvgIcon ({ tipo = 'VIP', radius = 12 } = {}) {
  const color = tipo === 'VIP' ? '#ff0000' : '#007bff'
  const size = radius * 2
  const svg = `
    <svg width="${size}" height="${size}" viewBox="-2 0 19 19" xmlns="http://www.w3.org/2000/svg" fill="${color}">
      <path d="M14.032 5.286v7.276a1.112 1.112 0 0 1-1.108 1.108H8.75l-1.02 1.635a.273.273 0 0 1-.503 0l-1.02-1.635h-4.13a1.112 1.112 0 0 1-1.109-1.108V5.286a1.112 1.112 0 0 1 1.108-1.108h10.848a1.112 1.112 0 0 1 1.108 1.108zM8.206 11.34a.706.706 0 1 0-.706.705.706.706 0 0 0 .706-.705zm-1.26-1.83a.554.554 0 1 0 1.108 0V6.275a.554.554 0 1 0-1.108 0z"/>
    </svg>
  `
  return svg
}


export default {
  components: {
    LTooltip: () => process.client ? import('vue2-leaflet').then(m => m.LTooltip) : Promise.resolve({ render: () => null }),
    LPopup: () => process.client ? import('vue2-leaflet').then(m => m.LPopup) : Promise.resolve({ render: () => null })
  },
  name: 'ReclamosMarkers',
  props: {
    markers: {
      type: Array,
      default: () => []
    },
    zoom: Number
  },
  computed: {
    groupedMarkers() {
      // Agrupa markers por lat/lon exactos
      const groups = {};
      for (const m of this.markers) {
        const lat = m.LATITUD || m.lat || m.latitud;
        const lng = m.LONGITUD || m.lng || m.longitud;
        const key = `${lat},${lng}`;
        if (!groups[key]) {
          groups[key] = { lat, lng, markers: [] };
        }
        groups[key].markers.push(m);
      }
      return Object.values(groups);
    }
  },
  methods: {
    openAcciones (reclamo) {
      const id = reclamo.ID || reclamo.id;
      if (!id) return;
      const url = `http://10.202.50.82:8080/reclamos/${id}`;
      if (process.client) {
        window.open(url, '_blank');
      }
    },

    iconFor (row) {
      // Determine type and build icon using common helper
      const tipo = (row.tipo || row.TIPO_RECLAMO || '').toUpperCase() || 'OTROS'
      const svg = getReclamoSvgIcon({ tipo, radius: 12 }) // radius 12 => 24px width
      return L.divIcon({
        html: svg,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
        className: 'reclamo-svg-icon'
      })
    }
  }
}
</script>

<style scoped>
.reclamo-copy {
  user-select: text;
}
</style>
