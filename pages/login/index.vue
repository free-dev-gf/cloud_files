<template>
  <div class="p-login">
    <a-form
      :form="form"
      :label-col="{ span: 5 }"
      :wrapper-col="{ span: 12 }"
      @submit="handleSubmit"
    >
      <a-form-item label="用户名">
        <a-input
          v-decorator="[
            'name',
            { rules: [{ required: true, message: '请输入用户名' }] },
          ]"
        />
      </a-form-item>
      <a-form-item label="密码">
        <a-input
          v-decorator="[
            'password',
            {
              rules: [{ required: true, message: '请输入密码' }],
            },
          ]"
        />
      </a-form-item>
      <a-form-item :wrapper-col="{ span: 12, offset: 5 }">
        <a-button type="primary" html-type="submit"> 注册或登录 </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script>
import axios from 'axios';
export default {
  data() {
    return {
      form: this.$form.createForm(this, { name: 'login' }),
    };
  },
  methods: {
    handleSubmit(e) {
      e.preventDefault();
      this.form.validateFields((err, values) => {
        if (!err) {
          axios
            .post('/api/login', {
              ...values,
            })
            .then((res) => {
              const { data } = res;
              if (data.code === 0) {
                location.href = '/';
              } else {
                this.$message.error(data.message);
              }
            })
            .catch((err) => {
              this.$message.error(err);
            });
        }
      });
    },
  },
};
</script>

<style scoped lang="less">
.p-login {
  margin-top: 40px;
}
</style>
