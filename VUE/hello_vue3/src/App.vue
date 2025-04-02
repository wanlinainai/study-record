<template>
  <div>
    <p>
      {{ name }}--{{ age }}--{{ type }}--{{ salary }}
    </p>
    <p>
      <button @click="name += '-'">修改name</button>
      <button @click="salary++">修改薪水</button>
    </p>
  </div>
</template>

<script>
import { reactive, toRef, toRefs } from 'vue';
export default {
  name: 'App',
  setup() {
    let person = reactive({
      name: '张三',
      age: 20,
      job: {
        type: 'web开发',
        salary: 30
      }
    })

    let person1 = toRefs(person)

    let name = toRef(person, 'name')
    let age = toRef(person, 'age')
    let type = toRef(person.job, 'type')
    let salary = toRef(person.job, 'salary')
    return {
      ...person1
    }
  }
};
</script>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
