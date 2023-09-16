const WebSocket = require('ws');
const mongoEmitter = require('./mongoconnection');  // Import the emitter

const wss = new WebSocket.Server({ port: 4000 });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
});

mongoEmitter.on('mongoConnected', (db) => {
    const orderCollection = db.collection('fidoorders');
    const changeStream = orderCollection.watch();

    changeStream.on('change', async (change) => {
        const fullDocument = change.fullDocument;
        console.log(' inside changestream')
        if (!fullDocument) return;

        const transDate = new Date(fullDocument.trans_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (transDate >= today) {
            // Run aggregation query for today's sales per site
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const aggregationResults = await orderCollection.aggregate([
                {
                    $match: {
                        trans_date: { $gte: today, $lt: tomorrow },
                        // site: fullDocument.site  // Change this if you want aggregation for all sites
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $group: {
                        _id: {
                            site: '$site',
                            productName: '$products.name'
                        },
                        totalQty: { $sum: '$products.qty' },
                        totalAmount: { $sum: '$products.amount' }
                    }
                },
                {
                    $group: {
                        _id: "$_id.site",
                        products: {
                            $push: {
                                productName: "$_id.productName",
                                totalQty: "$totalQty",
                                totalAmount: "$totalAmount",
                            },
                        },
                    }
                },
            ]).toArray();

            // Broadcast the summary data to all WebSocket clients
            console.log(aggregationResults, ' aggregationResults')
            wss.clients.forEach(client => {
                client.send(JSON.stringify(aggregationResults));
            });
        }
    });
});
