const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');

const payrollgrpbyyrmonthstatusSchema = mongoose.Schema({
    _id: {},
    payee: {type: String},
    site: {type: String},
    jobName: {type: String},
    bankAccount: {type: String},
    company: { type: String },
    payType: { type: String, enum: ["MONTH-END", "MID-MONTH", "OTHER"]},
    status: { type: String, enum: ["PAID", "UNPAID", "INVALID"]},
    month: {type: String, required:true, enum: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]},
    year: {type: Number, required:true},
    grossPay: {type: Number},
    netPay: {type: Number},
    bagsBagged: {type: Number},
    bagsLoaded: { type: Number },
    deductions: {type: Number},
    daysAbsent: {type: Number},
    daysWorked: { type: Number },
    payDate: { type: Date },
    payStartDate: { type: Date },
    payEndDate: { type: Date },
   
},
{
    timestamps: true,
    strict: true
});

const rc = mongoose.model("Payrollgrpbyyrmonthstatus", payrollgrpbyyrmonthstatusSchema);
module.exports = rc;