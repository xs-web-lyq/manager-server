const router = require("koa-router")();
const User = require("../models/userSchema");
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

module.exports = router;
