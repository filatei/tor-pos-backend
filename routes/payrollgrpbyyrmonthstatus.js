const express = require("express");
const mongoose = require("mongoose");
const {MongoClient} = require('mongodb');
/**
 * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
 * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
 */
 

const Payroll = require("../models/payroll");
const Site = require("../models/site");
const People = require("../models/people");
const Accesslog = require("../models/accesslog");
const router = express.Router();
const Path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const dbInfo = require(`${homedir}/.db.json`);
const csv = require('fast-csv');
const moment = require('moment');
const Mail = require('../mail');
const Payrollgrpbyyrmonthstatus = require('../models/payrollgrpbyyrmonthstatus')

const checkAuth = require("../middleware/check-auth");
const e = require("express");
let client;


if ( hostname.includes('local') ) {
    const uri = process.env.CONNECT_STR;
    client = new MongoClient(uri);

    
 
 }
 
 if ( hostname.includes('torama.ng') ) {
    username = encodeURIComponent(`${dbInfo.ATLAS_PROD_USER}`);
    password = encodeURIComponent(`${dbInfo.ATLAS_PROD_PASS}`);
    cluster = `${dbInfo.ATLAS_PROD_CLUSTER}`;
    DB = `${dbInfo.ATLAS_PROD_DB}`;
    connectStr = `mongodb+srv://${username}:${password}@${cluster}/${DB}?retryWrites=true&w=majority`;
    const uri = connectStr;
    client = new MongoClient(uri);
}
 

router.get("",  checkAuth, async (req, res, next) => {
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        // Make the appropriate DB calls
        const dbs = await  listDatabases(client);
        console.log(dbs, 'dbs')
 
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

router.get("/getGroup1",  checkAuth, async (req, res, next) => {
    try {
        const {monthYr, payType, payStatus} = req.query
        console.log(monthYr, payType, payStatus)
        let query = {}
        if (monthYr) {
            query =   {"_id.monthYr":monthYr}
        } 
        
        if (payStatus) {
            query.status = payStatus;
        }

        if (payType) {
            query.payType =  query.payType;
        }

        // Connect to the MongoDB cluster
        await client.connect();
      

        const coll = client.db("fido_db")
                        .collection("payrollgrpbyyrmonthstatus");
        const docs = await coll.find(query);
        let result = []
         docs.forEach(pay => {
            result.push(pay);
            // console.log(pay)
            // console.log(`${pay.netPay}: ${pay.payee} : ${pay.month}-${pay.year}: ${pay.payType}: ${pay.status}: ${pay.grossPay}`);
          }).then( () => {
            
             res.status(200).json({
                message: "Payroll Aggregates Result ", payrolls: result
              }); 
             
          }).then(() => {
            return client.close();
          })
         

         
 
    } catch (e) {
        console.error(e);
    } finally {
        // await client.close();
    }

})

async function listDatabases(client){
    databasesList = await client.db().admin().listDatabases();
 
    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};

module.exports = router;
