const path = require('path');
const session = require('koa-session');
const Koa = require('koa');
const favicon = require('koa-favicon');
const body = require('koa-better-body');
const { Nuxt, Builder } = require('nuxt');
const config = require('../nuxt.config.js');
const { errorHandler } = require('./middlewares/error');
const { apiHandler } = require('./middlewares/api');
const {
  SESSION_CONFIG,
  loginHandler,
  oauthHandler,
  checkHandler,
  captchaHandler,
} = require('./middlewares/login');

async function start() {
  const app = new Koa();

  config.dev = !(app.env === 'production');
  const nuxt = new Nuxt(config);
  if (config.dev) {
    const builder = new Builder(nuxt);
    await builder.build();
  }

  app.use(body());
  app.use(favicon(path.resolve(__dirname, '../static/favicon.ico')));
  // for session
  app.keys = ['secret key'];
  // for jwt
  app.use(async (ctx, next) => {
    ctx.jwtKey = 'secret key';
    await next();
  })
  app.use(session(SESSION_CONFIG, app));
  app.use(captchaHandler);
  app.use(errorHandler);
  app.use(checkHandler);
  app.use(oauthHandler);
  app.use(loginHandler);
  app.use(apiHandler);

  app.use((ctx) => {
    ctx.status = 200;
    ctx.respond = false;
    ctx.req.ctx = ctx;
    nuxt.render(ctx.req, ctx.res);
  });

  app.listen(3001);
  console.log('http server listen at 3001');
}

start();
