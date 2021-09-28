const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const redis = require('redis');
const session = require('koa-session');
const Koa = require('koa');
const app = new Koa();
const body = require('koa-better-body');
const { Nuxt, Builder } = require('nuxt');
const config = require('../nuxt.config.js');
const { User, File } = require('./model');

config.dev = !(app.env === 'production');

const redisClient = redis.createClient(6379, '127.0.0.1');
redisClient.on('error', (err) => {
  console.log(err);
});
const getAsync = promisify(redisClient.get).bind(redisClient);

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
    return JSON.parse(await getAsync(key));
  },
  set(key, sess) {
    redisClient.set(key, JSON.stringify(sess), redisClient.print);
  },
  destroy(key) {
    redisClient.del(key);
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 最大10M

async function start() {
  const nuxt = new Nuxt(config);
  if (config.dev) {
    const builder = new Builder(nuxt);
    await builder.build();
  }

  app.use(body());

  app.keys = ['secret key'];

  const CONFIG = {
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

  app.use(session(CONFIG, app));

  const serverPath = [
    '/api/login',
    '/api/data',
    '/api/file/upload',
    '/api/file/delete',
    '/api/file/download',
  ];

  app.use(async (ctx, next) => {
    if (serverPath.includes(ctx.request.path)) {
      ctx.is('application/json');
      console.log('ctx.request.path', ctx.request.path);
      if (ctx.request.path !== '/api/login') {
        // 统一登录校验
        if (ctx.session.login && ctx.session.login.logined) {
          return await next();
        } else {
          ctx.body = JSON.stringify({ message: 'not login', code: -1 });
          return;
        }
      }
    }
    await next();
  });

  app.use(async (ctx, next) => {
    if (serverPath.includes(ctx.request.path)) {
      const getFilePath = (name) =>
        path.resolve(__dirname, '../files/', ctx.session.login.name, name);
      switch (ctx.request.path) {
        // 用户注册登录
        case '/api/login':
          // 自己种cookie
          // const time = new Date();
          // time.setHours(time.getHours() + 8);
          // time.setSeconds(time.getSeconds() + 100);
          // ctx.cookies.set('login', 'abc', {
          //   expires: time,
          //   httpOnly: true,
          // });
          const { name, password } = ctx.request.fields;
          if (!name || !password) {
            ctx.body = JSON.stringify({
              message: '用户名和密码不能为空',
              code: -1,
            });
            return;
          }
          let logined = false;
          const userItem = await User.findOne({ name });
          if (userItem) {
            if (userItem.name === name && userItem.password === password) {
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
            fs.mkdirSync(path.resolve(__dirname, '../files/', name));
          }
          ctx.session.login = { logined, name };
          if (logined) {
            ctx.body = JSON.stringify({
              message: 'success',
              code: 0,
              data: { name },
            });
          }
          break;
        case '/api/data':
          // 获取用户数据
          var res = await File.find({ user: ctx.session.login.name });
          ctx.body = JSON.stringify({
            message: 'success',
            code: 0,
            data: {
              files: res,
              name: ctx.session.login.name,
            },
          });
          break;
        case '/api/file/upload':
          // 上传文件
          var file = ctx.request.files[0];
          if (file.size > MAX_FILE_SIZE) {
            ctx.body = JSON.stringify({
              message: '文件大小不能超过10M',
              code: -1,
            });
            return;
          }
          var createTime = new Date().getTime();
          File.create({
            name: file.name,
            user: ctx.session.login.name,
            size: file.size,
            createTime,
          })
          fs.createReadStream(file.path).pipe(
            fs.createWriteStream(getFilePath(`${createTime}_${file.name}`))
          );
          ctx.body = JSON.stringify({
            message: 'success',
            code: 0,
          });
          break;
        case '/api/file/delete':
          // 删除文件
          var { id } = ctx.request.fields;
          var res = await File.findOne({ id });
          await File.deleteOne({ id });
          fs.unlinkSync(getFilePath(`${res.createTime}_${res.name}`));
          ctx.body = JSON.stringify({
            message: 'success',
            code: 0,
          });
          break;
        case '/api/file/download':
          // 下载文件
          var { id } = ctx.request.fields;
          var res = await File.findOne({ id });
          var file = fs.readFileSync(getFilePath(`${res.createTime}_${res.name}`));
          ctx.body = file;
          break;
        default:
          break;
      }
    } else {
      await next();
    }
  });

  app.use((ctx) => {
    ctx.status = 200;
    ctx.respond = false;
    ctx.req.ctx = ctx;
    nuxt.render(ctx.req, ctx.res);
  });

  app.listen(3000);
  console.log('http server listen at 3000');
}

start();
