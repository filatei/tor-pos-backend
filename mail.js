const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const moment = require("moment");
const User = require("./models/user");
const Contact = require("./models/contact");
const Stockitem = require("./models/stockitem");

const oauth2Client = new google.auth.OAuth2(
  tokens.clientID,
  tokens.clientSecret,
  tokens.redirectURL
);

oauth2Client.setCredentials({
  refresh_token: tokens.refresh_token,
});

async function sendInventory(inventory) {
  let name;
  let supplier, sender;
  let receiver;
  let user;
  let userEmail, userName;
  if (inventory && inventory.name) {
    name = await Stockitem.findById(inventory.name);
    name = name.name;
  }

  if (inventory && inventory.sender) {
    supplier = await Contact.findById(inventory.sender);
    sender = supplier.name;
  }
  if (inventory && inventory.receiver) {
    receiver = await Contact.findById(inventory.receiver);
    receiver = receiver.name;
  }

  if (inventory && inventory.creator) {
    user = await User.findById(inventory.creator);
    userName = user.name;
    userEmail = user.email;
  }

  // some content
  let remarks;

  let storeId = inventory.stock_id.toString().padStart(5, "0");
  let subject = `Inventory Record for (# ${storeId})`;
  let curr = process.env.naira;
  let ops = inventory.ops;
  let store = inventory.store;
  let qty = inventory.qty;
  if (inventory.remarks) {
    remarks = inventory.remarks;
  }
  let toEmail;
  toEmail = userEmail;
  // if (hostname.includes('torama')) {
  //   toEmail =  'expenses@torama.ng';
  // } else { toEmail = userEmail || 'expenses@torama.ng';}

  let format1 = "DD-MM-YYYY hh:mm:ss";
  let date;
  date = moment(inventory.createdAt).format(format1);
  let logo = "https://api.torama.ng/uploads/productimages/fidologo.jpg";
  // logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATQAAAEdCAYAAAH1Jav3AAAKN2lDQ1BzUkdCIElFQzYxOTY2LTIuMQAAeJydlndUU9kWh8+9N71QkhCKlNBraFICSA29SJEuKjEJEErAkAAiNkRUcERRkaYIMijggKNDkbEiioUBUbHrBBlE1HFwFBuWSWStGd+8ee/Nm98f935rn73P3Wfvfda6AJD8gwXCTFgJgAyhWBTh58WIjYtnYAcBDPAAA2wA4HCzs0IW+EYCmQJ82IxsmRP4F726DiD5+yrTP4zBAP+flLlZIjEAUJiM5/L42VwZF8k4PVecJbdPyZi2NE3OMErOIlmCMlaTc/IsW3z2mWUPOfMyhDwZy3PO4mXw5Nwn4405Er6MkWAZF+cI+LkyviZjg3RJhkDGb+SxGXxONgAoktwu5nNTZGwtY5IoMoIt43kA4EjJX/DSL1jMzxPLD8XOzFouEiSniBkmXFOGjZMTi+HPz03ni8XMMA43jSPiMdiZGVkc4XIAZs/8WRR5bRmyIjvYODk4MG0tbb4o1H9d/JuS93aWXoR/7hlEH/jD9ld+mQ0AsKZltdn6h21pFQBd6wFQu/2HzWAvAIqyvnUOfXEeunxeUsTiLGcrq9zcXEsBn2spL+jv+p8Of0NffM9Svt3v5WF485M4knQxQ143bmZ6pkTEyM7icPkM5p+H+B8H/nUeFhH8JL6IL5RFRMumTCBMlrVbyBOIBZlChkD4n5r4D8P+pNm5lona+BHQllgCpSEaQH4eACgqESAJe2Qr0O99C8ZHA/nNi9GZmJ37z4L+fVe4TP7IFiR/jmNHRDK4ElHO7Jr8WgI0IABFQAPqQBvoAxPABLbAEbgAD+ADAkEoiARxYDHgghSQAUQgFxSAtaAYlIKtYCeoBnWgETSDNnAYdIFj4DQ4By6By2AE3AFSMA6egCnwCsxAEISFyBAVUod0IEPIHLKFWJAb5AMFQxFQHJQIJUNCSAIVQOugUqgcqobqoWboW+godBq6AA1Dt6BRaBL6FXoHIzAJpsFasBFsBbNgTzgIjoQXwcnwMjgfLoK3wJVwA3wQ7oRPw5fgEVgKP4GnEYAQETqiizARFsJGQpF4JAkRIauQEqQCaUDakB6kH7mKSJGnyFsUBkVFMVBMlAvKHxWF4qKWoVahNqOqUQdQnag+1FXUKGoK9RFNRmuizdHO6AB0LDoZnYsuRlegm9Ad6LPoEfQ4+hUGg6FjjDGOGH9MHCYVswKzGbMb0445hRnGjGGmsVisOtYc64oNxXKwYmwxtgp7EHsSewU7jn2DI+J0cLY4X1w8TogrxFXgWnAncFdwE7gZvBLeEO+MD8Xz8MvxZfhGfA9+CD+OnyEoE4wJroRIQiphLaGS0EY4S7hLeEEkEvWITsRwooC4hlhJPEQ8TxwlviVRSGYkNimBJCFtIe0nnSLdIr0gk8lGZA9yPFlM3kJuJp8h3ye/UaAqWCoEKPAUVivUKHQqXFF4pohXNFT0VFysmK9YoXhEcUjxqRJeyUiJrcRRWqVUo3RU6YbStDJV2UY5VDlDebNyi/IF5UcULMWI4kPhUYoo+yhnKGNUhKpPZVO51HXURupZ6jgNQzOmBdBSaaW0b2iDtCkVioqdSrRKnkqNynEVKR2hG9ED6On0Mvph+nX6O1UtVU9Vvuom1TbVK6qv1eaoeajx1UrU2tVG1N6pM9R91NPUt6l3qd/TQGmYaYRr5Grs0Tir8XQObY7LHO6ckjmH59zWhDXNNCM0V2ju0xzQnNbS1vLTytKq0jqj9VSbru2hnaq9Q/uE9qQOVcdNR6CzQ+ekzmOGCsOTkc6oZPQxpnQ1df11Jbr1uoO6M3rGelF6hXrtevf0Cfos/ST9Hfq9+lMGOgYhBgUGrQa3DfGGLMMUw12G/YavjYyNYow2GHUZPTJWMw4wzjduNb5rQjZxN1lm0mByzRRjyjJNM91tetkMNrM3SzGrMRsyh80dzAXmu82HLdAWThZCiwaLG0wS05OZw2xljlrSLYMtCy27LJ9ZGVjFW22z6rf6aG1vnW7daH3HhmITaFNo02Pzq62ZLde2xvbaXPJc37mr53bPfW5nbse322N3055qH2K/wb7X/oODo4PIoc1h0tHAMdGx1vEGi8YKY21mnXdCO3k5rXY65vTW2cFZ7HzY+RcXpkuaS4vLo3nG8/jzGueNueq5clzrXaVuDLdEt71uUnddd457g/sDD30PnkeTx4SnqWeq50HPZ17WXiKvDq/XbGf2SvYpb8Tbz7vEe9CH4hPlU+1z31fPN9m31XfKz95vhd8pf7R/kP82/xsBWgHcgOaAqUDHwJWBfUGkoAVB1UEPgs2CRcE9IXBIYMj2kLvzDecL53eFgtCA0O2h98KMw5aFfR+OCQ8Lrwl/GGETURDRv4C6YMmClgWvIr0iyyLvRJlESaJ6oxWjE6Kbo1/HeMeUx0hjrWJXxl6K04gTxHXHY+Oj45vipxf6LNy5cDzBPqE44foi40V5iy4s1licvvj4EsUlnCVHEtGJMYktie85oZwGzvTSgKW1S6e4bO4u7hOeB28Hb5Lvyi/nTyS5JpUnPUp2Td6ePJninlKR8lTAFlQLnqf6p9alvk4LTduf9ik9Jr09A5eRmHFUSBGmCfsytTPzMoezzLOKs6TLnJftXDYlChI1ZUPZi7K7xTTZz9SAxESyXjKa45ZTk/MmNzr3SJ5ynjBvYLnZ8k3LJ/J9879egVrBXdFboFuwtmB0pefK+lXQqqWrelfrry5aPb7Gb82BtYS1aWt/KLQuLC98uS5mXU+RVtGaorH1futbixWKRcU3NrhsqNuI2ijYOLhp7qaqTR9LeCUXS61LK0rfb+ZuvviVzVeVX33akrRlsMyhbM9WzFbh1uvb3LcdKFcuzy8f2x6yvXMHY0fJjpc7l+y8UGFXUbeLsEuyS1oZXNldZVC1tep9dUr1SI1XTXutZu2m2te7ebuv7PHY01anVVda926vYO/Ner/6zgajhop9mH05+x42Rjf2f836urlJo6m06cN+4X7pgYgDfc2Ozc0tmi1lrXCrpHXyYMLBy994f9Pdxmyrb6e3lx4ChySHHn+b+O31w0GHe4+wjrR9Z/hdbQe1o6QT6lzeOdWV0iXtjusePhp4tLfHpafje8vv9x/TPVZzXOV42QnCiaITn07mn5w+lXXq6enk02O9S3rvnIk9c60vvG/wbNDZ8+d8z53p9+w/ed71/LELzheOXmRd7LrkcKlzwH6g4wf7HzoGHQY7hxyHui87Xe4Znjd84or7ldNXva+euxZw7dLI/JHh61HXb95IuCG9ybv56Fb6ree3c27P3FlzF3235J7SvYr7mvcbfjT9sV3qID0+6j068GDBgztj3LEnP2X/9H686CH5YcWEzkTzI9tHxyZ9Jy8/Xvh4/EnWk5mnxT8r/1z7zOTZd794/DIwFTs1/lz0/NOvm1+ov9j/0u5l73TY9P1XGa9mXpe8UX9z4C3rbf+7mHcTM7nvse8rP5h+6PkY9PHup4xPn34D94Tz+49wZioAAAAJcEhZcwAADsMAAA7DAcdvqGQAACAASURBVHicvL0HmFbVtTf+O+XtZXpnqIJ0pQiKlcSCvaBRo2ILiZrEVNNuElNuyk1uNDHRGHtvgA07KIJIEUR6LwPMML2+vZxzvrXWPjPDOHjz3f/zPf/tM85w3vOes8/aq/zW2mutY17708dfLT5uyKV5mNA1wKc7KDRNrOnUofu9yFs2HGjQ6LeWzGBUhYH9zRZSNmBrGkw6hkwOWQewADj8O50FfRFOXSPSkRCQs6AVBmHSh7bFX6Rr0ucTzxmPbW9thkXH5fqODcPKy2/NpmuXezwo9XmRtukEmlzI8KAlp0Pzm3DoQMbR4OuMQY8EYZkG9rZp0On6/jxPRUO8JwW7KAw9kYZcwLLoMYHCoWU4/8sj8PLKwwgUhtDZ2IlMNgcZdJ6j6di6ZAeIFvBmMsh5vDQhejjNQG5YBQJ7D8FcsbYOPXtS+Oal4+DXDaTpKZYs2IxhF00Xanh1HclEFuFQABo9iJO3Ma/5HUzeuwkLrv8N1hZGMKbIwfotWZmspjnI1DXj1NNq0ZjNI1hWIJOPDilDy8rttDo6UZcow1QmgtiGjrzXR9RyhBg8LpxRiSV1TTBDJ45CydBaPPvUKti6j67voOLiU2WJbPqyQ2vtH1YOh5eX/n1L+iOc++Eyucidf/wWbvruw3j9nS2oHlKiLk5PrtN5b69tQpSoh+ICwGPQQwJZejCvrqjGTKDR+bwAOj8UTY6p6MkkiThbUFBdApM/MOhiBZecAR89hcVPRl/N03Lq9G+deMrx0BLbTBcdZ7yxGMbooTCOG4Hs28vRc6ANlWOGCN8ZdHOLvuwbUo5IaQHyhWFhwmLdQrmRwY58Hh6vB0I2uY+tWIEPaJrwmuXxwWraiFzxaTCZEXO0XDxyUGR1EhnY4SC8tCzxrIWIYcKiJdeIn35w7T14dP4JCJgepL/bjNwje6HReTl6ANvKwaRzUtEQsnUtGFpbhAqalI8mMtznQ4HfD4fIgWQaGZqMwffiSfH0eFnpHjxfT/kkZFo6aHL0RSOXJ9rqMgGZJN3MQ5O2aAnCQR/dFEjHErDo+EPzRqK1sRFerxeRaAmemjcB8/65AV6SyNDk4ejccpAkjiQ1HMDq9zZi/iUT8da6Zry/pwG5kgh66LxSuqefrp/lCVqK13TH1QpAH2VNm2Zs0FLkSH14SZocmqQZ9DODwPJ5RCVkmjoRLC/E898YgVg8iXCkCKlUGu0dnaisIJ4yDGIHDT3bD8PDD0k3ztN1K4uL8PqHh6Bns7Bomb2kQkrV4pAWICLRj8k8KGqJZFzLksQSoaDLOppMRpuexqPl5QYaMw2N1iOdKB1KgkCf+Uniass9iKUzeOShV/Dr39xJvEXsEE/Bb/qw8u4zMevuD4m9SFLpfL603JnVEx3L04MH6c";

  let derived_total = 0;

  //  derived_total = derived_total.toLocaleString();

  let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">
                ${date}</p><h2>INVENTORY ${ops}</h2><p> Hi ${userName},</p>`;
  html += `<p>Your ${ops} Inventory Record # ${storeId} for ${name} Qty: ${qty} has impacted store ${store} </p><p>Supplier: ${sender}</p> <p>Receiver: ${receiver}</p> <p>Factory Location: ${store}</p>`;
  html += `<table style="margin-left:auto; margin-right:auto"><tr style="text-align:left;"><td><h3>Inventory summary</h3></td></tr><tr style="text-align:left;"><td>Status:</td><td> </td></tr><tr style="text-align:left;"><td> Subtotal:</td><td> ${name} ${qty} ${store} </td></tr>
    <tr style="text-align:left;"> <td>Remarks: ${remarks} </td><td> </td></tr> <tr style="text-align:left;"><td> </td><td></td></tr></table>`;

  html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by ShopTorama<sup>&#174;</sup> - All rights reserved. &#169; ${new Date().getFullYear()}</p> </body></html>`;

  // let odia = 'odia.gabriel@gtsng.com';
  let odia;

  try {
    const mailOptions = {
      from: `TIMS  ${process.env.tormail}`,
      to: toEmail,
      cc: odia,
      bcc: process.env.tormail,
      subject: subject,
      generateTextFromHTML: true,
      html: html,
    };

    const accessToken = await oauth2Client.getAccessToken();

    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.tormail,
        clientId: tokens.clientID,
        clientSecret: tokens.clientSecret,
        refreshToken: tokens.refresh_token,
        accessToken: accessToken,
        pool: true,
      },
    });

    // send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
      let result;
      if (error) {
        console.log(error);
        result = false;
      } else {
        result = true;
      }
      smtpTransport.close();
      return result;
    });
  } catch (err) {
    console.log(err);
  }
}

