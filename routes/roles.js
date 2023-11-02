const router = require("koa-router")();
const Roles = require("../models/roleSchema");
const utils = require("../utils/util");
router.prefix("/roles");

// 查询所有角色列表
router.get("/allList", async (ctx) => {
  try {
    const list = await Roles.find({}, "_id roleName");
    ctx.body = utils.success(list);
  } catch (err) {
    ctx.body = utils.fail(`查询失败${er.stack}`);
  }
});

// 按页获取角色列表
router.get("/list", async (ctx) => {
  let params = {};
  const { roleName } = ctx.request.query;
  if (roleName) params.roleName = roleName;
  const { page, skipIndex } = utils.pager(ctx.request.query);
  try {
    const query = Roles.find(params);
    const list = await query.skip(skipIndex).limit(page.pageSize);
    const total = await Roles.countDocuments(params);
    ctx.body = utils.success({
      page: {
        ...page,
        total,
      },
      list,
    });
  } catch (err) {
    ctx.body = utils.fail(`获取角色列表失败`);
  }
});

// 角色操作：常见、编辑和删除
router.post("/operate", async (ctx) => {
  const { _id, roleName, remark, action } = ctx.request.body;
  let res, info;
  try {
    if (action == "create") {
      res = await Roles.create({
        roleName,
        remark,
      });
      info = "创建成功";
    } else if (action == "edit") {
      if (_id) {
        let params = { roleName, remark };
        params.updateTime = new Date();
        console.log(params);
        res = await Roles.findByIdAndUpdate(_id, params);
        info = "编辑成功";
      } else {
        ctx.body = utils.fail("缺少参数params:_id");
        return;
      }
    } else {
      if (_id) {
        res = await Roles.deleteOne({ _id });
        info = "删除成功";
      } else {
        ctx.body = utils.fail("缺少参数params:_id");
        return;
      }
    }
    ctx.body = utils.success(res, info);
  } catch (err) {
    ctx.body = utils.fail(`${err}`);
  }
});

// 权限设置
router.post("/update/permission", async (ctx) => {
  const { _id, permissionList } = ctx.request.body;
  try {
    let params = { permissionList, update: new Date() };
    let res = await Roles.findByIdAndUpdate(_id, params);
    ctx.body = utils.success("", "权限设置成功");
  } catch (err) {
    ctx.body = utils.fail("权限设置失败");
  }
});

module.exports = router;
