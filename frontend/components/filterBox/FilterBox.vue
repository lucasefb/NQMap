<template>
  <div :class="['filter-container', { collapsed: isCollapsed }]">
    <!-- Botón para colapsar/expandir el panel -->
    <button class="collapse-btn" @click="toggleCollapse">
      <span v-if="!isCollapsed">❮</span>
      <span v-else>❯</span>
    </button>
    <div class="logo-group">
      <img :src="currentLogo" alt="Logo" class="logo" />
    </div>

    <div class="filter-group">
      <FilterGroup title="Sitios" icon="sitios.svg" @toggleGroup="toggle('Sites')">

        <FilterGroup title="Soluciones" @toggleGroup="toggle('Solutions')">
          <FilterItem
            v-for="(checked, key) in filterForSolution"
            :key="key"
            :checked="checked"
            @update="updateFilter(filterForSolution, key, $event)"
          >
            {{ key.replace(/_/g, ' ') }}
          </FilterItem>
        </FilterGroup>

        <FilterGroup
          v-for="tech in ['2G', '3G', '4G', '5G']"
          :key="tech"
          :title="tech"
          :selectable="true"
          :checked="allSelected(filterForTechnology[`filter${tech}`])"
          @toggleGroup="toggle('Site' + tech)"
          @toggleAll="toggleAll(filterForTechnology[`filter${tech}`], $event)"
        >
          <FilterItem
            v-for="(checked, key) in filterForTechnology[`filter${tech}`]"
            :key="key"
            :checked="checked"
            @update="updateFilter(filterForTechnology[`filter${tech}`], key, $event)"
          >
            {{ key.replace('banda', '') }}
          </FilterItem>

          <FilterItem
            v-if="tech === '4G'"
            :checked="loadCellsWithBigPRB"
            @update="$emit('toggleBigPRB', $event)"
          >
            Sitios con alta carga
          </FilterItem>
        </FilterGroup>
      </FilterGroup>

      <FilterGroup
        title="Planes RF"
        icon="planrf.svg"
        :selectable="true"
        :checked="allSelected(filterForRFPlans)"
        @toggleGroup="toggle('RF')"
        @toggleAll="toggleAll(filterForRFPlans, $event)"
      >
        <FilterItem
          v-for="(checked, key) in filterForRFPlans"
          :key="key"
          :checked="checked"
          @update="updateFilter(filterForRFPlans, key, $event)"
        >
          {{ key.replace(/_/g, ' ') }}
        </FilterItem>
      </FilterGroup>

      <FilterGroup
        title="Pre-Origin"
        icon="origin.svg"
        :selectable="true"
        :checked="allSelected(filterForPreOrigin)"
        @toggleGroup="toggle('Origin')"
        @toggleAll="toggleAll(filterForPreOrigin, $event)"
      >
        <FilterItem
          v-for="(checked, key) in filterForPreOrigin"
          :key="key"
          :checked="checked"
          @update="updateFilter(filterForPreOrigin, key, $event)"
        >
          {{ key.replace(/_/g, ' ') }}
        </FilterItem>
      </FilterGroup>

      
      <FilterGroup title="Cobertura 4G" icon="cobertura.svg" @toggleGroup="toggle('Arieso')">
        <FilterGroup
          title="Intensidad (RSRP)"
          :selectable="false"
        >
          <FilterItem
            v-for="key in rsrpKeys"
            :key="key"
            :checked="filterByCoverageLTE[key]"
            @update="update4G(key, $event)"
          >
            {{ key.replace('LTE RSRP', '').replace('.kmz', '').trim() }}
          </FilterItem>

        </FilterGroup>

        <FilterGroup
          title="Calidad (RSRQ)"
          :selectable="false"
        >
          <FilterItem
            v-for="key in rsrqKeys"
            :key="key"
            :checked="filterByCoverageLTE[key]"
            @update="update4G(key, $event)"
          >
            {{ key.replace('LTE RSRQ', '').replace('.kmz', '').trim() }}
          </FilterItem>
        </FilterGroup>

        <FilterGroup
          title="Throughput (TRP)"
          :selectable="false"
        >
          <FilterItem
            v-for="key in trpKeys"
            :key="key"
            :checked="filterByCoverageLTE[key]"
            @update="update4G(key, $event)"
          >
            {{ key.replace('LTE Avg_TH_DL', '').replace('.kmz', '').trim() }}
          </FilterItem>
        </FilterGroup>
      </FilterGroup>
    </div>

    <FilterGroup title="Reclamos" icon="reclamos.svg" :selectable="false" :checked="false">
      <FilterItem :checked="localCorpoVipFilter.CORPO" @update="updateCorpoVip('CORPO', $event)">CORPO</FilterItem>
      <FilterItem :checked="localCorpoVipFilter.VIP" @update="updateCorpoVip('VIP', $event)">VIP</FilterItem>
    </FilterGroup>


    <button class="button" @click="toggleMapType">
      <img src="@/assets/images/map.svg" class="icon" alt="map" />
      <span class="text">Mapa</span>
    </button>
  </div>