async function sendExpense(expense) {
  let vendor;
  let payHistory = [];
  if (expense && expense.vendor) {
    vendor = expense.vendor.name;
    payHistory = expense.payHistory;
  }

  // some content
  let expenseId = expense.expense_id;
  let memo;
  let remarks;

  expenseId = expenseId.toString().padStart(5, "0");
  let subject = `Expense Activity for (# ${expenseId})`;
  let curr = process.env.naira;
  let total = expense.txn_amount;
  let status = expense.status;
  let category = expense.category;
  let expenseAccount = expense.expenseAccount;
  let balance = 0;
  let paidAmount = 0;

  if (expense.payment && expense.payment.paidAmount) {
    paidAmount = expense.payment.paidAmount;
    if (status !== "PAID") {
      status = "PARTIALLY PAID";
    }
    balance = expense.balance;
  }
  if (expense.remarks) {
    remarks = expense.remarks;
  }

  if (expense.payment && expense.payment.memo) {
    memo = expense.payment.memo;
  }

  let location = expense.site;
  let user = await User.findById(expense.creator);
  let userName = user.name;
  let userEmail = user.email;

  let toEmail = "";
  let url = "";

  if (hostname.includes("torama")) {
    toEmail = "expenses@torama.ng";
    url = "https://posclaims.torama.ng";
  } else {
    toEmail = "test@torama.ng";
    url = "http://localhost:8100";
  }

  let format1 = "DD-MM-YYYY hh:mm:ss";
  let date;
  date = moment(expense.createdAt).format(format1);
  let logo = "https://api.torama.ng/uploads/productimages/fidologo.jpg";
  // logo = "data:image/png;base64,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";

  let products = expense.products;

  let product = `<table style="margin-left:auto; margin-right:auto"><thead><tr style="text-align:left;"> <th>Product</th> <th>Rate</th> <th></th><th>Amount</th></tr></thead><tbody>`;
  let derived_total = 0;
  products.forEach((p) => {
    let amount = (p.qty * p.price).toLocaleString();
    let rate = p.price;
    product += `<tr style="text-align:left;"><td>${p.qty} x ${p.name} </td> <td>${rate}</td><td colspan="2" style="text-align:right;">${amount} ${curr}</td><tr>`;
    derived_total += p.qty * p.price;
  });
  //  derived_total = derived_total.toLocaleString();

  product += `</tbody><tfoot><tr><td colspan="4" style="text-align:right;" > Sum: ${derived_total} ${curr}</td></tr></tfoot></table>`;
  let payHist = "";
  payHistory.forEach((ph, i) => {
    if (ph) {
      let payer = ph.payer;
      if (ph.payer.includes("Akpodigha")) {
        payer = "MD";
      }
      payHist += `<tr style="text-align:left;"><td>${i + 1}.</td>  <td>${
        ph.bankAcct
      }  </td> <td>${ph.paidAmount.toLocaleString()}</td><td>${payer}</td><td>${moment(
        new Date(ph.paymentDate)
      ).format("DD-MM-YYYY HH:mm:ss")}</td> </tr>`;
    }
  });

  let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">
                ${date}</p><h2>EXPENSE ${status}</h2><p> Hi ${userName},</p>`;
  html += `<p>The Status of your Expense Request # ${expenseId} for ${curr} ${total.toLocaleString()}  is now ${status}</p><p>Vendor: ${vendor}</p> <p>Factory Location: ${location}</p>
  <p>Category: ${category}</p> <p>Expense Account: ${expenseAccount}</p>`;
  html += `Product: ${product}`;
  html += `<table style="margin-left:auto; margin-right:auto"><tr style="text-align:left;"><td><h3>Expense summary</h3></td></tr><tr style="text-align:left;"><td>Status:</td><td> ${status}</td></tr><tr style="text-align:left;"><td> Subtotal:</td><td> ${curr} ${total.toLocaleString()} </td></tr>
    <tr style="text-align:left;"> <td>Paid: </td><td>${curr} ${paidAmount}</td></tr> <tr style="text-align:left;"><td>Balance: </td><td>${curr} ${balance.toLocaleString()}</td></tr></table>`;

  html += `<h3>Pay History</h3><table style="margin-left:auto; margin-right:auto"> ${payHist} </table>`;

  html += `<p> Remarks: ${remarks} </p>`;
  if (memo) {
    html += `<p> Memo: ${memo} </p>`;
  }
  html += `Click <a href="${url}/#/home/expense-detail?id=${expense._id}"> Expense Detail </a> to see expense ticket`;

  html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by ShopTorama<sup>&#174;</sup> - All rights reserved. &#169; ${new Date().getFullYear()}</p> </body></html>`;

  try {
    const accessToken = await oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.tormail,
        clientId: tokens.clientID,
        clientSecret: tokens.clientSecret,
        refreshToken: tokens.refresh_token,
        accessToken: accessToken,
        pool: true,
      },
    });

    const mailOptions = {
      from: `ShopTorama ${process.env.tormail}`,
      to: userEmail,
      cc: toEmail,
      bcc: process.env.tormail,
      subject: subject,
      generateTextFromHTML: true,
      html: html,
    };

    // send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
      let result;
      if (error) {
        console.log(error);
        result = false;
      } else {
        result = true;
      }
      smtpTransport.close();
      return result;
    });
  } catch (err) {
    console.log(err);
  }
}

