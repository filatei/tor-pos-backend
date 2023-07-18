// utils/payroll-aggregations.js
// const mongoose = require('mongoose');
const Payroll = require('../models/payroll');

// Exporting a function that gets unique payTypes for each month of each year
exports.getMonthlyPayTypes = async () =>{
    try {
        const results = await Payroll.aggregate([
            {
                $group: {
                    _id: { year: "$year", month: "$month" },
                    payTypes: { $addToSet: "$payType" }
                }
            },
            {
                $group: {
                    _id: "$_id.year",
                    months: {
                        $push: {
                            month: "$_id.month",
                            payTypes: "$payTypes"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id",
                    months: 1
                }
            }
        ]);

        return results;
    } catch (error) {
        console.error("Error occurred while getting monthly pay types: ", error);
        throw error;
    }
};

exports.getPayrollData = async (year, month, payType) => {
    try {
      if (!year || !month || !payType) {
        return
      }
      let result = await Payroll.aggregate([
        {
          $match: {
            year: year,
            month: month,
            payType: payType,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "creator",
            foreignField: "_id",
            as: "creator",
          },
        },
        // {
        //   $lookup: {
        //     from: "users",
        //     localField: "updater",
        //     foreignField: "_id",
        //     as: "updater",
        //   },
        // },
        {
          $lookup: {
            from: "peoples",
            localField: "payee",
            foreignField: "_id",
            as: "payee",
          },
        },
        {
          $lookup: {
            from: "sites",
            localField: "site",
            foreignField: "_id",
            as: "site",
          },
        },
        {
          $unwind: "$creator",
        },
        // {
        //   $unwind: "$updater",
        // },
        {
          $unwind: "$payee",
        },
        {
          $unwind: "$site",
        },
        {
          $project: {
            "creator._id": 0,
            "updater._id": 0,
            "payee._id": 0,
            "site._id": 0,
          },
        },
      ]);
        
      const results = result?.map(function (currentValue, index) {
        currentValue.sn = index + 1;
        return currentValue;
      });

      return results;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: `Error occurred: ${error.message}` });
    }
  }
  
  // Add more payroll-related aggregation functions here as needed