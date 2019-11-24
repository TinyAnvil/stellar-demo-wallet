import path from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV !== 'production'

export default {
  mode: 'spa',
  dev: isDev,
  env: {
    apiBaseUrl: isDev ? 'https://localhost:4000' : 'https://l99is9axvd.execute-api.us-east-1.amazonaws.com/dev',
    pusherKey: 'd79f9585202c97a316b4',
    pusherCluster: 'us2'
  },

  /*
  ** Headers of the page
  */
  head: {
    title: 'Stellar Demo Wallet',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, height=device-height, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' },
    ],
    link: [
    ]
  },
  /*
  ** Customize the progress-bar color
  */
  loading: false,
  loadingIndicator: {
    name: 'circle',
    color: 'darkgray',
    background: 'white'
  },
  /*
  ** Global CSS
  */
  css: [
    '~/assets/scss/style.scss'
  ],
  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
  ],
  /*
  ** Nuxt.js dev-modules
  */
  buildModules: [
  ],
  /*
  ** Nuxt.js modules
  */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
  ],
  /*
  ** Axios module configuration
  ** See https://axios.nuxtjs.org/options
  */
  axios: {
  },
  /*
  ** Build configuration
  */
  build: {
    /*
    ** You can extend webpack config here
    */
    extend (config, ctx) {
    }
  },
  router: {
    middleware: ['root-redirect'],
    extendRoutes(routes, resolve) {
      routes.push({
        name: 'room',
        path: '/:roomCode',
        component: resolve(__dirname, 'pages/index.vue')
      })
    }
  },
  server: isDev ? {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, './certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, './certs/cert.pem'))
    }
  } : null
}