async function sendNote(note, expense) {
  let author;
  if (note && note.author) {
    author = note.author;
  }
  console.log("note author in mail sendnote ", author);

  // some content
  let expenseId = expense.expense_id;

  expenseId = expenseId.toString().padStart(5, "0");
  let subject = `Note added to Expense(# ${expenseId})`;
  let curr = process.env.naira;
  let status = expense.status;
  let category = expense.category;
  let expenseAccount = expense.expenseAccount;
  let location = expense.site;
  let user = await User.find({ name: note.author });
  let expenseCreator = await User.findById(expense.creator);
  let userName = author;
  let userEmail = user.email;
  let notesEmail;
  let creatorEmail;

  let toEmail;

  if (hostname.includes("torama")) {
    toEmail = "expenses@torama.ng";
    notesEmail = user.email;
    creatorEmail = expenseCreator.email;
  } else {
    toEmail = null;
    notesEmail = user.Email;
    creatorEmail = null;
    // return;
  }

  let format1 = "DD-MM-YYYY hh:mm:ss";
  let date;
  date = moment(expense.createdAt).format(format1);
  let logo = "https://api.torama.ng/uploads/productimages/fidologo.png";
  // logo = "data:image/png;base64,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";

  let products = expense.products;

  let product = `<table style="margin-left:auto; margin-right:auto"><thead><tr style="text-align:left;"> <th>Product</th> <th></th> <th></th><th>Amount</th></tr></thead><tbody>`;
  let derived_total = 0;
  products.forEach((p) => {
    let amount = (p.qty * p.price).toLocaleString();
    product += `<tr style="text-align:left;"><td>${p.qty} x ${p.name} </td> <td colspan="3" style="text-align:right;">${amount} ${curr}</td><tr>`;
    derived_total += p.qty * p.price;
  });
  //  derived_total = derived_total.toLocaleString();

  product += `</tbody><tfoot><tr><td colspan="4" style="text-align:right;" > Sum: ${derived_total} ${curr}</td></tr></tfoot></table>`;

  let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">
                ${date}</p><h2>Expense Status: ${status}</h2><p> Hi ${userName},</p>`;
  html += `<p>Note is added to expense # ${expenseId} </p><p>Author: ${author}</p>
  <p>Category: ${category}</p> <p>Expense Account: ${expenseAccount}</p>`;

  html += `<p> Note: ${note.text} </p> `;

  if (note && note.image) {
    html += `<img src="${note.image}" alt="note image" width="300" >`;
  }

  html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by Torama<sup>&#174;</sup> - All rights reserved. &#169; ${new Date().getFullYear()}</p> </body></html>`;

  try {
    const accessToken = await oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.tormail,
        clientId: tokens.clientID,
        clientSecret: tokens.clientSecret,
        refreshToken: tokens.refresh_token,
        accessToken: accessToken,
        pool: true,
      },
    });

    const mailOptions = {
      from: `ShopTorama ${process.env.tormail}`,
      to: creatorEmail,
      cc: notesEmail,
      bcc: toEmail,
      subject: subject,
      generateTextFromHTML: true,
      html: html,
    };

    // send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
      let result;
      if (error) {
        console.log(error);
        result = false;
      } else {
        result = true;
      }
      smtpTransport.close();
      return result;
    });
  } catch (err) {
    console.log(err);
  }
}

