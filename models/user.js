const mongoose = require('mongoose');
const passportLocMon = require('passport-local-mongoose');

const Schema = mongoose.Schema;

//Friends
const friendSchema = new Schema({
    friendId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
  });

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    connectionId: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: "offline"
    },
    groups: [{
        type: Schema.Types.ObjectId,
        ref: 'Group'
    }],
    friends: [friendSchema]
});

userSchema.plugin(passportLocMon);

module.exports = mongoose.model('User', userSchema);