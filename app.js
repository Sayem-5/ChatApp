const express = require('express');
const app = express();
const ejs = require('ejs');
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const Group = require('./models/group');
const User = require('./models/user');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const Message = require('./models/message');
const ejsMate = require('ejs-mate');
const GroupMessage = require('./models/groupMessage');
const flash = require('connect-flash');
const { isLoggedIn } = require('./middleware');
const catchAsync = require('./utils/catchAsync');
const Chat = require('./models/chat');
const methodOver = require('method-override');
//const Friend = require('./models/friend');n
//npx tailwindcss -i ./public/css/input.css -o ./public/css/output.css --watch

const port = 3000;
const onlineUsers = [];
var partial;

const sessionConfig = {
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        //expires: Date.now() + 1000 * 60 * 60 * 24,
        maxAge: 1000 * 60 * 15 
    }
};

mongoose.connect('mongodb://127.0.0.1:27017/chatApp')
  .then(() => console.log('Connected!'));

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public'))); //For serving static files
app.use(express.urlencoded({ extended: true }));
app.use(session(sessionConfig));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOver('_method'));


app.use((req, res,next) => {
    res.locals.success = req.flash('success');
    res.locals.isBlocked = false;
    next();
});

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', isLoggedIn, catchAsync(async(req, res) => {

    const currentUser = req.user;
    //console.log("User logged in:", currentUser);
    const chats = await Chat.find({ participants: currentUser._id }).populate('participants');
    // chats.forEach(chat => {
    //     console.log("Data", chat.participants); // Access participants property for each chat
    // });

    //const participantsList = chats.map(chat => chat.participants);
        
    const user = await User.findById(currentUser._id).populate('groups').populate({
        path: 'friends.friendId'
      });
    const msg = `Logged in ^_^ ${user.username}`;
    const groups = user.groups;
    const friends = user.friends;
    const users = await User.find({ _id: { $ne: currentUser._id } });
    //console.log("Frineds", friends);
    res.render('index', { currentUser, users, msg, onlineUsers, groups, friends, chats });

}));

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', catchAsync(async(req, res, next) =>{
    
    const { username, password, email } = req.body;
    const user = new User({ email, username });
    const regUser = await User.register(user, password);
    //const createFriendList = new Friend({ user: user._id });
    //await createFriendList.save();
    console.log(regUser);
    req.login(regUser, err => {
        if(err) return next(err);
        res.redirect('/');
    });

}));

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login',passport.authenticate('local', { failureRedirect: '/login' }), catchAsync(async(req, res) =>{

    req.flash('success', 'LoggedIn');

    res.redirect('/');
}));

app.get('/chats', isLoggedIn, catchAsync(async(req, res) => {

    const user = await User.findById(req.user._id).populate('groups').populate({
        path: 'friends.friendId'
      });

    const friends = user.friends;
    res.render('createChat', { friends });
}));

app.post('/createChat', catchAsync(async(req, res) => {

    const { friend } = req.body;
    const currentUser = req.user;
    const participants = [friend, currentUser._id];

    //Check if chat exists?
    participants.sort();

    // Search for a chat where the 'members' array matches the specified order
    const existingChat = await Chat.findOne({
    participants: participants,
    });

    console.log(existingChat);

    if (existingChat === null) {
        console.log('No chat found.');
        const createChat = new Chat({ participants: participants });
        await createChat.save();
        console.log('Chat created!');
        return res.redirect(`/chat/${createChat._id}`);
    } else {
        console.log('A chat already exists between the specified participants.');
    }

}));

