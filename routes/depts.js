const router = require("koa-router")();
const Dept = require("../models/deptSchema");
const utils = require("../utils/util");
router.prefix("/dept");

// 部门树形列表
router.get("/list", async (ctx) => {
  let { deptName } = ctx.request.query;
  let params = {};
  if (deptName) params.deptName = deptName;
  let rootList = await Dept.find(params);
  if (deptName) {
    ctx.body = utils.success(rootList);
  } else {
    const permissionList = getTreeDept(rootList, null, []);
    ctx.body = utils.success(permissionList);
  }
});

// 递归拼接树形列表---将节点插入到各个父节点的子节点列表中
function getTreeDept(rootList, id, list) {
  // 循环找到父节点为id的子节点并将其放入其父节点chirldren数组中
  for (let i = 0; i < rootList.length; i++) {
    let item = rootList[i];
    // item.parentId.slice()将父节点id列表截取出来防止影响原数据---转为字符类型，因为其为Buffer型数据
    if (String(item.parentId.slice().pop()) == String(id)) {
      // 数据库返回数据在_doc中存储，外层暴露有个属性的get/set方法方便存取
      list.push(item._doc);
      0;
    }
  }
  // 遍历当前层数组并添加children属性，递归调用，获得其子节点
  list.map((item) => {
    item.children = [];
    getTreeDept(rootList, item._id, item.children);
    if (item.children.length == 0) {
      delete item.children;
    }
  });
  return list;
}

// 部门操作：创建、编辑、删除
router.post("/operate", async (ctx) => {
  const { _id, action, ...params } = ctx.request.body;
  let info, res;
  try {
    if (action == "create") {
      res = Dept.create(params);
      info = "创建成功";
    } else if (action == "edit") {
      params.updateTime = new Date();
      // id是不变的不需要进行更新
      res = await Dept.findByIdAndUpdate(_id, params);
      info = "编辑成功";
    } else {
      res = await Dept.findByIdAndRemove(_id);
      // 树形结构，当删除节点有子节点是需要将子节点一并删除--- $all当包含父节点id的parentId的都将被删除
      await Dept.deleteMany({ parentId: { $all: [_id] } });
      info = "删除成功";
    }
    ctx.body = utils.success("", info);
  } catch (err) {
    ctx.body = utils.fail(err);
  }
});

module.exports = router;
