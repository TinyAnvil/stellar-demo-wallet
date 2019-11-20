<template>
<div class="loader">{{char}}</div>
</template>

<script>
import _ from 'lodash-es'

export default {
  data() {
    return {
      char: null,
      chars: ['⠁','⠂','⠃','⠄','⠅','⠆','⠇','⠈','⠉','⠊','⠋','⠌','⠍','⠎','⠏','⠐','⠑','⠒','⠓','⠔','⠕','⠖','⠗','⠘','⠙','⠚','⠛','⠜','⠝','⠞','⠟','⠠','⠡','⠢','⠣','⠤','⠥','⠦','⠧','⠨','⠩','⠪','⠫','⠬','⠭','⠮','⠯','⠰','⠱','⠲','⠳','⠴','⠵','⠶','⠷','⠸','⠹','⠺','⠻','⠼','⠽','⠾','⠿']
    }
  },
  mounted() {
    this.char = _.sample(this.chars)
    setInterval(() => this.newChar(), 100)
  },
  methods: {
    newChar() {
      const newChar = _.sample(this.chars)

      if (this.char === newChar)
        return this.newChar()

      this.char = newChar
    }
  }
}
</script>

<style lang="scss" scoped>

</style>