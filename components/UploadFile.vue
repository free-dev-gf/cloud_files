<template>
  <div class="c-upload-file" @dragover="handleDragOver" @drop="handleDrop">
    <div v-if="file !== null" class="c-upload-file-sub">
      <span class="c-upload-file-name">{{ file.name }}</span>
      <div class="c-upload-file-loading">uploading...</div>
    </div>
    <div v-else class="c-upload-file-sub" @click="chooseFile">
      <a-icon type="file-add" style="font-size: 40px" />
      <span class="c-upload-file-tip">点击选择文件或拖拽上传</span>
      <input
        ref="inputRef"
        type="file"
        style="display: none"
        @change="handleFileChange"
      />
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      file: null,
    };
  },
  methods: {
    handleDragOver(e) {
      e.preventDefault();
    },
    handleDrop(e) {
      e.preventDefault();
      if (this.file) {
        return;
      }
      const file = e.dataTransfer.files[0];
      if (!file) {
        return;
      }
      this.file = file;
      this.uploadFile();
    },
    uploadFile() {
      const form = new FormData();
      form.append('file', this.file);
      axios.post('/api/file/upload', form).then((res) => {
        const { message, code } = res.data;
        if (code !== 0) {
          this.$message.info(message);
        }
        setTimeout(() => {
          this.$emit('fresh');
          this.file = null;
        }, 1000);
      });
    },
    chooseFile() {
      this.$refs.inputRef.click();
    },
    handleFileChange(e) {
      const file = e.target.files[0];
      if (!file) {
        return;
      }
      this.file = file;
      this.uploadFile();
    },
  },
};
</script>

<style scoped lang="less">
.c-upload-file {
  border: 1px dashed #ccc;
  margin: 20px;
  width: 300px;
  height: 200px;
  cursor: pointer;
  flex: none;
  &-sub {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  &-name {
    font-size: 20px;
    font-weight: bold;
  }
  &-loading {
    font-size: 14px;
    color: #aaa;
  }
  &-tip {
    margin-top: 10px;
    font-size: 14px;
  }
}
</style>
