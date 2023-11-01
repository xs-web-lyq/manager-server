const mongoose = require("../config/db");

const menuSchema = mongoose.Schema({
  menuType: Number,
  menuName: String,
  menuCode: String,
  path: String,
  icon: String,
  component: String,
  menuState: Number,
  parentId: [mongoose.Types.ObjectId],
  createTime: {
    type: Date,
    default: Date.now(),
  },
  updateTime: {
    type: Date,
    default: Date.now(),
  }, // 更新时间
});

module.exports = mongoose.model("menus", menuSchema, "menus");
