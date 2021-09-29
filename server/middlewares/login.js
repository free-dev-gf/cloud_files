const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const svgCaptcha = require('svg-captcha');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../model');

const client_id =
  process.env.NODE_ENV === 'production'
    ? 'a9d25eddecff0fceaa7b'
    : '567ced6cbeb2cce6d5f1';
const client_secret =
  process.env.NODE_ENV === 'production'
    ? '5a506747762da76807613b4d9bc824c81228f00c'
    : '74cf2b78754fadaf5356e10dfdce2f9244f15b95';

const redisClient = redis.createClient(6379, '127.0.0.1');
redisClient.on('error', (err) => {
  console.log(err);
});
const getRedisVal = promisify(redisClient.get).bind(redisClient);

// 内存方式管理session
const RAMStore = {
  storage: {},
  get(key) {
    return this.storage[key];
  },
  set(key, sess) {
    this.storage[key] = sess;
  },
  destroy(key) {
    delete this.storage[key];
  },
};

// redis方式管理session
const RedisStore = {
  /* eslint-disable */
  get: async function (key) {
    return JSON.parse(await getRedisVal(key));
  },
  set(key, sess) {
    redisClient.set(key, JSON.stringify(sess), redisClient.print);
  },
  destroy(key) {
    redisClient.del(key);
  },
};

module.exports.SESSION_CONFIG = {
  key: 'login',
  maxAge: 36000000, // 10小时
  autoCommit: true,
  overwrite: true,
  httpOnly: true,
  signed: true,
  rolling: false,
  renew: false,
  secure: false,
  sameSite: null,
  // store: RAMStore,
  store: RedisStore,
};

// 请求接口前先做登录态校验
module.exports.checkHandler = async (ctx, next) => {
  if (ctx.request.path.match(/^\/api/) && ctx.request.path !== '/api/login') {
    console.log('ctx.request.path', ctx.request.path);
    if (ctx.request.header.referer && ctx.request.header.referer.slice(0, -1) !== ctx.request.origin) {
      ctx.throw(401, 'referer forbidden');
      return;
    }
    const token = ctx.request.get('token');
    const { logined } = ctx.session.login;
    if (token) {
      const { username } = jwt.verify(token, ctx.jwtKey);
      const userItem = await User.findOne({ name: username });
      if (userItem) {
        ctx.state.user = username;
        return await next();
      }
      ctx.throw(401, 'not login');
      return;
    }
    if (logined) {
      return await next();
    } else {
      ctx.throw(401, 'not login');
      return;
    }
  }
  await next();
};

// 用户注册登录
module.exports.loginHandler = async (ctx, next) => {
  if (ctx.request.path === '/api/login') {
    const { name, password, captcha } = ctx.request.fields;
    if (!name || !password) {
      ctx.body = JSON.stringify({
        message: '用户名和密码不能为空',
        code: -1,
      });
      return;
    }
    if (name.startsWith('github_')) {
      ctx.body = JSON.stringify({
        message: '用户名不能以 github_ 开头',
        code: -2,
      });
      return;
    }
    const uuid = ctx.cookies.get('uuid');
    const val = await getRedisVal(uuid);
    redisClient.del(uuid);
    if (captcha !== val.toLocaleLowerCase()) {
      ctx.body = JSON.stringify({
        message: '验证码错误或已过期',
        code: -3,
      });
      return;
    }
    let logined = false;
    const userItem = await User.findOne({ name });
    if (userItem) {
      // 已注册
      if (userItem.password === password) {
        logined = true;
      } else {
        ctx.body = JSON.stringify({
          message: '用户名已存在或密码错误',
          code: -2,
        });
        return;
      }
    } else {
      // 未注册
      const newUser = new User({ name, password });
      await newUser.save();
      logined = true;
      fs.mkdirSync(path.resolve(__dirname, '../../files/', name));
    }
    ctx.session.login = { logined, name };
    if (logined) {
      ctx.body = JSON.stringify({
        message: 'success',
        code: 0,
        data: { name },
      });
    }
  }
  await next();
};

// oauth登录
module.exports.oauthHandler = async (ctx, next) => {
  if (ctx.request.path === '/oauth/redirect') {
    const code = new URLSearchParams(ctx.request.query).get('code');
    const tokenResponse = await axios({
      method: 'post',
      url:
        'https://github.com/login/oauth/access_token?' +
        `client_id=${client_id}&` +
        `client_secret=${client_secret}&` +
        `code=${code}`,
      headers: {
        accept: 'application/json',
      },
    }).catch((err) => {
      console.log(err);
    });
    const { access_token } = (tokenResponse && tokenResponse.data) || {};
    if (access_token) {
      const result = await axios({
        method: 'get',
        url: `https://api.github.com/user`,
        headers: {
          accept: 'application/json',
          Authorization: `bearer ${access_token}`,
        },
      });
      const { login } = result.data;
      const name = `github_${login}`;
      const userItem = await User.findOne({ name });
      if (!userItem) {
        // 未注册
        const newUser = new User({ name, password: '' });
        await newUser.save();
        fs.mkdirSync(path.resolve(__dirname, '../../files/', name));
      }
      const token = jwt.sign({ username: name }, ctx.jwtKey);
      const time = new Date();
      time.setHours(time.getHours() + 8 + 10);
      ctx.cookies.set('oauthToken', token, {
        expires: time,
        httpOnly: false,
      });
      ctx.response.redirect(`/`);
      return;
    }
    ctx.throw(400, 'oauth login failed');
  }
  await next();
};

// 生成验证码
module.exports.captchaHandler = async (ctx, next) => {
  if (ctx.request.path === '/captcha') {
    const captcha = svgCaptcha.create();
    const uuid = uuidv4();
    redisClient.set(uuid, captcha.text.toLocaleLowerCase(), redisClient.print);
    redisClient.expire(uuid, 120);
    ctx.cookies.set('uuid', uuid, {
      httpOnly: true,
    });
    ctx.body = captcha.data;
    return;
  }
  await next();
};
