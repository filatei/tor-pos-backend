const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const peopleSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true, lowercase: false, trim: true, collation: { locale: "en", strength: 3 } },
    fname: {type: String},
    mname: {type: String},
    lname: {type: String},
    
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payrolls: [{type: mongoose.Schema.Types.ObjectId, ref: 'Payroll'}],
    gender: {type: String, enum: ["Male", "Female", "Other"]},
    marital: {type: String, enum: ["Married", "Single", "Not Disclosed"]},
    identification: {type: String},
    nin: { type: String },
    nextOfKin: [{
        name: { type: String },
        phone: { type: String },
        relationship: { type: String },
        
    }],
    
    phone: {type: String},
    department: {type: String, enum: ['ADMINISTRATION', "OPERATION", "TECHNOLOGY", "SECURITY", "SALES", "PRODUCTION", "LOGISTICS"]},
    company: {type: String},
    dob: { type: Date },
    qualification: {type: String},
    reference: {type: mongoose.Schema.Types.ObjectId, ref: 'People'},
    manager: {type: mongoose.Schema.Types.ObjectId, ref: 'People'},
    site: {type: mongoose.Schema.Types.ObjectId, ref: 'Site'},
    
    bankAccount: { type: String, trim: true},
    bankName: { type: String},
    email: {type: String},
    image: {type: String},
    biometric: {type: String},
    phones: [],
    nameOnOdoo: {type: String},
    notes: [{
        text: { type: String },
        image: { type: String },
        author: { type: String },
        date: { type: Date },
        
    }],
    emails: [],
    category: {type: String},
    remarks: {type: String},
    hireDate: {type: Date},
    exitDate: { type: Date },
    baseSalary: {type: Number},
    jobName: {type: String, lowercase: false},
    type: {type: String, enum: ["STAFF", "CONTRACTOR", "OTHER", "REFEREE"]},
    address: {type: String},
    status: {type: String, enum:["ACTIVE", "DORMANT"]},
    
},
{
    timestamps: true,
    strict: true
});

peopleSchema.plugin(AutoIncrement, { inc_field: 'people_id' }, { unique: true });

peopleSchema.plugin(uniqueValidator);

peopleSchema.index({ "$**": "text" });
// peopleSchema.index(
//     {
//         name: "text",
//         bankName: "text",
//         bankAccount: "text",
//         department: "text",
//         jobName: "text",
//         phone: "text",
//         remarks: "text",
//     });
// peopleSchema.set("autoIndex", process.env.Node_Env != "production");

const rc = mongoose.model("People", peopleSchema);
rc.createIndexes({default_language: ""});

module.exports = rc

// module.exports = mongoose.model('People', peopleSchema)