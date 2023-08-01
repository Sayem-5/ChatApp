const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const groupSchema = new Schema({
    name: {
        type: String
    },
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    messages: {
        type: Schema.Types.ObjectId,
        ref: 'GroupMessage'
    }
});

module.exports = mongoose.model('Group', groupSchema);