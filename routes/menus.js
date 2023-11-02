const router = require("koa-router")();
const Menu = require("../models/menuSchema");
const utils = require("../utils/util");
router.prefix("/menu");

router.get("/list", async (ctx) => {
  const { menuName, menuState } = ctx.request.query;
  const params = {};
  if (menuName) params.menuName = menuName;
  if (menuState) params.menuState = menuState;
  let rootList = (await Menu.find(params)) || [];
  const permissionList = utils.getTreeMenu(rootList, null, []);
  ctx.body = utils.success(permissionList);
});

router.post("/operate", async (ctx) => {
  const { _id, action, ...params } = ctx.request.body;
  let res, info;
  try {
    if (action == "add") {
      res = await Menu.create(params);
      info = "创建成功";
    } else if (action == "edit") {
      params.updateTime = new Date();
      res = await Menu.findByIdAndUpdate(_id, params);
      info = "编辑成功";
    } else {
      res = await Menu.findByIdAndRemove(_id);
      Menu.deleteMany({ parentId: { $all: [_id] } });
      info = "删除成功";
    }
    ctx.body = utils.success(res, info);
  } catch (err) {
    ctx.body = utils.fail(err);
  }
});

module.exports = router;
