<template>
  <div>
    <div class="vertical-sidebar" @click="toggleVisibility">
      <label class="filter-label">
        <input
          v-if="selectable"
          type="checkbox"
          :checked="checked"
          @click.stop="$emit('toggleAll', !checked)"
        />
        <!-- SVG checkbox igual al de FilterItem -->
        <svg v-if="selectable" viewBox="0 0 64 64" height="1em" width="1em">
          <path d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16" pathLength="575.0541381835938" class="path" />
        </svg>
        <img v-if="icon" :src="iconSrc" alt="" class="filter-icon" />
        <span>{{ title }}</span>
      </label>
      <span :class="{ 'arrow-up': isVisible, 'arrow-down': !isVisible }"></span>
    </div>
    <transition name="collapse_vertical">
      <div v-show="isVisible" class="filter-group">
      <slot></slot>
          </div>
    </transition>
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
    },
    icon: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      isVisible: false
    };
  },
  computed: {
    iconSrc() {
      return this.icon ? require(`@/assets/images/${this.icon}`) : null;
    }
  },
  methods: {
    toggleVisibility() {
      this.isVisible = !this.isVisible;
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
.vertical-sidebar {
  font-family: 'Poppins', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(113, 128, 178, 0.36);
  border-radius: 10px;
  padding: 8px 8px;
  margin-bottom: 10px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.07);
  transition: background-color 0.25s ease, box-shadow 0.25s ease;
}

.vertical-sidebar:hover {
  background-color: rgba(113, 128, 178, 0.56);
  box-shadow: 0 6px 16px rgba(0,0,0,0.1);
}

.filter-label {
  font-family: 'Poppins', sans-serif;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  color: #ffffff;
  font-size: 1rem;
  flex: 1;
}

.arrow-up::before {
  transform: rotate(-135deg);
}

.arrow-down::before {
  transform: rotate(45deg);
}

.filter-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  /* Cambia cualquier color del SVG a blanco */
  filter: brightness(0) invert(1);
}

.filter-group {
  padding-left: 20px;
  padding-bottom: 8px;
  animation: fadeIn 0.3s ease;
}
.collapse_-enter-active, .collapse-leave-active {
  transition: all 0.3s ease;
}
.collapse-enter, .collapse-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.filter-label input {
  display: none;
}

.filter-label svg {
  overflow: visible;
}

.filter-label .path {
  fill: none;
  stroke: white;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease;
  stroke-dasharray: 241 9999999;
  stroke-dashoffset: 0;
}

.filter-label input:checked ~ svg .path {
  stroke-dasharray: 70.5096664428711 9999999;
  stroke-dashoffset: -262.2723388671875;
}
</style>