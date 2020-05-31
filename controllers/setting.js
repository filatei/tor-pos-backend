const Setting = require("../models/setting");

const path = require('path')
// const { Parser } = require('json2csv');
var fs = require('fs');

exports.createSetting =  (req, res, next) => {
    let settingObj = req.body;
    settingObj.creator = req.userData.userId; // userData was added to checkAuth middleware and passed along
    let setting = new Setting(settingObj);

   
    // function save the setting
    // 'function saveSetting() {' old method of declaring function

    saveSetting = () => {
      setting.save()
      .then(result => {
        res.status(201).json({
          message: "setting added successfully",
          setting: {
            ...result,
            id: result._id
          }
        });
      })
      .catch(error => {
        console.log(error)
        res.status(500).json({
          message: "saving a setting failed! " + error
        });
      });
    }
  }

  exports.getSettings = (req, res, next) => {
      const pageSize = +req.query.pagesize;
      const dateBegin = req.query.datebegin;
      const dateEnd = req.query.dateend;
      const currentPage = +req.query.page;
      const settingQuery = Setting.find();
      let fetchedSettings;
      if (pageSize && currentPage) {
        settingQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
      }
      settingQuery
        .then(documents => {
          fetchedSettings = documents;
          return Setting.countDocuments();
        })
        .then(count => {  
          return res.status(200).json({
            message: "settings fetched successfully!",
            settings: fetchedSettings,
            maxSettings: count
          });
        })
        .catch(error => {
          return res.status(500).json({
            message: "Fetching settings failed! - " + error
          });
        });
    }
    
   

  exports.getSetting = (req, res, next) => {
    
    // use this if no req.query but req.params defined
    Setting.findById(req.params.id).then(setting => {
      if (setting) {
        res.status(200).json(setting);
      } else {
        res.status(404).json({ message: "setting not found!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching setting failed!" + error
      });
    });
  }

  exports.deleteSetting = (req, res, next) => {
   // console.log('params ', req.params)
    Setting.deleteOne({ _id: req.params.id }).then(result => {
      console.log('deletesetting ', result)
        if (result.n > 0){
        res.status(200).json({ message: "Setting deleted!" });
        }
        else {
        res.status(401).json({ message: "Not Authorised!" });
        }
    })
    .catch(error => {
        res.status(500).json({
        message: "Deleting setting failed!" + error
        });
    });
}

exports.updateSetting =  (req, res, next) => {
    let settingObj = req.body;
    settingObj._id = req.params.id;
    // userData  was added to checkAuth middleware and passed along
    settingObj.updater = req.userData.userId; 
    const setting = new Setting(settingObj);
    
      Setting.updateOne({ _id: req.params.id }, setting)
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't udpate setting!" + error
        });
      });
  }