app.get('/chat/:id', isLoggedIn , catchAsync(async(req, res) => {

    const { id } = req.params;
    const chat = await Chat.findById(id).populate('participants').populate('messages');
    const participants = chat.participants;
    //console.log("PART", participants);
    const currentUserId = req.user._id;
    //the user the currentUser is chattingto
    const userArray = participants.filter(participant => participant._id.toString() !== currentUserId.toString());
    const user = userArray[0];
    console.log("USER--------------------------------", user);
    const otherUserId = user._id;
    // const userFriends = await User.findById(currentusUser._id).populate({
    //     path: 'friends.friendId'
    //     //match:{ blocked: true }
    // });
    const [currentUser, otherUser] = await Promise.all([
        User.findById(currentUserId).populate('friends.friendId'),
        User.findById(otherUserId).populate('friends.friendId'),
      ]);
    const myFriends = currentUser.friends;
    const otherFriends = otherUser.friends;
    console.log("--------------------------Friends----------------------------", myFriends);
    const myBlockedFriends = myFriends.filter((friend) => friend.blocked === true);
    const otherBlockedFriends = otherFriends.filter((friend) => friend.blocked === true);
    console.log("------------------Blocked-------------------", myBlockedFriends);
    for(let friend of otherBlockedFriends){
        if(friend.friendId._id.toString() === currentUserId.toString()){
            res.locals.isBlocked = true;
            break;
        }else{
            res.locals.isBlocked = false;
        }
    }
    //const messages = await Message.find({ $or: [{ sender: currentUser._id, receiver: user._id }, {  receiver: currentUser._id, sender: user._id}] });
    //console.log("msg:", id, req.session.userID);
    const messages = chat.messages;
    //console.log("In chat route", messages);
    res.render('chat', { user, currentUser, messages, chat });

    // const { id } = req.params;
    // const user = await User.findById(id);
    // const u = req.session.userID;
    // const currentUser = req.user;
    // const messages = await Message.find({ $or: [{ sender: id, receiver: u }, {  receiver: id, sender: u}] });
    // console.log("msg:", id, req.session.userID);
    
    // console.log("In chat route", messages);
    // res.render('chat', { user, currentUser, messages, u });
}));

app.delete('/deleteChat', catchAsync(async(req, res) => {

    const { id } = req.body;
    //console.log("CHat to deleteeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", id);
    const deleteChat = await Chat.findByIdAndDelete(id).then(() => {
        console.log("Chat Deleted!");
    });

    res.redirect('/');
    //Check if chat exists?
    //participants.sort();

    // Search for a chat where the 'members' array matches the specified order
    // const existingChat = await Chat.findOne({
    // participants: participants,
    // });

    // console.log(existingChat);

    // if (existingChat === null) {
    //     console.log('No chat found.');
    //     const createChat = new Chat({ participants: participants });
    //     await createChat.save();
    //     console.log('Chat created!');
    //     return res.redirect(`/chat/${createChat._id}`);
    // } else {
    //     console.log('A chat already exists between the specified participants.');
    // }

}));

app.get('/createGroup', isLoggedIn , catchAsync(async(req, res) => {
    const users = await User.find({});
    const currentUser = req.user;
    const u = req.session.userID;
    res.render('createGroup', { users, currentUser, u });
}));

app.post('/createGroup', isLoggedIn, catchAsync(async(req, res) => {
    const name = req.body.name;
    const users = req.body.users;
    console.log("Users For Group:", users);
    const getUsers = await User.find({ _id: { $in: users } });
    const userIdsArray = getUsers.map(user => user._id);

    const group = new Group({ name, users: userIdsArray });
    await group.save();

    const groupId = group._id;
    const user = await User.updateMany({ id: { $in: users }, $push: { groups: groupId }});
    
    res.redirect('/');
}));

app.get('/groups', isLoggedIn, catchAsync(async(req, res) => { 
    const currentUser = req.user;
    console.log("User logged in:", currentUser);
        
    const user = await User.findById(currentUser._id).populate('groups');
    const groups = user.groups;

    res.render('groups', { currentUser, onlineUsers, groups });
}));

