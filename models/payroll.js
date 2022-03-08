const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const payrollSchema = mongoose.Schema({
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payee: { type: mongoose.Schema.Types.ObjectId, ref: 'People', required: true },
    empType: {type: String},
    payeeTax: {type: Number},
    company: { type: String },
    type: { type: String },
    payType: { type: String },
    month: {type: String},
    year: {type: Number},
    grossPay: {type: Number},
    netPay: {type: Number},
    bagsBagged: {type: Number},
    bagsLoaded: { type: Number },
    deductions: {type: Number},
    payDate: { type: Date },
    payStartDate: { type: Date },
    payEndDate: { type: Date },
    payItems: [{}],
    notes: [{
        text: { type: String },
        image: { type: String },
        author: { type: String },
        date: { type: Date },
        
    }],
    remarks: {type: String},
    memo: {type: String}
},
{
    timestamps: true,
    strict: true
});

payrollSchema.plugin(AutoIncrement, { inc_field: 'payroll_id' }, { unique: true });

payrollSchema.plugin(uniqueValidator);

payrollSchema.index({ "$**": "text" });

const rc = mongoose.model("Payroll", payrollSchema);
rc.createIndexes();
module.exports = rc;