<template>
  <div class="c-top-bar">当前用户: {{ username }}</div>
</template>

<script>
export default {
  computed: {
    username() {
      return this.$store.state.user.username;
    },
  },
};
</script>

<style scoped lang="less">
.c-top-bar {
  position: fixed;
  width: 100%;
  height: 40px;
  top: 0;
  left: 0;
  line-height: 40px;
  color: #fff;
  background-color: #000;
  padding-left: 20px;
}
</style>
