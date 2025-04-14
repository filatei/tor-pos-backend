const express = require("express");
const Chat = require("../models/chat");
const Accesslog = require("../models/accesslog");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const _ =  require("lodash");
const hostname = os.hostname();
const Mail = require("../mail.js");
var multer = require("multer");
const DIR = "/var/www/uploads/chatimages/";
const jwt = require('jsonwebtoken');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =
      new Date().getTime() +
      "-" +
      file.originalname.toLowerCase().split(" ").join("-");
    cb(null, fileName);
  },
});

// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/gif" ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .gif, .png, .jpg and .jpeg format allowed!"));
    }
  },
});

const checkAuth = require("../middleware/check-auth");

router.post("", checkAuth, upload.single("image"), async  (req, res, next) => {
  const alloweds = ["ADMIN", "SECRETARY", "MANAGER", "GENERAL MANAGER",
    "ACCOUNTANT", "SNR ACCOUNTANT", "SUPERVISOR", "STORE KEEPER", "SECURITY", 
    "DATA ENTRY", "POS OPERATOR"];

  if (!alloweds.includes(req.userData.role)) {
    return res.status(500).json({ chat: "Not allowed to create chat" });
  }
  try {
    // const { msg, receiverId } = req.body;
    const obj = req.body;
    obj.creator = req.userData.userId;

    const creatorJwt = jwt.sign(
      {
        creator:  obj.creator,
        receiver:  obj.receiver,
      },
      "CreatorReceiverSecret",
    );

    // console.log(creatorJwt, 'creatorJwt')

    obj.creatorHash = obj.creator + '/' + obj.receiver;
    obj.receiverHash = obj.receiver + '/' + obj.creator;


    if (req.file) {
      if (hostname.includes("torama.ng")) {
        url = "https://fido-api.torama.ng"  
      } else {
        url = req.protocol + "://" + req.get("host");
      }
      const fPath = url + "/" + req.file.path;
      obj.file = fPath.replace('/var/www/','');

    }

    const chat = new Chat(obj);

    // const mSave = await chat.save()
    chat.save().then(async result => {
      await Chat.populate(result, { path: "creator" })
      Chat.populate(result, { path: "receiver" })
      .then(savedChat => {
        // console.log(savedChat)
        res.status(201).json({
          message: "Chat added successfully",
          chat: { ...savedChat._doc },
        });
      })
    })
    // res.status(201).json({
    //   message: "Chat added successfully",
    //   chat: { ...mSave._doc, id: mSave._id },
    // });
  } catch (err) {
    if (err) {
      console.log(err)
      res.status(500).json({
        chat: "Creating a chat failed! " + err,
      });
    }
  }
});



router.delete("/:id", checkAuth, async (req, res, next) => {
  
  try {
    const id = req.params.id;

    const chat =  await Chat.findById(id);

    const userId = req.userData.userId;
    let deletedByUserIds =  chat.deletedByUserIds;

    if (deletedByUserIds && deletedByUserIds.length) {
      deletedByUserIds.push(userId)
    } else {
      deletedByUserIds = [userId]
    }
    const updated = await Chat.update(id, {deletedByUserIds: deletedByUserIds})
    if ( updated ) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not Successful!" });
    }
  } catch (error) {
    res.status(401).json({ message: "Not Successful!" });
  }

  
  

  
});

