/**
 * 维护用户Id 自增长
 */

const mongoose = require("../config/db");

const userSchema = mongoose.Schema({
  _id: String,
  sequence_value: Number,
});

module.exports = mongoose.model("counter", userSchema, "counters");
