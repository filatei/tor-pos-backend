// const socketIO = require('socket.io');
const WebSocket = require('ws');
const mongoose = require('mongoose');
// const db = mongoose.connection;
// const orderCollection = db.collection('fidoorders');
// const changeStream = orderCollection.watch();


// user connection map
const userSocketMap = new Map();

function initSocket(server) {
    // const io = socketIO(server);
    const wss = new WebSocket.Server({ server });

    // Exchange WebSockets
    const binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    const coinbaseWs = new WebSocket('wss://ws-feed.pro.coinbase.com');
    const bitstampWs = new WebSocket('wss://ws.bitstamp.net');
    const krakenWs = new WebSocket('wss://ws.kraken.com');
    const bitfinexWs = new WebSocket('wss://api.bitfinex.com/ws/2');


    /// Broadcast to all connected clients
    const broadcast = (data) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    };

    // Binance WebSocket example
    binanceWs.on('message', function incoming(message) {
        const parsedMessage = JSON.parse(message);
        // broadcast({ exchange: 'Binance', btcPrice: parsedMessage.p });
        // console.log(`Binance BTC Price: ${parsedMessage.p}`);
    });

    // Coinbase WebSocket
    coinbaseWs.on('message', function incoming(message) {
        const parsedMessage = JSON.parse(message);
        console.log(`Coinbase: ${parsedMessage}`);
    });

    // Bitstamp WebSocket
    bitstampWs.on('message', function incoming(message) {
        const parsedMessage = JSON.parse(message);
        console.log(parsedMessage, 'bit stamp ');
        if (parsedMessage.event === 'trade') {
            console.log(`Bitstamp BTC Price: ${parsedMessage.data.price}`);
        }
    });

    // Kraken WebSocket
    krakenWs.on('message', function incoming(message) {
        const parsedMessage = JSON.parse(message);
        if (Array.isArray(parsedMessage) && parsedMessage[2] === 'XBT/USD') {
            console.log(`Kraken BTC Price: ${parsedMessage[1][0][0]}`);
        }
    });

    // Bitfinex WebSocket
    bitfinexWs.on('message', function incoming(message) {
        const parsedMessage = JSON.parse(message);
        if (Array.isArray(parsedMessage) && parsedMessage[1] === 'tu') {
            console.log(`Bitfinex BTC Price: ${parsedMessage[1][3]}`);
        }
    });

    // Websocket for mongodb changestream using mongoose

    // const changeStream = db.collection('fidoOrders').watch();
    // changeStream.on('change', (change) => {
    //     console.log(change);
    //     if (change.operationType === 'insert') {
    //         const message = change.fullDocument;
    //         broadcast({ exchange: 'MongoDB', message });
    //     }
    // });



    // WebSocket for Angular client
    wss.on('connection', (ws) => {
        
        ws.on('message', (message) => {
            // Handle client messages if needed
            console.log(`Received  client message => ${message}`);
        });
    });

    // io.on('connection', (socket) => {
    //     console.log('User connected');

    //     socket.on('user login', (user) => {
    //         console.log(`User logged in: ${user}`);
    //         userSocketMap.set(user, socket.id); // save the socket id of the user
    //         io.emit('user login', user);
    //     });

    //     socket.on('disconnect', () => {
    //         console.log('User disconnected');
    //         userSocketMap.delete(user); // remove the user from the map
    //     });
    // });

    return {  userSocketMap };
}

module.exports = {
    initSocket,
};
