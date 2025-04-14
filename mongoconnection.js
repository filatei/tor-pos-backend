const os = require("os");
const hostname = os.hostname();

const mongoose = require('mongoose');
const EventEmitter = require('events');

class MongoEmitter extends EventEmitter { }
const mongoEmitter = new MongoEmitter();
const sendErrorEmail = require('./emailService');

const username = 'user1'
const password = encodeURIComponent('Passw0rd'); // Use encodeURIComponent if your password has special characters
let cluster;
const replicaSet = 'rs0';
const authSource = 'admin';
const dbName = 'fido_db';

if (hostname.includes("local")) {
    connectStr = `mongodb://${username}:${password}@localhost:27017/${dbName}?replicaSet=${replicaSet}&authSource=${authSource}`;

}

if (hostname.includes("torama.ng")) {
    connectStr = "mongodb://localhost:27017/fido_db?replicaSet=rs0";
}

// Mongoose connection options
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    socketTimeoutMS: 45000 // Increase socket timeout
};
mongoose
    .connect(connectStr, options)
    .then(() => {
        console.log(`Connected to DB: ${dbName}`);
        mongoEmitter.emit('mongoConnected', mongoose.connection);

    })
    .catch((err) => {
        console.log('Failed to connect to MongoDB', err);
        sendErrorEmail(err);
    });

mongoose.connection.on('error', err => {
    console.error('MongoDB error:', err);
    sendErrorEmail(err);
});

mongoose.connection.on('disconnected', () => {
    console.error('MongoDB disconnected');
    sendErrorEmail('MongoDB connection was disconnected');
});


module.exports = mongoEmitter;