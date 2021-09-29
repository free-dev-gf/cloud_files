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
      <a-form-item label="验证码">
        <div class="p-login-captcha">
          <a-input
            v-decorator="[
              'captcha',
              {
                rules: [{ required: true, message: '请输入验证码' }],
              },
            ]"
          />
          <div class="p-login-captcha-svg" v-html="captchaSvg"></div>
        </div>
      </a-form-item>
      <a-form-item :wrapper-col="{ span: 12, offset: 5 }">
        <a-button type="primary" html-type="submit"> 注册或登录 </a-button>
        <a-button @click="loginWithGithub" style="margin-left: 20px"> GitHub登录 </a-button>
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
      captchaSvg: null,
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
                if (data.code === -3) {
                  this.getCaptchaSvg();
                }
              }
            })
            .catch((err) => {
              this.$message.error(err);
            });
        }
      });
    },
    loginWithGithub() {
      const client_id = location.host === '127.0.0.1:3001' ? '567ced6cbeb2cce6d5f1' : 'a9d25eddecff0fceaa7b';
      location.href = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${location.origin}/oauth/redirect`;
    },
    async getCaptchaSvg() {
      const res = await axios.get('./captcha');
      this.captchaSvg = res.data;
    }
  },
  mounted() {
    this.getCaptchaSvg();
  },
};
</script>

<style scoped lang="less">
.p-login {
  padding: 40px;
  &-captcha {
    display: flex;
    position: relative;
    top: 5px;
    &-svg {
      margin-top: -10px;
      margin-left: 20px;
    }
  }
}
</style>
