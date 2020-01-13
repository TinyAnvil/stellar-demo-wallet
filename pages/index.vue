<template>
<main>
  <prompt :prompt="prompt" />

  <p>Room Code: {{roomCode}}</p>

  <p v-if="nickAccount" class="nick-account">
    <strong v-html="nickAccount"></strong>
    <button class="small" @click="copyAddress">Copy Address</button>
  </p>
  
  <ul v-if="account">
    <li v-for="(balance, i) in account.balances" :key="i">
      {{balance.balance}} 
      {{balance.asset_code ? balance.asset_code : 'XLM'}}
      <span v-if="balance.asset_issuer" v-html="getNickAddress(balance.asset_issuer)"></span>
    </li>
  </ul>

  <button @click="create" v-if="!keystore">Create Account</button>

  <button @click="fund" v-if="keystore && !account && !loading.update">
    <loader v-if="loading.fund" />
    Fund Account
  </button>

  <button @click="pay" v-if="account">
    <loader v-if="loading.pay" /> 
    Make Payment
  </button>

  <button @click="trust" v-if="account">
    <loader v-if="loading.trust" />
    Trust Asset
  </button>

  <button @click="update" v-if="account">
    <loader v-if="loading.update" /> 
    Update Account
  </button>

  <button @click="copySecret" v-if="account">Copy Secret</button>

  <p class="members-title" v-if="members && members.length">Room Members</p>

  <ul class="members" v-if="members && members.length">
    <li v-for="member in members" :key="member.id">
      <h5>
        <aside>{{member.info.nickAccount || member.id}}</aside>
        <button class="small" @click="pay(member.id, 'XLM')">Pay XLM</button>
      </h5>

      <ul v-if="assets[member.id] && assets[member.id].issues">
        <li v-for="asset in assets[member.id].issues" :key="asset">
          <span>Issues</span>
          {{asset}}
          <span v-if="hasTrust(asset, member.id)">✔</span>
          <button class="small" @click="trust(asset, member.id)" v-else>Trust {{asset}}</button>
        </li>
      </ul>

      <ul v-if="assets[member.id] && assets[member.id].trusts">
        <li v-for="asset in assets[member.id].trusts" :key="`${asset.asset_code}:${asset.asset_issuer}`">
          <span>Accepts</span>
          {{asset.asset_code}}
          <span>from</span>
          <aside v-html="
            asset.asset_issuer === keystore.address 
            ? 'ME' 
            : getNickAddress(asset.asset_issuer)
          "></aside>

          <!-- If `member.id` trusts asset along with us -->
          <button class="small" @click="pay(member.id, asset.asset_code, asset.asset_issuer)" v-if="hasTrust(asset.asset_code, asset.asset_issuer)">Pay {{asset.asset_code}}</button>

          <!-- If we don't yet trust this asset and it is not issued by us -->
          <button class="small" @click="trust(asset.asset_code, asset.asset_issuer)" v-else-if="asset.asset_issuer !== keystore.address">Trust {{asset.asset_code}}</button>

          <!-- If `member.id` trusts an asset issued by us -->
          <button class="small" @click="pay(member.id, asset.asset_code, asset.asset_issuer)" v-if="asset.asset_issuer === keystore.address">Pay {{asset.asset_code}}</button>
        </li>
      </ul>
    </li>
  </ul>

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
import Pusher from 'pusher-js';

import Loader from '~/components/loader'
import Prompt from '~/components/prompt'

const Keystore = new StellarKeystore
const server = new Server('https://horizon-testnet.stellar.org')

