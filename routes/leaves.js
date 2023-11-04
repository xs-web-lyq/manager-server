const router = require("koa-router")();
const Leaves = require("../models/leavesSchema");
const Dept = require("../models/deptSchema");
const util = require("../utils/util");

router.prefix("/leave");

router.get("/list", async (ctx) => {
  const { applyState, type } = ctx.request.query;

  const { page, skipIndex } = util.pager(ctx.request.query);
  // 获得token
  let authorization = ctx.request.headers.authorization;
  // 解密token获取用户信息--- 获取当前用户的数据
  let { data } = util.decoded(authorization);

  try {
    let params = {};

    if (type == "approve") {
      if (applyState == 1 || applyState == 2) {
        // 当前用户看到的是需要自己进行审批的待审批申请
        params.curAuditUserName = data.userName;
        params.$or = [{ applyState: 1 }, { applyState: 2 }];
      } else if (applyState > 2) {
        // 当大于以则根据审批状态和审批流中是否存在自己这一级进行显示
        params = { "auditFlows.userId": data.userId, applyState };
      } else {
        params = { "auditFlows.userId": data.userId };
      }
    } else {
      // 整合参数，在mongoDB中嵌套数据查询比较麻烦需要使用点语法进行查询
      params = {
        "applyUser.userId": data.userId,
      };
      if (applyState) params.applyState = applyState;
    }

    // 获取数据---> 通过await之后查询返回的数据就不是promise了，而是一个真实数据 -->所以在这里不能进行通过同步
    const query = Leaves.find(params);

    // 根据分页进行数据的截取
    const list = await query.skip(skipIndex).limit(page.pageSize);
    // 获取查询到数据的总条数
    const total = await Leaves.countDocuments(params);
    ctx.body = util.success({
      page: {
        ...page,
        total,
      },
      list,
    });
  } catch (err) {
    ctx.body = util.fail(err);
  }
});

router.post("/operate", async (ctx) => {
  const { _id, action, ...params } = ctx.request.body;
  let authorization = ctx.request.headers.authorization;
  let { data } = util.decoded(authorization);

  try {
    if (action === "create") {
      let orderNo = "XJ";
      // 生成表单日期
      orderNo += util.formateDate(new Date(), "yyyyMMdd");
      // 获取总申请数目
      const total = await Leaves.countDocuments();
      params.orderNo = orderNo + total;

      // 获取用户当前部门ID
      let id = data.deptId.pop();
      // 查找负责人信息
      let dept = await Dept.findById(id);
      // 获取人事部门和财务部门负责人信息
      let userList = await Dept.find({
        deptName: { $in: ["人事部", "财务部"] },
      });
      let auditUsers = dept.userName;
      let auditFlows = [
        {
          userId: dept.userId,
          userName: dept.userName,
          userEmail: dept.userEmail,
        },
      ];
      userList.map((item) => {
        auditFlows.push({
          userId: item.userId,
          userName: item.userName,
          userEmail: item.userEmail,
        });
        auditUsers += `,${item.userName}`;
      });
      params.auditUsers = auditUsers;
      params.curAuditUserName = dept.userName;
      params.auditLogs = [];
      params.auditFlows = auditFlows;
      params.applyUser = {
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
      };
      let res = await Leaves.create(params);
      ctx.body = util.success("", "创建成功");
    } else {
      let res = await Leaves.findByIdAndUpdate(_id, { applyState: 5 });
      ctx.body = util.success("", "删除成功");
    }
  } catch (err) {}
});

router.post("/approve", async (ctx) => {
  const { _id, remark, action } = ctx.request.body;
  // 添加到申请人申请日志中，审批人的信息所以需要获得当前用户的信息--通过token获得用户信息
  let authorization = ctx.request.headers.authorization;
  let { data } = util.decoded(authorization);
  let params = {};
  try {
    // 1 :待审批 2：审批中 3：审批拒绝 4：审批通过 5：作废
    let doc = await Leaves.findById(_id);
    let auditLogs = doc.auditLogs || [];
    if (action == "refuse") {
      params.applyState = 3;
    } else {
      // 审核通过
      if (doc.auditFlows.length == doc.auditLogs.length) {
        ctx.body = util.success("当前申请单已处理，请勿重复提交");
      } else if (doc.auditFlows.length == doc.auditLogs.length + 1) {
        // 优先判断是否为最后一级
        params.applyState = 4;
      } else if (doc.auditFlows.length > doc.auditLogs.length) {
        params.applyState = 2;
        params.curAuditUserName =
          doc.auditFlows[doc.auditLogs.length + 1].userName;
      }
    }
    auditLogs.push({
      userId: data.userId,
      userName: data.userName,
      createTime: new Date(),
      remark,
      action: action == "refuse" ? "审核拒绝" : "审核通过",
    });
    params.auditLogs = auditLogs;
    let res = await Leaves.findByIdAndUpdate(_id, params);
    ctx.body = util.success("", "处理成功");
  } catch (err) {
    ctx.body = util.fail(`查询异常${err.message}`);
  }
});

router.get("/count", async (ctx) => {
  let authorization = ctx.request.headers.authorization;
  let { data } = util.decoded(authorization);
  try {
    let params = {};
    // 当当前审批人为用户时并且状态为1或者2
    params.curAuditUserName = data.userName;
    params.$or = [{ applyState: 1 }, { applyState: 2 }];
    const total = await Leaves.countDocuments(params);
    ctx.body = util.success(total);
  } catch (err) {
    ctx.body = util.fail(err);
  }
});

module.exports = router;
