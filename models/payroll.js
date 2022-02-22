const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const payrollSchema = mongoose.Schema({
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'People' },
    grossPay: {type: Number},
    netPay: {type: Number},
    bags: {type: Number},
    loads: { type: Number },
    baseSalary: {type: Number},
    deductions: {type: Number},
    payDate: { type: Date },
    payItems: [{}]
},
{
    timestamps: true,
    strict: true
});

payrollSchema.plugin(AutoIncrement, { inc_field: 'payroll_id' });

payrollSchema.set('autoIndex', process.env.Node_Env != 'production');
payrollSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Payroll', payrollSchema)