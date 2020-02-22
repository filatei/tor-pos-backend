require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')
const mongoose = require('mongoose');

const app = express();

const paymethodsRoutes = require("./routes/paymethods");
const productsRoutes = require("./routes/products");
const customersRoutes = require("./routes/customers");
const ordersRoutes = require("./routes/orders");

const userRoutes = require("./routes/user");

//let connectStr =  'mongodb://localhost:27017/torposdb';
let connectStr = process.env.CONNECT_STR

const DB = 'torposedb';
// if prod use this
// connectStr ='mongodb+srv://user1:RwyT4Eyw799tQUKF@cluster0-j4gfg.gcp.mongodb.net/torposedb?retryWrites=true&w=majority'
app.use('/', express.static(path.join(__dirname, 'www')));

// app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
// app.use(express.json());

app.use(bodyParser.json({ limit: "1mb" }))
app.use(cors())
mongoose.set('useUnifiedTopology', true );
mongoose.set('useCreateIndex', true);
mongoose.connect(connectStr, { useNewUrlParser: true })
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
    next();
})



//user1 - RwyT4Eyw799tQUKF  admin1  - LvJMVIuk3ShxJyt4

app.use("/api/paymethods", paymethodsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/users", userRoutes);
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'www', 'index.html'));
})

module.exports = app;