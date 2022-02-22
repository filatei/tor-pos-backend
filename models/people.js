const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const peopleSchema = mongoose.Schema({
    fname: {type: String, required: true, unique: true, lowercase: false, trim: true, collation:{ locale: "en", strength: 3 }},
    mname: {type: String},
    lname: {type: String, required: true, unique: true, lowercase: false, trim: true, collation:{ locale: "en", strength: 3 }},
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payrolls: [{type: mongoose.Schema.Types.ObjectId, ref: 'Payroll'}],
    
    phone: {type: String},
    department: {type: String},
    dob: { type: Date },
    qualification: {type: String},
    reference: {type: mongoose.Schema.Types.ObjectId, ref: 'People'},
    manager: {type: mongoose.Schema.Types.ObjectId, ref: 'People'},
    site: {type: mongoose.Schema.Types.ObjectId, ref: 'Site'},
    
    bankAccount: { type: String},
    bankName: { type: String},
    email: {type: String},
    image: {type: String},
    biometric: {type: String},
    phones: [],
    emails: [],
    category: {type: String},
    site: {type: String},
    hireDate: {type: Date},
    endDate: { type: Date },
    baseSalary: {type: Number},
    jobName: {type: String},
    type: {type: String, enum: ["Staff", "Contractor"],},
    address: {type: String},
    
},
{
    timestamps: true,
    strict: true
});

peopleSchema.plugin(AutoIncrement, { inc_field: 'people_id' });

peopleSchema.set('autoIndex', process.env.Node_Env != 'production');
peopleSchema.plugin( uniqueValidator );

module.exports = mongoose.model('People', peopleSchema)