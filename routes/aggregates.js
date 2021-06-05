const express = require("express");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const dbinfo = require(`${homedir}/.db.json`);

// const Customer = require("../models/customer");
const router = express.Router();
const moment = require("moment");

const fs = require("fs");
const mime = require("mime");

var sanitize = require("mongo-sanitize");

const env = process.env.NODE_ENV || "development";

const checkAuth = require("../middleware/check-auth");

const { MongoClient } = require("mongodb");
const uri = dbinfo.DBURL;
/**
 * The Mongo Client you will use to interact with your database
 * See https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html for more details
 */
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function main() {
  /**
   * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
   * See https://docs.mongodb.com/drivers/node/ for more details
   */
  //const uri = dbinfo.DBURL;

  /**
   * The Mongo Client you will use to interact with your database
   * See https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html for more details
   */
  // const client = new MongoClient(uri, {
  //   useNewUrlParser: true,
  //   useUnifiedTopology: true,
  // });
  // console.log(client);

  try {
    // Connect to the MongoDB cluster
    await client.connect();

    // Make the appropriate DB calls
    await printTotalSales(client, 10);
  } catch (err) {
    console.log(err);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
}

main().catch(console.error);

// Add functions that make DB calls here

/**
 * Print the total sales group by site
 * @param {MongoClient} client A MongoClient that is connected to a cluster with the sample_airbnb database
 * @param {String} site The site
 * @param {number} maxNumberToPrint The maximum number of suburbs to print
 */
async function printTotalSales(client, maxNumberToPrint) {
  const today = moment().startOf("day");
  const yesterday = moment().subtract(1, "days");

  // condition for today results
  let cond1 = {
    createdAt: {
      $gte: today.toDate(),
      $lte: moment(today).endOf("day").toDate(),
    },
  };
  const pipeline = [
    {
      $match: {
        action_taken: "PRODUCT RELEASED",
      },
    },
    {
      $unwind: {
        path: "$products",
      },
    },
    {
      $group: {
        _id: {
          year: {
            $year: "$createdAt",
          },
          product: "$products.name",

          site: "$terminal_location",
        },
        totalSalesAmount: {
          $sum: "$txn_amount",
        },
        totalQty: {
          $sum: "$products.qty",
        },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.site": 1,
        "_id.product": 1,
      },
    },
  ];

  const aggCursor = client
    .db("torposdb")
    .collection("recuploads")
    .aggregate(pipeline);
  const result = [];
  await aggCursor.forEach((rec) => {
    result.push({
      year: rec._id.year,
      site: rec._id.site,
      product: rec._id.product,
      totalSales: rec.totalSalesAmount,
      totalQty: rec.totalQty,
    });
  });
  console.log(result);
}

async function PrintTotalSalesSite(client, site) {
  const pipeline = [
    {
      $match: {
        terminal_location: site,
      },
    },
    {
      $group: {
        _id: "$terminal_location",
        totalSalesAmount: {
          $sum: "$txn_amount",
        },
      },
    },
  ];

  const aggCursor = client
    .db("torposdb")
    .collection("recuploads")
    .aggregate(pipeline);
  await aggCursor.forEach((rec) => {
    console.log(`${rec._id}: ${rec.totalSalesAmount}`);
  });
}
