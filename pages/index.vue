<template>
  <div class="p-home">
    <TopBar />
    <div class="p-home-sub">
      <UploadFile @fresh="getData" />
      <FileItem
        v-for="file in files"
        :key="file.id"
        :info="file"
        @delete="handleDelete"
      />
    </div>
    <a-modal
      title="确认"
      :visible="deletingFile !== null"
      @ok="deleteFile"
      @cancel="deletingFile = null"
    >
      <p>确定要删除文件【{{ deletingFile && deletingFile.name }}】吗？</p>
    </a-modal>
  </div>
</template>

<script lang="ts">
import axios from 'axios';
import Vue from 'vue';

export default Vue.extend({
  data() {
    return {
      deletingFile: null,
    };
  },
  computed: {
    files() {
      return this.$store.state.user.files;
    },
  },
  methods: {
    handleDelete(file) {
      this.deletingFile = file;
    },
    deleteFile() {
      axios
        .post('/api/file/delete', {
          id: this.deletingFile.id,
        })
        .then(() => {
          this.deletingFile = null;
          this.getData();
        });
    },
    async getData() {
      const res = await axios.get('/api/data');
      const { message, code, data } = res.data;
      if (code === 0) {
        this.$store.commit('user/updateData', data);
      } else {
        this.$message.info(message);
      }
      if (code === -1) {
        location.href = '/login';
      }
    },
  },
  async mounted() {
    this.getData();
  },
});
</script>

<style scoped lang="less">
.p-home {
  padding-top: 40px;
  height: calc(100vh - 40px);
  &-sub {
    display: flex;
    height: 100%;
    flex-flow: row wrap;
    align-content: flex-start;
  }
}
</style>
