require('dotenv').config();

const env = process.env.APP_ENV || 'local';

// Configuración dinámica
const API_BASE_URL = env === 'prod'
  ? process.env.API_BASE_URL_PROD
  : process.env.API_BASE_URL_LOCAL;

const HOST = env === 'prod'
  ? process.env.HOST_PROD
  : process.env.HOST_LOCAL;

const PORT = env === 'prod'
  ? process.env.PORT_PROD
  : process.env.PORT_LOCAL;

export default {
  head: {
    title: 'NQMap 2.0 | by E2E',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
  },

  css: [
    '~/assets/css/global.css',
    '~/assets/styles/main.css'
  ],

  plugins: [
    { src: '~/plugins/leaflet.js', mode: 'client' },
    { src: '~/plugins/test.js', mode: 'client' }
  ],

  axios: {
    baseURL: API_BASE_URL,
    credentials: true
  },

  server: {
    host: HOST,
    port: PORT
  },

  components: true,

  buildModules: ['@nuxtjs/axios'],

  modules: [],

  build: {
    extend(config, ctx) {},
    transpile: [({ isLegacy }) => isLegacy && 'axios']
  },

  // Exponer variables al cliente si necesitas
  env: {
    API_BASE_URL,
    APP_ENV: env
  }
}
 