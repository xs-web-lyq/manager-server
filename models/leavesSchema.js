const mongoose = require("mongoose");
const leaveSchema = mongoose.Schema({
  orderNo: String,
  applyTime: Number,
  applyType: Number,
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: Date.now,
  },
  applyUser: {
    userId: String,
    userName: String,
    userEmail: String,
  },
  leaveTime: String,
  reasons: String,
  auditUsers: String,
  curAuditUserName: String,
  applyState: {
    type: Number,
    default: 1,
  },
  createTime: {
    type: Date,
    default: Date.now,
  },
  auditFlows: [
    {
      userId: String,
      userName: String,
      userEmail: String,
    },
  ],
  auditLogs: [
    {
      userId: String,
      userName: String,
      createTime: Date,
      remark: String,
      action: String,
    },
  ],
});

module.exports = mongoose.model("leaves", leaveSchema, "leaves");