async function sendQaNote(note, item) {
  let author;
  let userEmail;
  if (note.author) {
    author = note.author;
    const noteUser = await User.find({ name: author });
    userEmail = noteUser[0].email;
  }

  // some content
  let itemId = item.qaqc_id;

  itemId = itemId.toString().padStart(5, "0");
  let subject = `Note added to QA/QC(# ${itemId})`;
  let status = item.status;
  let location = item.location;
  let userName = author;
  let user = await User.findById(item.creator);
  console.log(item, user);
  let creatorEmail = user.email;
  let originalAuthor = user.name;
  let notesEmail;

  let toEmail;

  let format1 = "DD-MM-YYYY hh:mm:ss";
  let date;
  date = moment(item.createdAt).format(format1);
  let link;

  let logo = "https://api.torama.ng/uploads/productimages/fidologo.png";

  let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">
                ${date}</p><h2>QA Status: ${status}</h2><p> Updater: ${userName} - ${userEmail},</p>`;
  html += `<p>New note for QA item #${itemId} </p><p> original Author: ${originalAuthor} - ${creatorEmail}</p> <p>Site: ${location}</p> <p>Item: ${item.itemName}</p> <p>Category: ${item.category}</p> <p>Observation: ${item.observation}</p> <p>Reference: ${item.refRange}</p>`;

  html += `<p> Note: ${note.text} </p> `;

  if (note && note.image) {
    html += `<img src="${note.image}" alt="note image" width="300" >`;
  }

  html += `<a href="${link}"> Click here to access the ticket </a> <br>`;

  html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by ShopTorama<sup>&#174;</sup> - All rights reserved.<sup>&#169;</sup> ${new Date().getFullYear()}</p> </body></html>`;
  console.log(html);

  if (hostname.includes("torama")) {
    toEmail = "qaqc@torama.ng";
    notesEmail = userEmail;
    creatorEmail = creatorEmail;
    link = `https://posclaims.torama.ng/#/home/qaqc-detail/${item._id}`;
  } else {
    toEmail = null;
    notesEmail = user.Email;
    creatorEmail = null;
    link = `http://localhost:8100/#/home/qaqc-detail/${item._id}`;
    return;
  }
  try {
    const accessToken = await oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.tormail,
        clientId: tokens.clientID,
        clientSecret: tokens.clientSecret,
        refreshToken: tokens.refresh_token,
        accessToken: accessToken,
        pool: true,
      },
    });

    const mailOptions = {
      from: `ToramaQA ${process.env.tormail}`,
      to: creatorEmail,
      cc: notesEmail,
      bcc: toEmail,
      subject: subject,
      generateTextFromHTML: true,
      html: html,
    };

    // send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
      let result;
      if (error) {
        console.log(error, "error in noteqaqc mailer");
        result = false;
      } else {
        result = true;
      }
      smtpTransport.close();
      return result;
    });
  } catch (err) {
    console.log(err, "error in noteqaqc mailer");
  }
}

