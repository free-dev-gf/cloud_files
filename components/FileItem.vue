<template>
  <div class="c-file-item">
    <div v-for="item in desc" :key="item.name" class="c-file-item-info">
      {{ item.name }}: 
      {{ item.value }}
    </div>
    <div class="c-file-item-btns">
      <a-button :loading="loading" @click="donwloadFile">下载</a-button>
      <a-button type="danger" @click="$emit('delete', info)">删除</a-button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

// 在 iPad 上 safari chrome 均无法正常下载
// 在 Mac，iPhone 上 safari 可以正常下载
const saveAs = (blob, filename) => {
  const link = document.createElement('a');
  const body = document.querySelector('body');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  body.appendChild(link);
  link.click();
  body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
};

export default {
  props: {
    info: { type: Object, default: () => {} },
  },
  data() {
    return {
      loading: false,
    }
  },
  computed: {
    desc() {
      const { name, createTime, id, size } = this.$props.info;
      return [
        {
          name: 'id',
          value: id,
        },
        {
          name: '文件名称',
          value: name,
        },
        {
          name: '上传时间',
          value: new Date(createTime).toLocaleString(),
        },
        {
          name: '文件大小',
          value: `${(size / 1024).toFixed(2)}KB`,
        },
      ];
    },
  },
  methods: {
    donwloadFile() {
      this.loading = true;
      axios
        .post(
          '/api/file/download',
          {
            id: this.$props.info.id,
          },
          { responseType: 'blob' }
        )
        .then((res) => {
          this.loading = false;
          saveAs(res.data, this.$props.info.name);
        });
    },
  },
};
</script>

<style scoped lang="less">
.c-file-item {
  flex: none;
  padding: 20px;
  margin: 20px;
  border-radius: 20px;
  width: 300px;
  height: 200px;
  box-shadow: 1px 1px 3px 0 #ccc;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  &-info {
    display: -webkit-box;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 2;
    word-break: break-all;
    -webkit-box-orient: vertical;
  }
  &-btns {
    text-align: right;
  }
}
</style>
