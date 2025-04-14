Group Messaging
Sent + Delivered + Read receipts
Online / Last Seen
Image Sharing
Chats are temporary / permanent
One to One Chat


Design
 cellphone1 -> Gateway1 -> Sessions Microservice -> DB -> socket
 cellphone2 -> Gateway2 -> Sessions Microservice -> DB -> socket


Modeling
Inbox
  id, userid, inboxhash, senderid, seen, deleted, lastmsg, unseenNumbers
Chat
  inboxhash (senderid, receiverid), senderid, msg, file, meta, deleted_userid

User
UserActivity
   userId, lastSeen