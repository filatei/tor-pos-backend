const express = require("express");
const Chat = require("../models/chat-gpt");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const _ =  require("lodash");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: tokens.OPEN_AI_SECRET_KEY,
});
// console.log(configuration)

const openai = new OpenAIApi(configuration);


const checkAuth = require("../middleware/check-auth");

router.post("", checkAuth, async  (req, res, next) => {
  try {
    const { prompt } = req.body;

    console.log(prompt)
      
    const response = await openai.createCompletion({
      model: "text-davinci-002",
      prompt: `${prompt}`,
      temperature: 0, // Higher values means the model will take more risks.
      max_tokens: 3000, // The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).
      top_p: 1, // alternative to sampling with temperature, called nucleus sampling
      frequency_penalty: 0.5, // Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
      presence_penalty: 0, // Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.
      
    });
    console.log(response)

    res.status(200).json({
      bot: response.data.choices[0].text
    });

  } catch (error) {
    // console.error(error)
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
    res.status(500).send(error || 'Something went wrong');
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