async function sendQaqc(item) {
  try {
    let author;
    if (item && item.expert) {
      author = item.expert;
    }

    // some content
    let itemId = item.qaqc_id;

    itemId = itemId.toString().padStart(5, "0");
    let subject = ` QA/QC(# ${itemId})`;
    let status = item.status;
    let location = item.location;
    let userName = author;
    let user = await User.find({ name: author });
    let itemCreator = await User.findById(item.creator);
    console.log(itemCreator, "itemcreat", user, "User");
    let userEmail = user[0].email;
    let notesEmail;
    let creatorEmail;

    let toEmail;

    let format1 = "DD-MM-YYYY hh:mm:ss";
    let date;
    let link;
    date = moment(item.createdAt).format(format1);

    if (hostname.includes("torama")) {
      toEmail = "qaqc@torama.ng";
      notesEmail = userEmail;
      creatorEmail = itemCreator.email;
      link = `https://posclaims.torama.ng/#/home/qaqc-detail/${item._id}`;
    } else {
      toEmail = null;
      notesEmail = user.Email;
      creatorEmail = null;
      link = `http://localhost:8100/#/home/qaqc-detail/${item._id}`;
      return;
    }

    let logo = "https://api.torama.ng/uploads/productimages/fidologo.png";

    let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">
                ${date}</p><h2>Item Status: ${status}</h2>
                <h2>Action Taken: ${item.actionTaken}</h2>
                <h4>  ${item.actionText} </h4>
                <p> Hi ${userName},</p>`;
    html += `<p>Update is made to QAQC #${itemId} </p>
              <p>Author: ${author}</p> 
              <p>Site: ${location}</p> 
              <p>Item: ${item.itemName}</p> 
              <p>Category: ${item.category}</p>
              <p>Observation: ${item.observation}</p> 

              <p>Reference: ${item.refRange}</p>
              <p>Suggested Remedy: ${item.suggestedRemedy}</p> `;

    html += `<p> Effects: ${item.effects} </p><p> Remarks: ${item.remarks} </p>  `;
    html += `<p> OBS Scale: ${item.observationScale}/ ${item.refRangeScale} </p> `;
    if (item.image) {
      html += `<img src="${item.image}" alt="item image" width="300" >`;
    }
    if (item.notes) {
      item.notes.forEach((note) => {
        if (note.image) {
          html += `<img src="${note.image}" alt="note image" width="300" >`;
        }
        html += `<p>${item.text}</p>`;
      });
    }
    html += `<a href="${link}"> Click here to access the ticket </a> <br>`;

    html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by Torama<sup>&#174;</sup> - All rights reserved. &#169; ${new Date().getFullYear()}</p> </body></html>`;

    const accessToken = await oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.tormail,
        clientId: tokens.clientID,
        clientSecret: tokens.clientSecret,
        refreshToken: tokens.refresh_token,
        accessToken: accessToken,
        pool: true,
      },
    });

    const mailOptions = {
      from: `ToramaQA ${process.env.tormail}`,
      to: creatorEmail,
      cc: toEmail,
      subject: subject,
      generateTextFromHTML: true,
      html: html,
    };

    // send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
      let result;
      if (error) {
        console.log(error, "error in noteqaqc mailer");
        result = false;
      } else {
        result = true;
      }
      smtpTransport.close();
      return result;
    });
  } catch (err) {
    console.log(err, "error in qaqc mailer");
  }
}