export default {
  components: {
    Loader,
    Prompt
  },
  data() {
    return {
      keystore: null,
      nickname: null,
      account: null,
      assets: {},
      error: null,
      loading: {
        fund: false,
        pay: false,
        trust: false,
        update: false,
      },
      prompt: {
        show: false,
        message: null,
        placeholder: null
      },
      roomCode: this.$route.params.roomCode,
      killStream: null,
      presenceChannel: null
    }
  },
  computed: {
    members() {
      if (!this.presenceChannel)
        return

      let members = []
      
      this.presenceChannel.members.count // Included to get this field to update dynamically
      this.presenceChannel.members.each((member) => members.push(member))

      return _.filter(members, (member) => member.id !== this.keystore.address)
    },
    nickAccount() {
      if (
        this.nickname 
        && this.keystore
      ) return `${this.nickname}*${this.keystore.address.substr(0, 6)}`
    }
  },
  mounted() {
    this.keystore = localStorage.hasOwnProperty('KEYSTORE') ? JSON.parse(localStorage.getItem('KEYSTORE')) : null
    this.nickname = localStorage.hasOwnProperty('NICKNAME') ? localStorage.getItem('NICKNAME') : null
  },
  watch: {
    keystore() {
      if (
        this.keystore
        && !this.killStream
      ) {
        this.update()

        this.killStream = server
        .accounts()
        .accountId(this.keystore.address)
        .stream({
          onmessage: (account) => {
            this.getAssets()
            this.account = account
          }
        })
      }
    },
    account() {
      if (
        this.account 
        && !this.presenceChannel
      ) {
        const socket = new Pusher(process.env.pusherKey, {
          cluster: process.env.pusherCluster,
          authEndpoint: `${process.env.apiBaseUrl}/pusher/auth`,
          forceTLS: true,
          auth: {
            params: {
              publicKey: this.keystore.address,
              nickAccount: this.nickAccount,
            }
          }
        })

        this.presenceChannel = socket.subscribe(`presence-${this.roomCode}`)

        this.presenceChannel.bind_global((event, data) => {
          if (event === 'pusher:subscription_succeeded')
            this.getAssets()
        })
      }
    }
  },
  methods: {
    async create() {
      const pincode = await this.setPrompt('Enter a keystore pincode')
      const nickname = await this.setPrompt('Enter a nickname for yourself')

      if (!pincode)
        return

      const keypair = Keypair.random()
      const keystore = await Keystore.create(pincode, keypair)

      this.keystore = keystore.walletData

      localStorage.setItem('KEYSTORE', JSON.stringify(this.keystore))
      localStorage.setItem('NICKNAME', nickname)
    },

    fund() {
      this.error = null
      this.loading.fund = true

      this.$axios(`https://friendbot.stellar.org?addr=${this.keystore.address}`)
      .then(() => this.update())
      .catch((err) => this.error = _.get(err, 'response.data'))
      .finally(() => this.loading.fund = false)
    },

    update() {
      this.error = null
      this.loading.update = true

      server
      .accounts()
      .accountId(this.keystore.address)
      .call()
      .then((account) => this.account = account)
      .catch((err) => this.error = _.get(err, 'response.data'))
      .finally(() => this.loading.update = false)
    },

    getAssets() {
      if (!this.members)
        return

      _.each(this.members, (member) => {
        server
        .accounts()
        .accountId(member.id)
        .call()
        .then(({account_id, balances}) => _.each(_.filter(balances, (balance) => balance.asset_type !== 'native'), (balance) => {
          if (!this.assets[account_id])
            this.$set(this.assets, account_id, {})

          if (this.assets[account_id].trusts) this.assets[account_id].trusts.push({
            asset_code: balance.asset_code,
            asset_issuer: balance.asset_issuer
          })
          else this.$set(this.assets[account_id], 'trusts', [{
            asset_code: balance.asset_code,
            asset_issuer: balance.asset_issuer
          }])

          this.assets[account_id].trusts = _.uniqBy(this.assets[account_id].trusts, (balance) => `${balance.asset_code}:${balance.asset_issuer}`)
        }))

        server
        .assets()
        .forIssuer(member.id)
        .call()
        .then(({records}) => _.each(records, (record) => {
          if (!this.assets[record.asset_issuer])
            this.$set(this.assets, record.asset_issuer, {})

          if (this.assets[record.asset_issuer].issues)
            this.assets[record.asset_issuer].issues.push(record.asset_code)
          else
            this.$set(this.assets[record.asset_issuer], 'issues', [record.asset_code])

          this.assets[record.asset_issuer].issues = _.uniq(this.assets[record.asset_issuer].issues)
        }))
      })
    },

    async trust(
      asset = null,
      issuer = null
    ) {
      let instructions

      if (
        asset 
        && issuer
      ) instructions = [asset, issuer]

      else {
        instructions = await this.setPrompt('{Asset} {Issuer}')
        instructions = instructions.split(' ')
      }

      const pincode = await this.setPrompt('Enter your keystore pincode')

      if (
        !instructions
        || !pincode
      ) return

      this.error = null
      this.loading.trust = true

      Keystore
      .keypair(this.keystore, pincode)
      .then((keypair) => {
        keypair = Keypair.fromSecret(keypair.secret())

        return server.accounts()
        .accountId(keypair.publicKey())
        .call()
        .then(({sequence}) => {
          const account = new Account(keypair.publicKey(), sequence)
          const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET
          })
          .addOperation(Operation.changeTrust({
            asset: new Asset(instructions[0], instructions[1])
          }))
          .setTimeout(0)
          .build()

          transaction.sign(keypair)
          return server.submitTransaction(transaction)
        })
      })
      .then((res) => console.log(res))
      .catch((err) => this.error = _.get(err, 'response.data', err))
      .finally(() => {
        this.loading.trust = false
        this.update()
      })
    },

    async pay(
      destination = null,
      asset = null, 
      issuer = null
    ) {
      let instructions

      if (
        destination
        && asset 
      ) {
        instructions = await this.setPrompt(`How much ${asset} to pay?`)
        instructions = [instructions, asset, destination, issuer]
      }

      else {
        instructions = await this.setPrompt('{Amount} {Asset} {Destination}')
        instructions = instructions.split(' ')

        if (!/xlm/gi.test(instructions[1]))
          instructions[3] = await this.setPrompt(`Who issues the ${instructions[1]} asset?`, 'Enter ME to refer to yourself')
      }

      const pincode = await this.setPrompt('Enter your keystore pincode')

      if (
        !instructions
        || !pincode
      ) return

      this.error = null
      this.loading.pay = true

      Keystore
      .keypair(this.keystore, pincode)
      .then((keypair) => {
        keypair = Keypair.fromSecret(keypair.secret())

        if (/me/gi.test(instructions[3]))
          instructions[3] = keypair.publicKey()

        return server.accounts()
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
      })
      .then((res) => console.log(res))
      .catch((err) => this.error = _.get(err, 'response.data', err))
      .finally(() => {
        this.loading.pay = false
        this.update()
      })
    },

    hasTrust(asset, issuer) {
      if (this.account)
        return !!_.find(this.account.balances, {asset_code: asset, asset_issuer: issuer})
    },

    async copySecret() {
      const pincode = await this.setPrompt('Enter your keystore pincode')

      if (!pincode)
        return

      this.error = null

      Keystore
      .keypair(this.keystore, pincode)
      .then((keypair) => copy(keypair.secret()))
      .catch((err) => this.error = err)
    },

    copyAddress() {
      copy(this.keystore.address)
    },

    getNickAddress(asset_issuer) {
      const member = _.find(this.members, {id: asset_issuer})

      if (member)
        return member.info.nickAccount
      else
        return `${asset_issuer.substr(0, 4)}...${asset_issuer.substr(asset_issuer.length - 4, asset_issuer.length)}`
    },

    setPrompt(
      message = null, 
      placeholder = null
    ) {
      this.prompt.show = true
      this.prompt.message = message
      this.prompt.placeholder = placeholder

      return new Promise((resolve, reject) => { 
        this.prompt.resolve = resolve
        this.prompt.reject = reject
      })
    }
  }
}
</script>

<style lang="scss" scoped>
main {
  padding: 20px;
  position: relative;
}
li:last-of-type {
  margin-bottom: 0;
}
li span {
  color: darkgray;
  font-size: 12px;
}
p {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nick-account {
  display: flex;
  align-items: center;
  
  button {
    margin: 0 0 0 10px;
  }
}

.members-title {
  margin-top: 20px;
}
.members {
  background-color: whitesmoke;
  padding: 20px 10px;
  max-width: 800px;

  h5 {
    display: flex;
    align-items: center;

    aside {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  ul:last-of-type {
    margin-bottom: 0;
  }
  > li {
    margin-bottom: 20px;

    ul:first-of-type {
      margin-top: 5px;
    }
    &:last-of-type {
      margin-bottom: 0;
    }
  }
  li {

    span {
      margin: 0 10px;

      &:first-of-type {
        margin-left: 0;
      }
    }
    ul li {
      display: flex;
      height: 20px;
      align-items: flex-end;
    }
  }
  button {
    margin: 0 0 0 10px;
  }
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