app.get('/group/:id', isLoggedIn, catchAsync(async(req, res) => {

    const { id } = req.params;
    var isAMember;
    const u = req.session.userID;
    const user = await User.findById(u);
    const currentUser = req.user;
    const group = await Group.findById(id).populate('users');
    const groupMessages = await GroupMessage.find({ groupId: group._id }).populate('sender');
    console.log(groupMessages);
    
    const membersArray = group.users;

    isAMember = membersArray.some((member) => member._id.toString() === currentUser._id.toString());

    //console.log("msg:", id, req.session.userID, group);

    res.render('groupChat', { currentUser, u, group, user, isAMember, groupMessages });
}));

app.get('/search', catchAsync(async(req, res) => {
    const currentUser = req.user;
    const users = await User.find({}).populate('friends.friendId');
    //const friends = users.friends.populate('friendId');
    res.render('search', { users, currentUser });
}));

app.post('/addFriend', catchAsync(async(req, res) => {
    const { addUser } = req.body;
    console.log(addUser);
    const id = req.user._id;
    //const user = await User.findById(id);
    //
    const [currentUser, otherUser] = await User.find({
        $or: [{ _id: id }, { _id: addUser }],
      }).populate('friends.friendId');
    //
    console.log(currentUser);
    const existingFriend = currentUser.friends.find((friend) => friend.friendId.toString() === addUser);
    if (existingFriend) {
      console.log('Friend already exists.');
      return res.redirect('/');
    }else{
        await currentUser.friends.push({ friendId: addUser });
        await currentUser.save();
        await otherUser.friends.push({ friendId: id });
        await otherUser.save();
        console.log('Friend Added');
        return res.redirect('/');
    }
    
}));

app.delete('/removeFriend', catchAsync(async(req, res) => {

    const { removeUser } = req.body;
    //console.log(addUser);
    const id = req.user._id;
    //const user = await User.findById(id);
    const [currentUser, otherUser] = await User.find({
        $or: [{ _id: id }, { _id: removeUser }],
      }).populate('friends.friendId');
    //console.log(user);
    const existingFriend = user.friends.find((friend) => friend.friendId.toString() === removeUser);
    if (existingFriend) {
      console.log('Friend exists.');
      //await user.friends.pull({ friendId: removeUser });
      await currentUser.friends.pull({ friendId: addUser });
      await currentUser.save();
      await otherUser.friends.pull({ friendId: id });
      await otherUser.save();
      console.log('Friend removed');
      //await user.save();
      return res.redirect('/');
    }
    else{
        console.log("Friend does not exist!");
    }
}));

app.post('/blockUser', catchAsync(async(req, res) => {

    const { blockFriend } = req.body;
    //console.log(addUser);
    const id = req.user._id;
    const user = await User.findById(id);
    console.log(user);
    const existingFriend = user.friends.find((friend) => friend.friendId.toString() === blockFriend);
    if (existingFriend) {
      console.log('Friend exists.');
      existingFriend.blocked = true;
      console.log('Friend blocked');
      await user.save();
      return res.redirect('/');
    }
    else{
        console.log("Friend does not exist!");
    }
}));

app.delete('/leaveGroup', catchAsync(async(req, res) => {

    const { id, removeUser } = req.body;

    const user = await User.findById(removeUser);
    //const currentUser = req.user;
    //console.log("LEAVE: ", group);
    console.log("User remove: ", user._id);
    const group = await Group.findByIdAndUpdate(id, { $pull: { users: user._id } });
    console.log("G Users: ", group.users);
    //Have to make post middleware to delete fromusers groups? If we want that or just keep the chat forthe user.
    res.redirect('/');

}));

app.use((req, res) => {
    res.send('Not Found');
});