async function sendImprest(item, user) {
  try {
    // some content

    let subject = `Imprests Mailer`;
    let userName = user.name;
    let userEmail = user.email;
    let creatorEmail;

    let toEmail;

    let format1 = "DD-MM-YYYY hh:mm:ss";
    let date;
    let link;
    let imprest = "";
    let amountApproved = 0;
    let amountUnApproved = 0;
    date = moment(new Date()).format(format1);
    const tableBegin =
      "<table style='margin-left: auto; margin-right: auto'><tr><th>Site</th><th>Amount</th><th>Status</th><th>Date</th></tr>";
    item.forEach((exp) => {
      if (exp) {
        imprest += `<tr> <td>${exp.site}</td>
          <td>${exp.txn_amount.toLocaleString()}</td><td>${
          exp.status
        }</td><td>${exp.createdAt}</td> </tr>`;
        if (exp.status === "APPROVED") amountApproved += +exp.txn_amount;
        if (exp.status !== "APPROVED") amountUnApproved += +exp.txn_amount;
      }
    });
    const tableEnd = "</table>";
    const table = tableBegin + imprest + tableEnd;

    let logo = "https://api.torama.ng/uploads/productimages/fidologo.png";

    let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">
                ${date}</p>
                <p> Hi ${userName},</p>`;
    html += `<p>Here is list of today's imprest </p> ${table} `;
    html += `<p>Approved Amount:  <b> ₦ ${amountApproved.toLocaleString()} </b> </p> `;
    html += `<p>UNApproved Amount:  <b> ₦ ${amountUnApproved.toLocaleString()} </b> </p> `;

    html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by Torama &#174; - All rights reserved.&#169; ${new Date().getFullYear()}</p> </body></html>`;
    console.log(html);

    if (hostname.includes("torama")) {
      toEmail = "expenses@torama.ng";
      creatorEmail = userEmail;
      link = `https://posclaims.torama.ng/#/home/qaqc-detail/${item._id}`;
    } else {
      toEmail = null;
      creatorEmail = null;
      link = `http://localhost:8100/#/home/qaqc-detail/${item._id}`;
      return;
    }
    const accessToken = await oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.tormail,
        clientId: tokens.clientID,
        clientSecret: tokens.clientSecret,
        refreshToken: tokens.refresh_token,
        accessToken: accessToken,
        pool: true,
      },
    });

    const mailOptions = {
      from: `ToramaImprest ${process.env.tormail}`,
      to: creatorEmail,
      cc: toEmail,
      subject: subject,
      generateTextFromHTML: true,
      html: html,
    };

    // send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
      let result;
      if (error) {
        console.log(error, "error in  mailer");
        result = false;
      } else {
        result = true;
      }
      smtpTransport.close();
      return result;
    });
  } catch (err) {
    console.log(err, "error in imprest mailer");
  }
}

