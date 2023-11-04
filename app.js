const Koa = require("koa");
const app = new Koa();
const views = require("koa-views");
const json = require("koa-json");
const onerror = require("koa-onerror");
const bodyparser = require("koa-bodyparser");
const logger = require("koa-logger");
const log4js = require("./utils/log4j");
const jwt = require("jsonwebtoken");
const koajwt = require("koa-jwt");
const util = require("./utils/util");

const users = require("./routes/users");
const menus = require("./routes/menus");
const roles = require("./routes/roles");
const depts = require("./routes/depts");
const leaves = require("./routes/leaves");
const router = require("koa-router")();

// error handler
onerror(app);

require("./config/db");

// middlewares
app.use(
  bodyparser({
    enableTypes: ["json", "form", "text"],
  })
);
app.use(json());
// 初始化配置的日志中间件----- 太过于温和所以使用了 log4js 插件进行日志打印
app.use(logger());
app.use(require("koa-static")(__dirname + "/public"));

app.use(
  views(__dirname + "/views", {
    extension: "pug",
  })
);

// logger
app.use(async (ctx, next) => {
  log4js.info(`GET params:${JSON.stringify(ctx.request.query)}`);
  log4js.info(`POST params:${JSON.stringify(ctx.request.body)}`);
  // 洋葱模型捕获下一个中间件的状态
  await next().catch((err) => {
    if (err.status == "401") {
      ctx.body = util.fail("Token认证失败", util.CODE.AUTH_ERROR);
    } else {
      throw err;
    }
  });
});
// koa-jwt-拦截验证token有效性-------当token失效后重新登录需要将登录请求过滤不进行验证token否则将永远卡在登录页
app.use(
  koajwt({ secret: "imooc" }).unless({
    path: [/^\/api\/users\/login/], //使用正则进行转义
  })
);
router.prefix("/api");

// routes

router.use(users.routes(), users.allowedMethods());
router.use(menus.routes(), menus.allowedMethods());
router.use(roles.routes(), roles.allowedMethods());
router.use(depts.routes(), depts.allowedMethods());
router.use(leaves.routes(), leaves.allowedMethods());
app.use(router.routes(), router.allowedMethods());

// error-handling
app.on("error", (err, ctx) => {
  log4js.error(`${err.stack}`);
});

module.exports = app;