</template>

<script>
import FilterGroup from "./FilterGroup.vue";
import FilterItem from "./FilterItem.vue";


export default {
  name: "FilterBox",
  components: { FilterGroup, FilterItem },
  props: {
    
    filterForRFPlans: Object,
    filterForPreOrigin: Object,
    filterForSolution: Object,
    filterForTechnology: Object,
    filterByCoverageLTE: Object,
    loadCellsWithBigPRB: Boolean,
    mapType: String,
    corpoVipFilter: {
      type: Object,
      required: false,
      default: () => ({ CORPO: false, VIP: false })
    }
  },
  data() {
    return {
      localCorpoVipFilter: this.corpoVipFilter && typeof this.corpoVipFilter === 'object'
        ? { ...this.corpoVipFilter }
        : { CORPO: false, VIP: false },
      showReclamos: false,
        isCollapsed: false
    }
  },
  watch: {
    corpoVipFilter: {
      handler(newVal) {
        if (newVal && typeof newVal === 'object') {
          this.localCorpoVipFilter = { ...newVal };
        } else {
          this.localCorpoVipFilter = { CORPO: false, VIP: false };
        }
      },
      deep: true
    },
    localCorpoVipFilter: {
      handler(newVal) {
        if (JSON.stringify(newVal) !== JSON.stringify(this.corpoVipFilter)) {
          this.$emit('input', { ...newVal });
        }
      },
      deep: true
    }
  },
  computed: {
    // Logo dinámico según estado colapsado
    currentLogo() {
      return this.isCollapsed
        ? require('@/assets/images/Claro.png')
        : require('@/assets/images/Logo.png');
    },
    nextMapTypeName() {
      const types = ["roadmap", "satellite", "carto"];
      const next = types[(types.indexOf(this.mapType) + 1) % types.length];
      return next === "roadmap" ? "Roadmap" : next === "satellite" ? "Satelital" : "Carto";
    },
    filterByCoverageLTE_RSRP() {
      return this.extractSubset(this.filterByCoverageLTE, "RSRP");
    },
    filterByCoverageLTE_RSRQ() {
      return this.extractSubset(this.filterByCoverageLTE, "RSRQ");
    },
    filterByCoverageLTE_TRP() {
      return this.extractSubset(this.filterByCoverageLTE, "TH_DL");
    },
    rsrpKeys() {
      return Object.keys(this.filterByCoverageLTE).filter(k => k.includes('RSRP'));
    },
    rsrqKeys() {
      return Object.keys(this.filterByCoverageLTE).filter(k => k.includes('RSRQ'));
    },
    trpKeys() {
      return Object.keys(this.filterByCoverageLTE).filter(k => k.includes('TH_DL'));
    }
  },

  methods: {
    toggle(group) {
      this[`show${group}`] = !this[`show${group}`];
    },
    allSelected(group) {
      return Object.values(group).every(Boolean);
    },
    // toggleAll marca o desmarca todos los ítems de un grupo; para 4G omite "Sitios con alta carga"
    toggleAll(group, value) {
      // Marcar/desmarcar los checkboxes del grupo indicado
      Object.keys(group).forEach(k => {
        this.$set(group, k, value);
      });

      // Si estamos operando sobre el set de bandas 4G, apagar la capa de alta carga al activarlo
      if (group === this.filterForTechnology.filter4G) {
        // Sincronizar check de bandas con objeto root filterByCoverageLTE
        const next = { ...this.filterByCoverageLTE };
        Object.keys(group).forEach(k => {
          next[k] = value;
        });
        // Emitir al padre para que actualice el objeto reactivo
        this.$emit('updatefilterByCoverageLTE', next);

        // Además, si estamos activando todas las bandas 4G, apagar la alta carga
        if (value) {
          this.$emit('toggleBigPRB', false);
        }
      }
    },
    updateFilter(group, key, value) {
      this.$set(group, key, value);
      if (group === this.filterByCoverageLTE) {
        this.$emit('updatefilterByCoverageLTE', group);
      }
    },
    // ...
    update4G(key, value) {
      console.log('[update4G] key:', key, 'value:', value, 'antes:', { ...this.filterByCoverageLTE });
      const is4GKey = key.includes('RSRP') || key.includes('RSRQ') || key.includes('TH_DL');
      if (!is4GKey) return;

      // Crear clon del objeto para no mutar la prop directamente
      const next = { ...this.filterByCoverageLTE };

      if (value) {
        // Encender sólo el seleccionado, apagar el resto
        Object.keys(next).forEach(k => {
          next[k] = k === key;
        });
      } else {
        // Apagar el seleccionado
        next[key] = false;
      }

      // Emitir el objeto actualizado al padre; el padre lo reenviará como prop
      this.$emit('updatefilterByCoverageLTE', next);
      // Agregar esta línea para forzar desactivar alta carga cuando se selecciona un filtro 4G
      this.$emit('toggleBigPRB', false);
    },
    /**
     * Devuelve un objeto con las claves del objeto original que contienen el keyword.
     * Se usa para separar RSRP, RSRQ y TH_DL.
     */
    extractSubset(original, keyword) {
      const subset = {};
      for (const key in original) {
        if (Object.prototype.hasOwnProperty.call(original, key) && key.includes(keyword)) {
          subset[key] = original[key];
        }
      }
      return subset;
    },
    updateCorpoVip(key, checked) {
      this.$set(this.localCorpoVipFilter, key, checked);
    },
    toggleMapType() {
      const types = ["roadmap", "satellite", "carto"];
      const next = types[(types.indexOf(this.mapType) + 1) % types.length];
      this.$emit("updateMapType", next);
    },
    // Cambia el estado de colapsado del panel
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
    }
  }
};
</script>

