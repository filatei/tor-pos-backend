// const User = require("../models/user");
// bcrypt = require('bcrypt');
// jwt = require('jsonwebtoken');
const path = require('path');

exports.download = (req, res) => {
    let file = req.query.filename;
    console.log(file)
    file = path.join(__dirname, '..', 'data', file);
    res.download(file); // Set disposition and send it.
}