const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupMessageSchema = new Schema({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group'
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  receivers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  content: {
    type: String
  },
  date: {
    type: String
  },
  time: {
    type: String
  }
});

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
