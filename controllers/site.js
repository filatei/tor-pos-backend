const Site = require("../models/site");

const mongoose = require('mongoose')

const path = require('path')
var fs = require('fs');

exports.createSite =  (req, res, next) => {
    let siteObj = req.body;
   // zawsw console.log('orderObj ',req)
    // userData was added to checkAuth middleware and passed along
    // console.log('userdata in order ', req.userData)
    // siteObj.creator = req.userData.userId; 
    const site = new Site(siteObj);
    // console.log('order ', order);
      site.save()
      .then(result => {
        res.status(201).json({
          message: "site added successfully",
          order: {
            ...result,
            id: result._id
          }
        });
      })
      .catch(error => {
        res.status(500).json({
          message: "Creating a site failed!"
        });
      });
  }