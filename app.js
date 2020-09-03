require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')
const mongoose = require('mongoose');
var SocketService = require('./SocketService');



const app = express();

const paymethodsRoutes = require("./routes/paymethods");
const productsRoutes = require("./routes/products");
const customersRoutes = require("./routes/customers");
const ordersRoutes = require("./routes/orders");

const userRoutes = require("./routes/user");
const fileRoutes = require("./routes/file");
const printRoutes = require("./routes/print");
const receiptRoutes = require("./routes/receipts");
const settingRoutes = require("./routes/settings");
const claimRoutes = require("./routes/claims.route");
const recUploadRoutes = require("./routes/recuploads");
const recsummary = require("./routes/recsummary");
const category = require("./routes/category");
const card = require("./routes/card");
const terminal = require("./routes/terminal");
const siteRoutes = require("./routes/fidosites");
const eodRoutes = require("./routes/eod");
const shopordersRoutes = require("./routes/shoporders");
const mailRoutes = require("./routes/mail");
const inventoryRoutes = require("./routes/inventory");
const stockitemRoutes = require("./routes/stockitem");
const expenseitemRoutes = require("./routes/expenseitem");
const contactRoutes = require("./routes/contact");
const qtyRoutes = require("./routes/quantity");
const expenseRoutes = require("./routes/expense");
const shopsettingsRoutes = require("./routes/shopsettings");

//let connectStr =  'mongodb://localhost:27017/torposdb';
let connectStr = process.env.CONNECT_STR

const DB = 'torposedb';
// if prod use this
// connectStr ='mongodb+srv://user1:RwyT4Eyw799tQUKF@cluster0-j4gfg.gcp.mongodb.net/torposedb?retryWrites=true&w=majority'
// app.use('/', express.static(path.join(__dirname, 'www')));
app.use(require('express-status-monitor')());

app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/productimages', express.static(path.join(__dirname, 'uploads', 'productimages')));

// app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
// app.use(express.json());

app.use(bodyParser.json({ limit: "1mb" }))

const allowedOrigins = [
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    
    'http://localhost:8080',
    'http://localhost:8100',
    'http://localhost:8200'
  ];
  
// Reflect the origin if it's in the allowed list or not defined (cURL, Postman, etc.)
const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
        } else {
        callback(new Error('Origin not allowed by CORS'));
        }
    }
}

// Enable preflight requests for all routes
app.options('*', cors(corsOptions));
app.use(cors())




mongoose.set('useUnifiedTopology', true );
mongoose.set('useCreateIndex', true);
mongoose.connect(connectStr, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true })
.then (()=>{
    console.log("Connected to DB")
})
.catch (err => {
    console.log(err);
});

app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader(
        'Access-Control-Allow-Header',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, POST, PUT, OPTIONS'
    );

   //  res.setHeader({'Feature-Policy': layout-animations 'none'; unoptimized-images 'none'; oversized-images 'none'; sync-script 'none'; sync-xhr 'none'; unsized-media 'none';
    next();
})


app.use("/api/paymethods", paymethodsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/users", userRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/prints", printRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/recuploads", recUploadRoutes);
app.use("/api/recsummary", recsummary);
app.use("/api/productcategory", category);
app.use("/api/cards", card);
app.use("/api/terminals", terminal);
app.use("/api/sites", siteRoutes);
app.use("/api/eod", eodRoutes);
app.use("/api/shoporders", shopordersRoutes);
app.use("/api/mailer", mailRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/stockitem", stockitemRoutes);
app.use("/api/expenseitem", expenseitemRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/quantity", qtyRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/shopsettings", shopsettingsRoutes);


// var mySocket = new SocketService(app, 3003);
// mySocket.initServer();
// mySocket.io.on('connection', socket => {
//    console.log('client connected');
//    // define more events here...
   
//    socket.on('disconnect', reason => {
//     console.log('client disconnected');
//     console.log(reason);
//   });

//     socket.on('KPANSIA', function (from, msg) {
//     console.log('MSG', from, ' saying ', msg);
//     io.emit('KPANSIA', from);
//   });
// })

module.exports = app;