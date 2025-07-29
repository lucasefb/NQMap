<template>
  <div>
    <div class="filter-header" @click="toggleVisibility">
      <label class="filter-label">
        <input
          v-if="selectable"
          type="checkbox"
          :checked="checked"
          @click.stop="$emit('toggleAll', !checked)"
        />
        <span>{{ title }}</span>
      </label>
      <span :class="{ 'arrow-up': isVisible, 'arrow-down': !isVisible }"></span>
    </div>
    <div v-show="isVisible" class="filter-group">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      required: true
    },
    selectable: {
      type: Boolean,
      default: false
    },
    checked: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isVisible: false
    };
  },
  methods: {
    toggleVisibility() {
      this.isVisible = !this.isVisible;
    }
  }
};
</script>

<style scoped>
.filter-header {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-radius: 8px;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  margin-bottom: 10px;
  transition: background-color 0.3s ease;
  align-items: center;
}

.filter-header:hover {
  background-color: #e9ecef;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrow-up::before,
.arrow-down::before {
  content: '';
  border: solid rgb(0, 0, 0);
  border-width: 0 2px 2px 0;
  display: inline-block;
  padding: 3px;
}

.arrow-up::before {
  transform: rotate(-135deg);
}

.arrow-down::before {
  transform: rotate(45deg);
}

.filter-group {
  padding-left: 20px;
}
</style>
