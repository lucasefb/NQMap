<template>
  <div class="filter-container">
    <img src="@/assets/images/Logo.png" alt="Logo" class="logo" />

    <div class="filter-group">
      <FilterGroup title="Sitios" @toggleGroup="toggle('Sites')">

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

      
      <FilterGroup title="Cobertura 4G" @toggleGroup="toggle('Arieso')">
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

    <FilterGroup title="Reclamos" :selectable="false" :checked="false">
      <FilterItem :checked="localCorpoVipFilter.CORPO" @update="updateCorpoVip('CORPO', $event)">CORPO</FilterItem>
      <FilterItem :checked="localCorpoVipFilter.VIP" @update="updateCorpoVip('VIP', $event)">VIP</FilterItem>
    </FilterGroup>
    <button @click="toggleMapType">
      Cambiar a {{ nextMapTypeName }}
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
      showReclamos: false
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
    updateCorpoVip(key, checked) {
      this.$set(this.localCorpoVipFilter, key, checked);
    },
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
    toggleMapType() {
      const types = ["roadmap", "satellite", "carto"];
      const next = types[(types.indexOf(this.mapType) + 1) % types.length];
      this.$emit("updateMapType", next);
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
}

.filter-container {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 280px;
  background: rgba(93, 108, 158, 0.349);
  padding: 15px;
  border-radius: 15px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  z-index: 1000;
  max-height: 650px;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.filter-container:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
  background: rgba(93, 108, 158, 0.685);
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

button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #222A75;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}
</style>
