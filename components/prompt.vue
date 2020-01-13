<template>
<div class="prompt-wrapper" v-if="prompt.show">
  <div class="prompt">
    <p v-if="prompt.message" v-html="prompt.message"></p>
    <input ref="input" type="text" v-model="input" :placeholder="prompt.placeholder" @keyup.enter="submit" @keyup.esc="cancel">

    <div class="actions">
      <button class="cancel" @click="cancel">Cancel</button>
      <button class="submit" @click="submit">OK</button>
    </div>
  </div>
</div>
</template>

<script>
export default {
  props: ['prompt'],
  data() {
    return {
      input: null
    }
  },
  watch: {
    'prompt.show'() {
      if (this.prompt.show) {
        this.input = null
        this.$nextTick(() => this.$refs.input.focus())
      } 
      
      else {
        this.prompt.message = null
        this.prompt.placeholder = null
      }
    }
  },
  methods: {
    cancel() {
      this.prompt.show = false
      this.prompt.reject(null)
    },
    submit() {
      this.prompt.show = false
      this.prompt.resolve(this.input.toUpperCase())
    }
  }
}
</script>

<style lang="scss" scoped>
.prompt-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  align-content: center;
  min-height: 100vh;
  min-width: 100vw;
  background-color: rgba(black, 0.2);
}
.prompt {
  background-color: white;
  padding: 20px;
  max-width: 350px;
  width: 100%;
  position: relative;

  input {
    width: 100%;
    margin: 0;
    padding: 5px;
    outline: none;
    border: 1px solid black;
    text-transform: uppercase;

    &:focus {
      border-color: blue;
    }
  }
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;

  button {
    margin: 0;
    min-width: 50px;
  }
  .cancel {
    background: none;
    border: 1px solid blue;
    color: blue;
  }
  .submit {
    margin-left: 10px;
  }
}
</style>