<style>
.logo {
  height: 40px;
  width: auto;
  max-width: 100px;
  margin-left: 80px;
  margin-top: 5px;
  margin-bottom: 5px;
  margin-right: 1rem;
  justify-content: center;
}

.filter-container {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 240px;
  max-width: 240px;
  max-height: 50%;
  background: rgba(113, 128, 178, 0.26);
  padding: 15px;
  border-radius: 15px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  z-index: 1000;
  max-height: 650px;
  overflow-y: auto;
  transition: all 0.3s ease;
  scroll-behavior: smooth;

}

.filter-container button {
  display: flex;
  justify-content: center;
}

.filter-container:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
  background: rgba(113, 128, 178, 0.48);
}

.site-filters {
  margin-left: 20px;
  padding: 10px;
  border: none;
  background-color: #f4f4f4;
  border-radius: 10px;
  transition: max-height 0.3s ease;
  margin-bottom: 10px;
}

.site-filters label {
  margin-bottom: 5px;
}

.button {
  margin: 10px auto;  /* centrado horizontal únicamente */
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(255,255,255,0.22);
  font-family: "Istok Web", sans-serif;
  letter-spacing: 1px;
  padding: 0 12px;
  text-align: center;
  width: 100px;
  height: 32px;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: normal;
  border-radius: 3px;
  outline: none;
  user-select: none;
  cursor: pointer;
  transform: translateY(0px);
  position: relative;
  background: rgba(113, 128, 178, 0.26);
  box-shadow:
    inset 0 30px 30px -15px rgba(255, 255, 255, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.25),
    inset 0 1px 20px rgba(0, 0, 0, 0),
    0 3px 0 #566286,            /* sombra principal un tono más oscuro */
    0 3px 2px rgba(0, 0, 0, 0.2),
    0 5px 10px rgba(0, 0, 0, 0.1),
    0 10px 20px rgba(0, 0, 0, 0.1);
  color: #f8f8f8; 
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
  transition: 150ms all ease-in-out;
}

.button:hover {
  background: rgba(113, 128, 178, 0.48);
}


.button .icon {
  margin-right: 8px;
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1);
  transition: all 0.5s ease-in-out;
}

