require("dotenv").config();
const path = require("path");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const dbInfo = require(`${homedir}/.db.json`);

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

const paymethodsRoutes = require("./routes/paymethods");
const productsRoutes = require("./routes/products");
const banksRoutes = require("./routes/banks");
const fiaProductsRoutes = require("./routes/fia_products");
const customersRoutes = require("./routes/customers");
const ordersRoutes = require("./routes/orders");
const fidoordersRoutes = require("./routes/fidoorders");

const userRoutes = require("./routes/user");
const userFiaRoutes = require("./routes/fia_user");
const fileRoutes = require("./routes/file");
const receiptRoutes = require("./routes/receipts");
const settingRoutes = require("./routes/settings");
const claimRoutes = require("./routes/claims.route");
const recUploadRoutes = require("./routes/recuploads");
const recsummary = require("./routes/recsummary");
const category = require("./routes/category");
const fiacategory = require("./routes/fia_category");
const card = require("./routes/card");
const terminal = require("./routes/terminal");
const fidositeRoutes = require("./routes/fidosites");
const eodRoutes = require("./routes/eod");
const shopordersRoutes = require("./routes/shoporders");
const fiaordersRoutes = require("./routes/fia_orders");

const mailRoutes = require("./routes/mail");
const inventoryRoutes = require("./routes/inventory");
const stockitemRoutes = require("./routes/stockitem");
const produceitemRoutes = require("./routes/produceitem");
const expenseitemRoutes = require("./routes/expenseitem");
const contactRoutes = require("./routes/contact");
const producecontactRoutes = require("./routes/producecontact");
const qtyRoutes = require("./routes/quantity");
const expenseRoutes = require("./routes/expense");
const produceexpenseRoutes = require("./routes/produceexpense");
const producecustomerRoutes = require("./routes/producecustomers");
const shopsettingsRoutes = require("./routes/shopsettings");
const awardsRoutes = require("./routes/award");
const qaqcRoutes = require("./routes/qaqc");
const cashdepositRoutes = require("./routes/cashdeposit");
const dailyreportRoutes = require("./routes/dailyreport");
const siteRoutes = require("./routes/site");
const liabRoutes = require("./routes/liability");
const produceRoutes = require("./routes/produce");
const filemanagerRoutes = require("./routes/filemanager");
const photoRoutes = require("./routes/photos");
const cryptoRoutes = require("./routes/crypto");
const genRoutes = require("./routes/gen");
const distRoutes = require("./routes/distributor");
const vehRoutes = require("./routes/vehicle");
const payRoutes = require("./routes/payroll");
const pplRoutes = require("./routes/people");
const casualRoutes = require("./routes/casual");
const callRoutes = require("./routes/callmanager");
const pgbyRoutes = require("./routes/payrollgrpbyyrmonthstatus");
const chatRoutes = require("./routes/chat");
const chatgptRoutes = require("./routes/chat-gpt");
const cashbackRoutes = require("./routes/cashbacks");

app.use(require("express-status-monitor")());
app.use("/data", express.static(path.join(__dirname, "data")));
app.use("/uploads", express.static("/var/www/uploads"));
app.use("/expenseUploads", express.static("/var/www/uploads/expenses"));
app.use("/cashbackUploads", express.static("/var/www/uploads/cashbackimages"));
app.use("/recuploads", express.static("/var/www/uploads/torama/recuploads2"));
app.use("/callManageruploads", express.static("/var/www/uploads/calls"));
app.use("/public", express.static("/var/www/uploads/torama/public"));
app.use("/varimages", express.static("/var/images"));
app.use("/payrollimages", express.static("/var/www/uploads/payrollimages"));
app.use("/eoduploads", express.static("/var/www/uploads/eodimages"));


app.use("/uploads/productimages", express.static("/var/www/productimages"));

app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);

app.use(bodyParser.json({ limit: "1mb" }));

app.use(cors());
let connectStr;
connectStr = process.env.CONNECT_STR; // mongodb://localhost:27017/torposdb

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Header",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, POST, PUT, OPTIONS"
  );

  next();
});


// require('./mongoconnection');  // Initialize MongoDB connection
// require('./websocketserver');  // Initialize WebSocket server


app.use("/api/paymethods", paymethodsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/banks", banksRoutes);
app.use("/api/fiaproducts", fiaProductsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/fidoorders", fidoordersRoutes);
app.use("/api/users", userRoutes);
app.use("/api/fiausers", userFiaRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/recuploads", recUploadRoutes);
app.use("/api/recsummary", recsummary);
app.use("/api/productcategory", category);
app.use("/api/fiaproductcategory", fiacategory);
app.use("/api/cards", card);
app.use("/api/terminals", terminal);
app.use("/api/eod", eodRoutes);
app.use("/api/shoporders", shopordersRoutes);
app.use("/api/fiaorders", fiaordersRoutes);
app.use("/api/mailer", mailRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/stockitem", stockitemRoutes);
app.use("/api/produceitem", produceitemRoutes);
app.use("/api/expenseitem", expenseitemRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/producecontact", producecontactRoutes);
app.use("/api/quantity", qtyRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/shopsettings", shopsettingsRoutes);
app.use("/api/awards", awardsRoutes);
app.use("/api/qaqc", qaqcRoutes);
app.use("/api/cashdeposit", cashdepositRoutes);
app.use("/api/dailyreport", dailyreportRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/fidosites", fidositeRoutes);
app.use("/api/liabilities", liabRoutes);
app.use("/api/produce", produceRoutes);
app.use("/api/produceexpense", produceexpenseRoutes);
app.use("/api/producecustomers", producecustomerRoutes);
app.use("/api/filemanager", filemanagerRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/crypto", cryptoRoutes);
app.use("/api/gen", genRoutes);
app.use("/api/distributor", distRoutes);
app.use("/api/vehicle", vehRoutes);
app.use("/api/people", pplRoutes);
app.use("/api/casual", casualRoutes);
app.use("/api/payroll", payRoutes);
app.use("/api/callManager", callRoutes);
app.use("/api/pgby", pgbyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/chatgpt", chatgptRoutes);
app.use("/api/cashback", cashbackRoutes);

module.exports = app;
