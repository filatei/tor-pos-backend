const bcrypt = require("bcryptjs");

const password = "f12345";
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) throw err;
  console.log("Hash:", hash);
});