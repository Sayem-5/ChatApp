const mongoose = require('mongoose');
const Schema = mongoose.Schema; 

const messageSchema = new Schema({
    sender:{
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    receiver:{
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    content:{
        type: String
    },
    date:{
        type: String
    },
    time:{
        type: String
    }
});

module.exports = mongoose.model('Message', messageSchema);