/**
 * @description 通用工具函数 --> 积极推动服务端规范化返回状态码一致性
 * @author 刘永奇
 */
const log4js = require("./log4j");
const jwt = require("jsonwebtoken");

const CODE = {
  SUCCESS: 200,
  PARAM_ERROR: 10001, // 参数错误
  USER_ACCOUNT_ERROR: 20001, //账号或密码错误
  USER_LOGIN_ERROR: 30001, // 用户未登录
  BUSINESS_ERROR: 40001, //业务请求失败
  AUTH_ERROR: 50001, //认证失败或TOKEN过期
};

module.exports = {
  pager({ pageNum = 1, pageSize = 10 }) {
    pageNum *= 1;
    pageSize *= 1;
    const skipIndex = (pageNum - 1) * pageSize;
    return {
      page: {
        pageNum,
        pageSize,
      },
      skipIndex,
    };
  },
  success(data = "", msg = "", code = CODE.SUCCESS) {
    log4js.debug(data);
    return { code, data, msg };
  },
  fail(msg = "", code = CODE.BUSINESS_ERROR, data = "") {
    log4js.debug(msg);
    return { code, data, msg };
  },
  CODE,
  decoded(authorization) {
    if (authorization) {
      let token = authorization.split(" ")[1];
      return jwt.verify(token, "imooc");
    }
    return "";
  },
  // 递归拼接树形列表---将节点插入到各个父节点的子节点列表中
  getTreeMenu(rootList, id, list) {
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
      // 不是全局方法而是挂载到对象上的需要使用this进行调用
      this.getTreeMenu(rootList, item._id, item.children);
      if (item.children.length == 0) {
        delete item.children;
      } else if (item.children[0].menuType == 2) {
        // 快速区分按钮和菜单，用于后期快速区分按钮菜单权限控制
        item.action = item.children;
      }
    });
    return list;
  },
};