async function sendCashdeposit(item, user) {
  try {
    // some content

    let subject = `Cash Deposit Status ${item.status}`;
    let userName = user.name;
    let toEmail = user.email;
    const creator = await User.findById(item.creator);
    let creatorEmail = creator.email;
    // console.log(creatorEmail, "creatorEmail");

    let format1 = "DD-MM-YYYY hh:mm:ss";
    let date;
    let link;
    let amount = item.amount;
    date = moment(new Date()).format(format1);

    let logo = "https://api.torama.ng/uploads/productimages/fidologo.png";

    let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">
                ${date}</p>
                <p> Hi ${creator.name},</p>`;
    html += `<p>Amount: ${amount.toLocaleString()}  </p> <p>Status: <b style="color:red">${
      item.status
    } </b> </p><p> Site: ${item.site}</p> <p>Deposited by: ${
      item.depositor
    }</p>`;

    html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by Torama &#174; - All rights reserved.&#169; ${new Date().getFullYear()}</p> </body></html>`;
    console.log(html, creatorEmail);

    if (hostname.includes("torama")) {
      toEmail = "expenses@torama.ng";

      link = `https://posclaims.torama.ng/#/home/qaqc-detail/${item._id}`;
    } else {
      toEmail = null;
      creatorEmail = null;
      link = `http://localhost:8100/#/home/qaqc-detail/${item._id}`;
      return;
    }
    const accessToken = await oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.tormail,
        clientId: tokens.clientID,
        clientSecret: tokens.clientSecret,
        refreshToken: tokens.refresh_token,
        accessToken: accessToken,
        pool: true,
      },
    });

    const mailOptions = {
      from: `ToramaImprest ${process.env.tormail}`,
      to: creatorEmail,
      cc: toEmail,
      subject: subject,
      generateTextFromHTML: true,
      html: html,
    };

    // send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
      let result;
      if (error) {
        console.log(error, "error in  mailer");
        result = false;
      } else {
        result = true;
      }
      smtpTransport.close();
      return result;
    });
  } catch (err) {
    console.log(err, "error in imprest mailer");
  }
}

module.exports = {
  sendInventory,
  sendExpense,
  sendNote,
  sendQaNote,
  sendQaqc,
  sendImprest,
  sendCashdeposit,
};
