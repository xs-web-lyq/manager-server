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
  const permissionList = getTreeMenu(rootList, null, []);

  ctx.body = utils.success(permissionList);
});

// 递归拼接树形列表---将节点插入到各个父节点的子节点列表中
function getTreeMenu(rootList, id, list) {
  // 循环找到父节点为id的子节点并将其放入其父节点chirldren数组中
  for (let i = 0; i < rootList.length; i++) {
    let item = rootList[i];
    // item.parentId.slice()将父节点id列表截取出来防止影响原数据---转为字符类型，因为其为Buffer型数据
    if (String(item.parentId.slice().pop()) == String(id)) {
      // 数据库返回数据在_doc中存储，外层暴露有个属性的get/set方法方便存取
      list.push(item._doc);
    }
  }
  // 遍历当前层数组并添加children属性，递归调用，获得其子节点
  list.map((item) => {
    item.children = [];
    getTreeMenu(rootList, item._id, item.children);
    if (item.children.length == 0) {
      delete item.children;
    } else if (item.children[0].menuType == 2) {
      // 快速区分按钮和菜单，用于后期快速区分按钮菜单权限控制
      item.action = item.children;
    }
  });
  return list;
}

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
