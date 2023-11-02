const router = require("koa-router")();
const User = require("../models/userSchema");
const Menu = require("../models/menuSchema");
const Roles = require("../models/roleSchema");
const util = require("../utils/util");
const jwt = require("jsonwebtoken");
const Counter = require("../models/counterSchema");

router.prefix("/users");
const md5 = require("md5");

router.post("/login", async (ctx, next) => {
  try {
    const { userName, userPwd } = ctx.request.body;
    // mongoose ,可以指定返回属性
    /**
     * 返回数据库指定字段，有三种方式
     * 1. 'userId userName userEmail state role deptId roleList'
     * 2. {userId:1,userName:1} // 1 选取 0 屏蔽
     * 3. select('userId')
     */
    debugger;
    const result = await User.findOne(
      {
        userName,
        userPwd,
      },
      "userId userName userEmail state role deptId roleList"
    );
    // result._doc 才是响应到的信息
    const data = result._doc;
    const token = jwt.sign(
      {
        data,
      },
      "imooc",
      { expiresIn: "1d" }
    );

    if (result) {
      data.token = token;
      ctx.body = util.success(data);
    } else {
      ctx.body = util.fail("账号或密码不正确");
    }
  } catch (err) {
    ctx.body = util.fail(`登录失败${err}`);
  }
});

// 用户列表

router.get("/list", async (ctx) => {
  const { userId, userName, state } = ctx.request.query;
  const { page, skipIndex } = util.pager(ctx.request.query);
  let params = {};
  if (userId) params.userId = userId;
  if (userName) params.userName = userName;
  if (state && state !== "0") params.state = state;
  // 根据条件查询所有用户列表
  try {
    const query = User.find(params, { _id: 0, userPwd: 0 });
    const list = await query.skip(skipIndex).limit(page.pageSize);
    const total = await User.countDocuments(params);
    ctx.body = util.success({
      page: {
        ...page,
        total,
      },
      list,
    });
  } catch (err) {
    ctx.body = util.fail(`查询异常:${err.stack}`);
  }
});

// 用户删除/批量删除
router.post("/delete", async (ctx) => {
  // 待删除的用户userId数组
  const { userIds } = ctx.request.body;
  const res = await User.updateMany({ userId: { $in: userIds } }, { state: 2 });
  if (res.matchedCount) {
    ctx.body = util.success(`成功删除${res.matchedCount}条`);
    return;
  }
  ctx.body = util.fail("删除失败");
});

// 用户新增/编辑
router.post("/operate", async (ctx) => {
  const {
    userId,
    userName,
    userEmail,
    mobile,
    job,
    state,
    roleList,
    deptId,
    action,
  } = ctx.request.body;
  if (action == "add") {
    if (!userEmail || !userName || !deptId) {
      ctx.body = util.fail("参数错误", util.CODE.PARAM_ERROR);
      return;
    }

    // 查询是否用户已经存在
    const res = await User.findOne(
      { $or: [{ userName }, { userEmail }] },
      "_id userName userEmail"
    );
    if (res) {
      ctx.body = util.fail(
        `系统监测到有重复的用户，信息如下：${res.userName}-${res.userEmail}`
      );
    } else {
      const doc = await Counter.findOneAndUpdate(
        { _id: "userId" },
        { $inc: { sequence_value: 1 } },
        { new: true }
      );
      try {
        await User.create({
          userId: doc.sequence_value,
          userEmail,
          userPwd: md5("123456"),
          userName,
          deptId,
          roleList,
          state,
          job,
          mobile,
        });
        ctx.body = util.success("用户创建成功");
      } catch (err) {
        ctx.body = util.fail(err.stack, "用户创建失败");
      }
    }
  } else {
    if (!deptId) {
      ctx.body = util.fail("部门不能为空", util.CODE.PARAM_ERROR);
      return;
    }
    try {
      const res = await User.findOneAndUpdate(
        { userId },
        { mobile, job, state, roleList, deptId }
      );
      ctx.body = util.success({}, "跟新成功");
    } catch (err) {
      ctx.body = util.fail(res.stack, "更新失败");
    }
  }
});

// 获得全部用户列表
router.get("/all/list", async (ctx) => {
  try {
    const list = await User.find({}, "userId userName userEmail");
    ctx.body = util.success(list);
  } catch (err) {
    ctx.body = util.fail(err.stack);
  }
});

// 获取用户对应的权限菜单
router.get("/getPermissionList", async (ctx) => {
  let authorization = ctx.request.headers.authorization;
  let { data } = util.decoded(authorization);
  // 因为getMenuList 为异步方法所以需要使用await进行同步--否则返回的是promise对象
  let menuList = await getMenuList(data.role, data.roleList);
  // JSON.parse(JSON.stringify())实现对引用类型的深拷贝。因为引用类型存放在堆中不进行深拷贝会影响堆中数据
  let actionList = getActionList(JSON.parse(JSON.stringify(menuList)));
  ctx.body = util.success({ menuList, actionList });
});

async function getMenuList(userRole, roleKeys) {
  let rootList = [];
  if (userRole == 0) {
    rootList = (await Menu.find({})) || [];
  } else {
    // 查找用户角色-->获取权限列表
    let roleList = (await Roles.find({ _id: { $in: roleKeys } })) || [];
    console.log(roleList);
    let permissionList = [];
    // 遍历角色，合并权限id
    roleList.map((role) => {
      let { checkedKeys, halfCheckedKeys } = role.permissionList;
      permissionList = permissionList.concat([
        ...checkedKeys,
        ...halfCheckedKeys,
      ]);
    });
    // 通过set集合将重复权限进行去重
    permissionList = [...new Set(permissionList)];
    // 通过权限列表获取菜单节点，权限列表id对应菜单_id
    rootList = await Menu.find({ _id: { $in: permissionList } });
  }
  console.log(rootList);
  return util.getTreeMenu(rootList, null, []);
}

function getActionList(list) {
  const actionList = [];
  const deep = (arr) => {
    while (arr.length) {
      let item = arr.pop();
      if (item.action) {
        item.action.map((action) => {
          actionList.push(action.menuCode);
        });
      }
      if (item.children && !item.action) {
        deep(item.children);
      }
    }
  };
  deep(list);
  return actionList;
}

module.exports = router;