.button:active {
  transform: translateY(3px);
  box-shadow:
    inset 0 16px 2px -15px rgba(0, 0, 0, 0),
    inset 0 0 0 1px rgba(255, 255, 255, 0.15),
    inset 0 1px 20px rgba(0, 0, 0, 0.1),
    0 0 0 #566286,              /* mismo tono que la sombra principal */
    0 0 0 2px rgba(255, 255, 255, 0.5),
    0 0 0 rgba(0, 0, 0, 0),
    0 0 0 rgba(0, 0, 0, 0);
}

.button:hover .text {
  transform: translateX(80px);
}
.button:hover .icon {
  transform: translate(23px);
}

.text {
  transition: all 0.25s ease-in-out;
}
.collapse-btn {
  display: block;
  position: static;
  margin: 0 0 12px auto;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.filter-container.collapsed .collapse-btn {
  position: static;
  margin: 0 auto 12px auto;
  right: unset;
  top: unset;
}

/* Estado colapsado */
.filter-container.collapsed {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 60px;
  padding: 10px 6px;
  width: 60px;
  padding: 10px 6px;
  align-items: center;
}

/* Logo tamaño reducido en modo colapsado */
.filter-container.collapsed .logo {
  margin-left: 0;
  height: 32px;
  margin-bottom: 24px;
}
.filter-container.collapsed .filter-label span,
.filter-container.collapsed .arrow-up,
.filter-container.collapsed .arrow-down {
  display: none;
}
/* Ocultar texto y checkboxes dentro de labels */
.filter-container.collapsed .filter-label input,
.filter-container.collapsed .filter-label span {
  display: none;
}
/* Ocultar grupos anidados */
.filter-container.collapsed .filter-group {
  display: none;
}
/* Deshabilitar clics para evitar expandir */
.filter-container.collapsed .vertical-sidebar {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  pointer-events: none;
  width: 100%;
}
.filter-container.collapsed .button {
  margin-top: 16px;
  width: 40px;
}
.filter-container.collapsed .button .icon{
  margin-right: 0;
}
.filter-container.collapsed .button .text {
  display: none;
}
/* No hover movement for button in collapsed mode */
.filter-container.collapsed .button:hover {
  box-shadow: none;
  background: #6f7aa8;
  transform: none;
}
.filter-container.collapsed .button:hover .icon {
  transform: none;
}
.filter-container.collapsed .button:hover .text {
  transform: none;
}

/* Scroll personalizado (Webkit - Chrome, Edge, Safari) */
.filter-container::-webkit-scrollbar {
  width: 6px;
}

.filter-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.filter-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: background 0.3s ease;
}

.filter-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.6);
}

/* Firefox */
.filter-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.4) rgba(255, 255, 255, 0.1);
}
  /* -------------------- Collapsed new layout -------------------- */
  /* Show only the first-level FilterGroups so that their icons remain visible */
  .filter-container.collapsed > .filter-group {
    display: block;
  }
  /* Keep nested (second level and deeper) groups hidden */
  .filter-container.collapsed .filter-group .filter-group {
    display: none;
  }
  /* Fine-tune spacing so icons appear one below the other */
  .filter-container.collapsed .vertical-sidebar {
    width: 100%;
    padding: 4px 0;
    background: transparent !important;
    box-shadow: none !important;
    gap: 6px;
  }
  /* Center icons and remove extra margin */
  .filter-container.collapsed .filter-icon {
    width: 22px;
    height: 22px;
    margin: 0;
    transition: transform 0.12s cubic-bezier(.4,0,.2,1), box-shadow 0.12s cubic-bezier(.4,0,.2,1);
  }
  .filter-container.collapsed .vertical-sidebar:hover .filter-icon,
  .filter-container.collapsed .filter-icon:hover {
    transform: scale(0.92);
    box-shadow: 0 1px 6px rgba(0,0,0,0.16) inset;
  }
  .filter-container.collapsed .filter-icon:active {
    transform: scale(0.83);
    box-shadow: 0 2px 10px rgba(0,0,0,0.22) inset;
  }
  /* Ocultar todos los checkboxes en estado colapsado */
  .filter-container.collapsed input[type="checkbox"] {
    display: none !important;
  }
  .filter-container.collapsed .filter-label svg {
    display: none !important;
  }
.logo-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  margin-bottom: 16px;
}

.filter-container.collapsed .logo-group {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-bottom: 0;
}

.logo {
  display: block;
  margin: 0 auto 8px auto;
}

.filter-container.collapsed .logo {
  margin: 0 auto 8px auto;
}

</style>