io.on("connection", (socket) => {
    
    console.log("A User Connected! - - - ");

    socket.on('user', catchAsync(async(data) => {

        const { user } = data;
        
        console.log("In Server...");
        const statuss = "online";
        const storeID = await User.findByIdAndUpdate({ _id: user } , { connectionId: socket.id, statuss }, { new: true });
        
        onlineUsers.push(user);
        io.emit('online', onlineUsers);
        
    }));

    socket.on('chat message', catchAsync(async(messageData) => {

        console.log("Socket.id:", socket.id);

        const { senderId, recipientId, content, date, time } = messageData;
    
        console.log(messageData, "MessageObj", "Socket.id:", socket.id);

        const saveMessage = new Message({ sender: senderId, receiver: recipientId, content, date, time });;
        await saveMessage.save();

        const recpUser = await User.findById(recipientId);
        const recipientSocketId = recpUser.connectionId;
        console.log("RecpID: ", recipientSocketId);
        const sendUser = await User.findById(senderId);
        const senderSocketId = sendUser.connectionId;
        console.log("SendID: ", senderSocketId);

        //CreateChat---------------------------------------------------------
        const participants = [senderId, recipientId];

        //Check if chat exists?
        participants.sort();
  
        // Search for a chat where the 'members' array matches the specified order
        const existingChat = await Chat.findOne({
        participants: participants,
        });

        console.log(existingChat);

        if (existingChat === null) {
            console.log('No chat found.');
            const createChat = await new Chat({ participants: [senderId, recipientId] });
            createChat.messages.push(saveMessage);
            await createChat.save();
            console.log('Chat created!');
        } else {
            console.log('A chat already exists between the specified participants.');
            console.log("Chat Details: ", existingChat);
            const chat = existingChat._id;
            const addMsgToChat = await Chat.findById(chat);
            addMsgToChat.messages.push(saveMessage);
            await addMsgToChat.save();
            console.log('Message Added to Chat');
        }
        //END Chat---------------------------------------------------------------
       
        io.to(recipientSocketId).emit('chat message', {
           senderSocketId,
           content,
         });
         io.to(recipientSocketId).emit('stop typing');      

    }));

    socket.on('JoinRoom', (data) => {
        socket.join(data);
        console.log('RoomJoined');
    });

    socket.on('group chat message', catchAsync(async(messageData) => {

        console.log("Socket.id:", socket.id);

        const { groupId, sender, receivers, content, date, time } = messageData;
    
        console.log(messageData, "MessageObj", "Socket.id:", socket.id);

        const getUsers = await User.find({ _id: { $in: receivers } });
        const userIdsArray = getUsers.map(user => user._id);

        const getGroup = await Group.findById(groupId);
        const groupID = getGroup._id;
        const sendUser = await User.findById(sender);
        const senderID = sendUser._id;
        const senderUsername = sendUser.username;
        const senderSocketId = sendUser.connectionId;

        const saveGroupMessage = new GroupMessage({ groupId: groupID, sender: senderID, receivers: userIdsArray, content, date, time });
        saveGroupMessage.save();

        console.log('Emitting to: ', groupId);

        io.to(groupId).emit('group chat message', {
           senderSocketId,
           content,
           senderUsername
         });

    }));

    socket.on('disconnect', catchAsync(async() => {

        console.log("User disconnected: ", socket.id);
        const user = await User.findOneAndUpdate({ connectionId: socket.id }, { status: "offline" }, { new: true });  

        var offline = null;

        for(let i = 0; i <= onlineUsers.length; i++){
            if(onlineUsers[i] == user._id ){
              offline = onlineUsers.pop(user._id);
              console.log('UserPopped:', user._id, offline);
            }
          }

          console.log(offline);
        io.emit('offline', offline );

    }));

    socket.on('typing', catchAsync(async(showTo) => {
        const user = await User.findById(showTo);
        const userToShow = user.connectionId;

        io.to(userToShow).emit('typing');

    }));  
    
    socket.on('stop typing', catchAsync(async(showTo) => {
        const user = await User.findById(showTo);
        const userToShow = user.connectionId;

        io.to(userToShow).emit('stop typing');

    })); 

});

http.listen(port, () => {
    console.log('HTTP Serving...');
});