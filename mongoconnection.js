const os = require("os");
const hostname = os.hostname();

const mongoose = require('mongoose');
const EventEmitter = require('events');

class MongoEmitter extends EventEmitter { }
const mongoEmitter = new MongoEmitter();

// mongoose.set("useUnifiedTopology", true);
// mongoose.set("useCreateIndex", true);
// mongoose.set("useFindAndModify", false);

let username, password, cluster;

if (hostname.includes("local")) {
    connectStr = process.env.CONNECT_STR;
}

if (hostname.includes("torama.ng")) {
    // connectStr = "mongodb://localhost:27017/fido_db";
    connectStr = "mongodb://localhost:27017/fido_db?replicaSet=rs0";
}

mongoose
    .connect(connectStr, {
    })
    .then(() => {
        console.log("Connected to DB");
        mongoEmitter.emit('mongoConnected', mongoose.connection);
        // const db = mongoose.connection;

        // const orderCollection = db.collection('fidoorders');
        // const changeStream = orderCollection.watch();
        // changeStream.on('change', (change) => {
        //     console.log(change);
        //     if (change.operationType === 'insert') {
        //         const message = change.fullDocument;
        //         // broadcast({ exchange: 'MongoDB', message });
        //     }
        // });
    })
    .catch((err) => {
        console.log('Failed to connect to MongoDB', err);
    });



module.exports = mongoEmitter;