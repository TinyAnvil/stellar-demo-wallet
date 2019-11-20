<template>
<main>
  <p v-if="keystore">
    <strong v-html="keystore.address"></strong>
  </p>
  
  <ul v-if="account">
    <li v-for="(balance, i) in account.balances" :key="i">
      {{balance.balance}} 
      {{balance.asset_code ? balance.asset_code : 'XLM'}}
      <span v-if="balance.asset_issuer" v-html="`${balance.asset_issuer.substr(0, 4)}...${balance.asset_issuer.substr(balance.asset_issuer.length - 4, balance.asset_issuer.length)}`"></span>
    </li>
  </ul>

  <button @click="create" v-if="!keystore">Create Account</button>
  <button @click="fund" v-if="keystore && !account">
    <loader v-if="loading.fund" />
    Fund Account
  </button>

  <button @click="pay" v-if="account">
    <loader v-if="loading.pay" /> 
    Make Payment
  </button>

  <button @click="update" v-if="account">
    <loader v-if="loading.update" /> 
    Update Account
  </button>
  <button @click="copySecret" v-if="account">Copy Secret</button>

  <pre class="error" v-html="error" v-if="error"></pre>
</main>
</template>

<script>
import { 
  Server, 
  Account, 
  Keypair, 
  TransactionBuilder, 
  Operation, 
  Networks, 
  Asset, 
  BASE_FEE 
} from 'stellar-sdk'
import { StellarKeystore } from 'stellar-keystore'
import copy from 'copy-to-clipboard'
import _ from 'lodash-es'

import Loader from '~/components/loader'

const Keystore = new StellarKeystore
const server = new Server('https://horizon-testnet.stellar.org')

export default {
  components: {
    Loader
  },
  data() {
    return {
      keystore: localStorage.hasOwnProperty('KEYSTORE') ? JSON.parse(localStorage.getItem('KEYSTORE')) : null,
      account: null,
      error: null,
      loading: {
        fund: false,
        pay: false,
        update: false,
      }
    }
  },
  mounted() {
    if (this.keystore)
      this.update()
  },
  methods: {
    async create() {
      const pincode = prompt('Enter a keystore pincode')

      if (!pincode)
        return

      const keypair = Keypair.random()
      const keystore = await Keystore.create(pincode, keypair)

      this.keystore = keystore.walletData

      localStorage.setItem('KEYSTORE', JSON.stringify(this.keystore))
    },
    async fund() {
      this.loading.fund = true

      const pubkey = await Keystore.publicKey(this.keystore)

      this.$axios(`https://friendbot.stellar.org?addr=${pubkey}`)
      .then(() => this.update())
      .catch((err) => this.error = _.get(err, 'response.data'))
      .finally(() => this.loading.fund = false)
    },
    async update() {
      this.loading.update = true

      const pubkey = await Keystore.publicKey(this.keystore)

      server
      .accounts()
      .accountId(pubkey)
      .call()
      .then((account) => this.account = account)
      .catch((err) => this.error = _.get(err, 'response.data'))
      .finally(() => this.loading.update = false)
    },
    async copySecret() {
      const pincode = prompt('Enter your keystore pincode')

      if (!pincode)
        return

      const keypair = await Keystore.keypair(this.keystore, pincode)

      copy(keypair.secret())
    },
    async pay() {
      let instructions = prompt('{Amount} {Asset} {Destination}')
          instructions = instructions.split(' ')

      if (!/xlm/gi.test(instructions[1]))
        instructions[3] = prompt(`Who issues the ${instructions[1]} asset?`)

      const pincode = prompt('Enter your keystore pincode')

      if (
        !instructions
        || !pincode
      ) return

      this.loading.pay = true

      let keypair = await Keystore.keypair(this.keystore, pincode)
          keypair = Keypair.fromSecret(keypair.secret())

      server.accounts()
      .accountId(keypair.publicKey())
      .call()
      .then(({sequence}) => {
        const account = new Account(keypair.publicKey(), sequence)
        const transaction = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET
        })
        .addOperation(Operation.payment({
          destination: instructions[2],
          asset: instructions[3] ? new Asset(instructions[1], instructions[3]) : Asset.native(),
          amount: instructions[0]
        }))
        .setTimeout(0)
        .build()

        transaction.sign(keypair)
        return server.submitTransaction(transaction)
      })
      .then((res) => console.log(res))
      .catch((err) => this.error = _.get(err, 'response.data'))
      .finally(() => {
        this.loading.pay = false
        this.update()
      })
    }
  }
}
</script>

<style>
main {
  padding: 20px;
}
p,
ul,
li,
button {
  margin-bottom: 10px;
}
li:last-of-type {
  margin-bottom: 0;
}
li span {
  color: darkgray;
  font-size: 14px;
}
strong {
  font-weight: 600;
}
button {
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  font-size: 14px;
  padding: 0 10px;
  margin: 0 0 10px;
  height: 30px;
  background: blue;
  border-radius: 0;
  color: white;
  border: none;
  outline: none;
}

.loader {
  margin-right: 10px;
}
.error {
  overflow: scroll;
  background-color: whitesmoke;
  padding: 10px;
  font-size: 12px;
  line-height: 1.2;
  max-width: 800px;
  margin-top: 20px;
}
</style>
