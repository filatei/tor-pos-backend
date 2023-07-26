// utils/payroll-aggregations.js
// const mongoose = require('mongoose');
const Payroll = require('../models/payroll');

// Exporting a function that gets unique payTypes for each month of each year
// exports.getMonthlyPayTypes = async () => {
    
//     try {
//         const results = await Payroll.aggregate([
//             {
//                 $group: {
//                     _id: { year: "$year", month: "$month" },
//                     payTypes: { $addToSet: "$payType" }
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$_id.year",
//                     months: {
//                         $push: {
//                             month: "$_id.month",
//                             payTypes: "$payTypes"
//                         }
//                     }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     year: "$_id",
//                     months: 1
//                 }
//             }
//         ]);

//         return results;
//     } catch (error) {
//         console.error("Error occurred while getting monthly pay types: ", error);
//         throw error;
//     }
// };

exports.getMonthlyPayTypes = async () => {
    try {
        const results = await Payroll.aggregate([
            {
                $group: {
                    _id: { year: "$year", month: "$month" },
                    payTypes: { $addToSet: "$payType" }
                }
            },
            {
                $addFields: {
                    monthNumber: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$_id.month", "January"] }, then: 1 },
                                { case: { $eq: ["$_id.month", "February"] }, then: 2 },
                                { case: { $eq: ["$_id.month", "March"] }, then: 3 },
                                { case: { $eq: ["$_id.month", "April"] }, then: 4 },
                                { case: { $eq: ["$_id.month", "May"] }, then: 5 },
                                { case: { $eq: ["$_id.month", "June"] }, then: 6 },
                                { case: { $eq: ["$_id.month", "July"] }, then: 7 },
                                { case: { $eq: ["$_id.month", "August"] }, then: 8 },
                                { case: { $eq: ["$_id.month", "September"] }, then: 9 },
                                { case: { $eq: ["$_id.month", "October"] }, then: 10 },
                                { case: { $eq: ["$_id.month", "November"] }, then: 11 },
                                { case: { $eq: ["$_id.month", "December"] }, then: 12 }
                            ],
                            default: 0
                        }
                    }
                }
            },
            {
                $sort: { monthNumber: 1 }
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
            },
            { $sort: { year: 1 } }
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
        console.log(results[0].payType)

      return results;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: `Error occurred: ${error.message}` });
    }
  }
  
  // Add more payroll-related aggregation functions here as needed