const router = require("koa-router")();
const Menu = require("../models/menuSchema");
const utils = require("../utils/util");
router.prefix("/menu");

router.get("/list", async (ctx) => {
  // 菜单数据获取/参数判断
  const { menuName, menuState } = ctx.request.query;
  const params = {};
  if (menuName) params.menuName = menuName;
  if (menuState) params.menuState = menuState;
  // 获取全部菜单
  let rootList = (await Menu.find(params)) || [];
  // 使用封装的递归函数将菜单进行递归拼接---此处为全部菜单
  const permissionList = utils.getTreeMenu(rootList, null, []);
  // 返回通过全新查询
  ctx.body = utils.success(permissionList);
});

router.post("/operate", async (ctx) => {
  // 通过_id , action 来判断此刻处于那种操作状态
  const { _id, action, ...params } = ctx.request.body;
  let res, info;
  try {
    if (action == "add") {
      res = await Menu.create(params);
      info = "创建成功";
    } else if (action == "edit") {
      // 更新编辑时间
      params.updateTime = new Date();
      res = await Menu.findByIdAndUpdate(_id, params);
      info = "编辑成功";
    } else {
      res = await Menu.findByIdAndRemove(_id);
      // 当删除某一菜单时，我们必须将他们下面的子菜单全部删除，所以需要将parentId中包含此菜单的全部删除
      // { parentId: { $all: [_id] } } 将parentId中包含_id的数据全部删除
      Menu.deleteMany({ parentId: { $all: [_id] } });
      info = "删除成功";
    }
    ctx.body = utils.success(res, info);
  } catch (err) {
    ctx.body = utils.fail(err);
  }
});

module.exports = router;
