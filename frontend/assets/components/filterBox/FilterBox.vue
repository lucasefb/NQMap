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
          :selectable="true"
          :checked="allSelected(filterForRSRP_RSRP)"
          @toggleAll="toggleAll(filterForRSRP_RSRP, $event)"
        >
          <FilterItem
            v-for="(checked, key) in filterForRSRP_RSRP"
            :key="key"
            :checked="checked"
            @update="updateFilter(filterForRSRP_RSRP, key, $event)"
          >
            {{ key.replace('LTE RSRP', '').replace('.kmz', '').trim() }}
          </FilterItem>

        </FilterGroup>

        <FilterGroup
          title="Calidad (RSRQ)"
          :selectable="true"
          :checked="allSelected(filterForRSRP_RSRQ)"
          @toggleAll="toggleAll(filterForRSRP_RSRQ, $event)"
        >
          <FilterItem
            v-for="(checked, key) in filterForRSRP_RSRQ"
            :key="key"
            :checked="checked"
            @update="updateFilter(filterForRSRP_RSRQ, key, $event)"
          >
            {{ key.replace('LTE RSRQ', '').replace('.kmz', '').trim() }}
          </FilterItem>
        </FilterGroup>

        <FilterGroup
          title="Throughput (TRP)"
          :selectable="true"
          :checked="allSelected(filterForRSRP_TRP)"
          @toggleAll="toggleAll(filterForRSRP_TRP, $event)"
        >
          <FilterItem
            v-for="(checked, key) in filterForRSRP_TRP"
            :key="key"
            :checked="checked"
            @update="updateFilter(filterForRSRP_TRP, key, $event)"
          >
            {{ key.replace('LTE Avg_TH_DL', '').replace('.kmz', '').trim() }}
          </FilterItem>
        </FilterGroup>
      </FilterGroup>
    </div>

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
    filterForRSRP: Object,
    loadCellsWithBigPRB: Boolean,
    mapType: String
  },
  computed: {
    nextMapTypeName() {
      const types = ["roadmap", "satellite", "carto"];
      const next = types[(types.indexOf(this.mapType) + 1) % types.length];
      return next === "roadmap" ? "Roadmap" : next === "satellite" ? "Satelital" : "Carto";
    },
    filterForRSRP_RSRP() {
      return this.extractSubset(this.filterForRSRP, "RSRP");
    },
    filterForRSRP_RSRQ() {
      return this.extractSubset(this.filterForRSRP, "RSRQ");
    },
    filterForRSRP_TRP() {
      return this.extractSubset(this.filterForRSRP, "TH_DL");
    }
  },
  methods: {
    toggle(group) {
      this[`show${group}`] = !this[`show${group}`];
    },
    allSelected(group) {
      return Object.values(group).every(Boolean);
    },
    toggleAll(group, value) {
      Object.keys(group).forEach(key => {
        group[key] = value;
      });
      this.$emit("updateFilterForRSRP", {
        ...this.filterForRSRP_RSRP,
        ...this.filterForRSRP_RSRQ,
        ...this.filterForRSRP_TRP,
      });
    },
    updateFilter(group, key, value) {
      this.$set(group, key, value);
      this.$emit("updateFilterForRSRP", {
        ...this.filterForRSRP_RSRP,
        ...this.filterForRSRP_RSRQ,
        ...this.filterForRSRP_TRP,
      });
    },
    extractSubset(original, keyword) {
      const subset = {};
      for (const key in original) {
        if (key.includes(keyword)) {
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
