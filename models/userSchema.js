const mongoose = require("../config/db");

const userSchema = mongoose.Schema({
  userId: Number, // 用户id 自增长
  userName: String, // 用户名
  userPwd: String, // 用户密码
  userEmail: String, // 用户邮箱
  mobile: String, // 电话号
  sex: Number, // 性别 0：男 1 ：女
  deptId: [], // 部门
  job: String, // 职位
  state: {
    type: Number,
    default: 1,
  }, // 1：在职 2：离职 3：试用期
  role: {
    type: Number,
    default: 1,
  }, // 用户角色 0：系统管理员 1：普通用户
  roleList: [], //系统角色
  createTime: {
    type: Date,
    default: Date.now(),
  },
  lastLoginTime: {
    type: Date,
    default: Date.now(),
  },
  remark: String, //扩展
});

module.exports = mongoose.model("users", userSchema, "users");
