# Stellar Room Wallet

## Room
https://stellar-room-wallet.now.sh

## Build Setup

``` bash
# install dependencies
$ yarn install

# run client with hot reload at localhost:3000
$ yarn dev:client

# run server with auto restart at localhost:4000
$ yarn dev:server

# build and deploy server and client for production
$ yarn deploy:client
$ yarn deploy:server
```

## Env Setup

1. [Create and add](https://gist.github.com/tyvdh/8788ec74c2358fb72da79f5b8ff5af37) a self signed localhost SSL certificate to the certs/ directory
2. Rename `env.example` to `env.yml` and update all the fields with your own service API values
3. Update the `nuxt.config.js` file `env` key to reflect your own values and urls.
4. Update the `serverless.yml` `service`, `app` and `org` keys with your own values. Alternatively you can remove the app and org keys altogether if you don't need to support stats from the serverless dashboard.

For detailed explanations on how things work, check out the [Nuxt.js](https://nuxtjs.org) & [Serverless](https://serverless.com/) docs.
