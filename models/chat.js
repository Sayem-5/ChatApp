const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = new Schema({
    participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
    messages: [{
    type: Schema.Types.ObjectId,
    ref: 'Message'
    }]
  // You can add more fields like message status, read receipt, etc. here
});

module.exports = mongoose.model('Chat', chatSchema);