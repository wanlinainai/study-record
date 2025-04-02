<template>
  <div class="person">
    <h2>姓名；{{ name }}</h2>
    <h2>年龄：{{ age }}</h2>
  </div>
</template>

<script>
import { defineComponent } from '@vue/composition-api'

export default defineComponent({
  name: 'Person',
  setup() {
    let name = '张三'
    let age = 18
    let tel = '17122228833'
  },
})
</script>

<style scoped></style>