router.get("", checkAuth, (req, res, next) => {
  // get all chats that this user sent to the receiverID or ReceiverId sent to this user
  const pageSize = +req.query.pagesize;
  const receiverId = req.query.receiverId;
  const creator = req.userData.userId;
  const creatorHash = creator + '/' + receiverId;
  const creatorHashReverse = receiverId + '/' + creator;
  

  const currentPage = +req.query.page;

  const chatQuery = Chat.find( { $or: [ { creatorHash: creatorHash }, { creatorHash: creatorHashReverse } ] })
    .sort({ timeStamp: 1 })
    .populate({ path: "receiver", select: 'name role _id image' })
    // .populate({ path: 'receiver', select: 'name', transform: doc => doc == null ? null : doc.name})
    .populate({path: "creator", select: 'name role _id image'});

  if (pageSize && currentPage) {
    chatQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  chatQuery
    .then((documents) => {
      // console.log('chats', documents);
      res.status(200).json({
        message: "Chats fetched successfully!",
        chats: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        chat: "Fetching chats failed! " + error,
      });
    });
});


router.get("/all", checkAuth, async (req, res, next) => {

  try {
    // get all UNIQUE chats that this user sent  or received 
  const pageSize = +req.query.pagesize;
  // const receiverId = req.query.receiverId;
  // const creator = req.userData.userId;
  const userId = req.userData.userId;
  // const creatorHash = creator + '/' + receiverId;
  // const creatorHashReverse = receiverId + '/' + creator;
  

  const currentPage = +req.query.page;
  let count;

  const chatQuery = Chat.find( { $or: [ { creator: userId }, { receiver: userId } ] })
    .sort({ timeStamp: 1 })
    .populate({ path: "receiver", select: 'name role _id image' })
    // .populate({ path: 'receiver', select: 'name', transform: doc => doc == null ? null : doc.name})
    .populate({path: "creator", select: 'name role _id image'});

  if (pageSize && currentPage) {
    chatQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  //  count = await chatQuery.countDocuments()
  chatQuery
    .then((documents) => {
      // console.log('chats', documents);

      
      const uniqueChats = makeUnique(documents, userId);
      // console.log(uniqueChats, 'unique chats main')

      res.status(200).json({
        message: "Chats fetched successfully!",
        chats: uniqueChats, count: documents.length
      });
    })
    .catch((error) => {
      console.log(error)
      res.status(500).json({
        chat: "Fetching chats failed! " + error,
      });
    });
  } catch (error) {

    console.log(error)
    res.status(500).json({
      chat: "Try error -  chats failed! " + error,
    });
  }
  
});
router.get("/:id", (req, res, next) => {
  Chat.findById(req.params.id)
    .populate("receiver")
    .populate("creator")
    .then((chat) => {
      if (chat) {
        res.status(200).json(chat);
      } else {
        res.status(404).json({ message: "chat not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching chat failed! " + error,
      });
    });
});

function makeUnique(chatsArray, currentUserId) {
  //  returns a unique chatsArray excluding the current user info
  //  remember to filter out the current user
  const chatsGrpByCreator = groupBy(chatsArray,'creator.name')
  const chatsGrpByReceiver = groupBy(chatsArray,'receiver.name')

  const creators = []; // those who sent messages
  const receivers = []; // those who received messages

  Object.entries(chatsGrpByCreator).forEach(([key, value]) => {
    const lastChat = castArray(value).pop(); // pick the last chat which is more recent
    if ( lastChat && lastChat.creator &&  lastChat.creator?._id !== currentUserId) {
      creators.push({ creatorName:lastChat.creator.name, receiverName:lastChat.receiver.name, 
        timeStamp: lastChat.timeStamp, msg: lastChat.msg,
        creatorId:lastChat.creator._id, 
        receiverId: lastChat.receiver._id,
        id:lastChat.creator._id,
        receiver:lastChat.receiver, creator:lastChat.creator, 
        name: lastChat.creator.name,
        image: lastChat.creator.image });
    }
    
  });

  Object.entries(chatsGrpByReceiver).forEach(([key, value]) => {
    const lastChat = castArray(value).pop(); // pick the last chat which is more recent
    if ( lastChat && lastChat.receiver && lastChat.receiver?._id !== currentUserId) {

      receivers.push({ creatorName:lastChat.creator.name, receiverName:lastChat.receiver.name, 
        timeStamp: lastChat.timeStamp, msg: lastChat.msg,
        creatorId:lastChat.creator._id, 
        receiverId: lastChat.receiver._id,
        id: lastChat.receiver._id,
        receiver:lastChat.receiver, creator:lastChat.creator, 
        name: lastChat.receiver.name,
        image: lastChat.receiver.image });
    }
  });

  const chatBox = [...creators, ...receivers];

  const chatBoxGrp = this.groupBy(chatBox, 'id');
  const uniqueChats = [];

  // bring out most recent chat per unique user
  Object.entries(chatBoxGrp).forEach(([key, value]) => {
    const sortedValueDesc = castArray(value).sort(
      (objA, objB) => Number(new Date(objB.timeStamp)) - Number(new Date(objA.timeStamp)),
    );
    const lastVChat = castArray(sortedValueDesc)[0];
    uniqueChats.push({ 
        id:key, 
        timeStamp: lastVChat.timeStamp, 
        msg: lastVChat.msg,
        receiver:lastVChat.receiver, creator:lastVChat.creator, 
        image: lastVChat.image,
        name: lastVChat.name});
  });

  return uniqueChats;
}

// group array by key and return array of key objects
groupBy = (array, key) => {
  return _.groupBy(array, key);
};

castArray = value => Array.isArray(value) ? value : [value];

module.exports = router;
