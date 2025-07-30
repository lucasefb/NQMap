<template>
  <div>
    <div class="header-container">
      <input type="text" name="site-search" id="site-search" v-model="searchQuery" placeholder="Buscar sitio..." class="input-field-search"
        @keyup.enter="search" />
    </div>

    <div class="header-container-coordinates">
      <input type="text" name="coordinate-search" id="coordinate-search" v-model="searchQueryCoordinates"
        placeholder="Lat, Lon (Ej:-31.4166, -64.1833)" class="input-field-search-coordinates"
        @keyup.enter="searchByCoordinates" />
      <button class="clear-marker-button" @click="clearMarker" title="Eliminar marcador">
        ✖
      </button>
    </div>

    <div class="header-container-direction">
      <input type="text" v-model="searchQueryDirection" name="location-search" id="location-search"
        placeholder="Buscar Dirección..." class="input-field" @input="getSuggestions" @keydown.enter="searchLocation" />

      <ul v-if="suggestions.length" class="suggestions-list">
        <li v-for="(suggestion, index) in suggestions.slice(0, 3)" :key="index" @click="selectSuggestion(suggestion)">
          {{ suggestion.display_name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import debounce from 'lodash.debounce';
const API_BASE_URL = process.env.API_BASE_URL;

export default {
  name: 'Header',
  props: { mapInstance: Object },

  data() {
    return {
      searchQuery: '',
      searchQueryDirection: '',
      searchQueryCoordinates: '',
      suggestions: [],
    };
  },
  methods: {
    async getSuggestions() {
      if (this.searchQueryDirection.length < 3) {
        this.suggestions = [];
        return;
      }
      try {
        const response = await this.$axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${this.searchQueryDirection}&viewbox=-73.415435,-55.25,-34.458228,-17.522381&bounded=1&limit=3`);
        this.suggestions = response.data;
      } catch (error) {
        console.error('Error obteniendo sugerencias:', error);
      }
    },
    selectSuggestion(suggestion) {
      this.searchQueryDirection = suggestion.display_name;
      const lat = parseFloat(suggestion.lat);
      const lon = parseFloat(suggestion.lon);
      this.$emit('locationFound', { lat, lon });
      this.suggestions = []; // Limpiar las sugerencias después de seleccionar una
      this.searchLocation();
    },
    async search() {
      try {
        console.log('searchQuery:', this.searchQuery);
        if (!this.searchQuery || this.searchQuery.trim() === '') {
          console.warn('La búsqueda está vacía');
          return;
        }
        const response = await this.$axios.get(`${API_BASE_URL}/api/coordinatesOfOneCell?query=${encodeURIComponent(this.searchQuery)}`);
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const { LATITUD, LONGITUD } = response.data[0];
          // Emitir marcador rojo para sitio buscado
          this.markerForLatitudLongitudSearch = { lat: LATITUD, lng: LONGITUD };
          this.$emit('updateMarkerForLatitudLongitudSearch', this.markerForLatitudLongitudSearch);
          this.mapInstance.setView([LATITUD, LONGITUD], 15);
        } else {
          console.error('No se encontraron coordenadas o el formato de datos es incorrecto.');
        }
      } catch (error) {
        console.error('Error en la búsqueda:', error);
      }
    },
    async searchLocation() {
      if (!this.searchQueryDirection) {
        alert('Por favor, ingrese una dirección o provincia.');
        return;
      }

      try {
        const response = await this.$axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${this.searchQueryDirection}&viewbox=-73.415435,-55.25,-34.458228,-17.522381&bounded=1`
        );

        if (response.data.length > 0) {
          const location = response.data[0]; // Toma el primer resultado
          const lat = parseFloat(location.lat);
          const lon = parseFloat(location.lon);

          this.markerForLatitudLongitudSearch = { lat, lng: lon };
          this.$emit('updateMarkerForLatitudLongitudSearch', this.markerForLatitudLongitudSearch);

          this.mapInstance.setView([lat, lon], 15);
        } else {
          alert('No se encontraron resultados de la Dirección solicitada.');
        }
      } catch (error) {
        console.error('Error buscando la ubicación:', error);
        alert('Ocurrió un error al buscar la ubicación.');
      }
    },
    async searchByCoordinates() {
      try {
        const [lat, lon] = this.searchQueryCoordinates.split(',').map(coord => parseFloat(coord.trim()));
        this.markerForLatitudLongitudSearch = { lat, lng: lon };
        this.$emit('updateMarkerForLatitudLongitudSearch', this.markerForLatitudLongitudSearch);
        this.mapInstance.setView([lat, lon], 15);
      } catch (error) {
        console.error('Error en la búsqueda:', error);
      }
    },
    clearMarker() {
      this.markerForLatitudLongitudSearch = { lat: 0, lng: 0 }; // Elimina el marcador
      this.$emit('updateMarkerForLatitudLongitudSearch', this.markerForLatitudLongitudSearch);
      this.searchQueryCoordinates = ''; // Limpia el input de coordenadas
      this.searchQuery = ''; // Limpia el input de sitio
    },
  },
  created() {
    // Debounce para retrasar la ejecución de getSuggestions
    this.getSuggestions = debounce(this.getSuggestions, 300);
  }
};
</script>

<style scoped>
.header-container {
  position: absolute;
  top: 15px;
  left: 330px;
  width: 400px;
  background-color: transparent;
  padding: 5px;
  border: none;
  z-index: 1001;
  max-height: 650px;
}

.header-container-coordinates {
  position: absolute;
  top: -5px;
  left: 500px;
  width: 400px;
  background-color: transparent;
  padding: 5px;
  border: none;
  z-index: 1001;
  max-height: 650px;
}

.header-container-direction {
  position: absolute;
  top: 15px;
  left: 60px;
  width: 1000px;
  background-color: transparent;
  padding: 5px;
  border: none;
  z-index: 1000;
  max-height: 650px;
}

.suggestions-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
  border: 1px solid #ccc;
  max-height: 150px;
  overflow-y: auto;
  background-color: white;
  font-family: 'Roboto', sans-serif;
}

.suggestions-list li {
  padding: 8px;
  cursor: pointer;
  font-family: 'Roboto', sans-serif;
}

.suggestions-list li:hover {
  background-color: #f0f0f0;
}

.input-field {
  padding: 5px;
  margin-right: 5px;
  width: 250px;
}

.input-field-search {
  padding: 5px;
  margin-right: 5px;
  width: 150px;
}

.input-field-search-coordinates {
  padding: 5px;
  margin-right: 5px;
  width: 250px;
}

.clear-marker-button {
  background: none;
  border: none;
  color: red;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
}

.clear-marker-button:hover {
  color: darkred;
}
</style>