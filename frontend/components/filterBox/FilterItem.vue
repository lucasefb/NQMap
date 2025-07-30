<template>
    <label class="filter-label">
        <input type="checkbox"
      v-if="checked !== undefined"
      :checked="checked"
      @change="$emit('update', $event.target.checked)"
    />
    <input type="checkbox"
      v-else
      v-model="model"
    />
        <span class="checkmark"></span>
        <slot></slot>
    </label>
</template>

<script>
export default {
  props: {
    value: Boolean,
    checked: Boolean
  },
  computed: {
    model: {
      get() {
        return this.value !== undefined ? this.value : this.checked;
      },
      set(val) {
        this.$emit('update', val);
        this.$emit('input', val);
      }
    }
  }
}
</script>

<style scoped>
.filter-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-bottom: 5px;
    font-size: 1em;
    color: #333;
}

input[type="checkbox"] {
    display: none;
}

.checkmark {
    height: 18px;
    width: 18px;
    background-color: #ddd;
    border-radius: 3px;
    margin-right: 10px;
    display: inline-block;
    position: relative;
}

input[type="checkbox"]:checked+.checkmark {
    background-color: #222A75;
}

.checkmark::after {
    content: '';
    position: absolute;
    display: none;
    left: 6px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 3px 3px 0;
    transform: rotate(45deg);
}

input[type="checkbox"]:checked+.checkmark::after {
    display: block;
}
</style>