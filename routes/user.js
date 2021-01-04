const User = require("../models/user");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
var multer = require("multer");
const DIR = "./uploads/userimages/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =
      new Date().getTime() +
      "-" +
      file.originalname.toLowerCase().split(" ").join("-") +
      ".jpg";
    console.log(fileName);
    cb(null, fileName);
  },
});

// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/gif" ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .gif, .png, .jpg and .jpeg format allowed!"));
    }
  },
});
const checkAuth = require("../middleware/check-auth");

router.post("/login", (req, res, next) => {
  let fetchedUser;
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        return res.status(401).json({
          message: "Authentication failed. invalid credentials",
        });
      }
      fetchedUser = user;
      console.log("fetcheduser ", fetchedUser);
      return bcrypt.compare(req.body.password, user.password);
    })
    .then((result) => {
      if (!result) {
        return res.status(401).json({
          message: "Authentication failed.",
        });
      }
      const token = jwt.sign(
        {
          email: fetchedUser.email,
          userId: fetchedUser._id,
          name: fetchedUser.name,
          role: fetchedUser.role ? fetchedUser.role : null,
          site: fetchedUser.site ? fetchedUser.site : null,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1000h" }
      );
      res.status(200).json({
        token: token,
        expiresIn: 360000,
        userId: fetchedUser._id,
        email: fetchedUser.email,
        name: fetchedUser.name,
        site: fetchedUser.site,
        role: fetchedUser.role,
        image: fetchedUser.image,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        message: "invalid auth credentials! " + err,
      });
    });
});

router.post("/signup", (req, res, next) => {
  bcrypt.hash(req.body.password, 10).then((hash) => {
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hash,
    });
    user
      .save()
      .then((result) => {
        // console.log(result)
        res.status(201).json({
          message: "User created!",
          result: result,
        });
      })
      .catch((err) => {
        res.status(500).json({
          message: "Invalid authentication credentials! " + err,
        });
      });
  });
});

router.put("/:id", checkAuth, upload.single("image"), (req, res, next) => {
  let userObj = req.body;
  userObj._id = req.params.id;
  // userData  was added to checkAuth middleware and passed along
  // console.log('id params', req.params.id)
  let url = "";
  let path;
  if (!req.body.name || !req.body.email) {
    return res.status(500).json({
      message: "Empty Update request. name or email cant be empty " + error,
    });
  }
  if (req.file) {
    if (hostname.includes("torama")) {
      url = "https://api.torama.ng";
    } else {
      url = req.protocol + "://" + req.get("host");
    }
    path = url + "/uploads/userimages/" + req.file.filename;
  }

  console.log(path, "path");

  userObj.updater = req.userData.userId;
  if (path) {
    userObj.image = path;
  }

  // console.log (userObj);
  const user = new User(userObj);
  User.updateOne({ _id: req.params.id }, user)
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!", user: user });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update user! " + error,
      });
    });
});

router.put("/updateRole/:id", checkAuth, async (req, res, next) => {
  if (req.userData.role !== "ADMIN") {
    return res.status("401").json({ message: "not Allowed" });
  }

  try {
    console.log(req.body);
    const { role, site } = req.body;
    let updatedObj;
    console.log(role, site, "role, site");
    if (role) {
      updatedObj = { ...updatedObj, role };
    }
    if (site) {
      updatedObj = { ...updatedObj, site };
    }
    console.log("updatedobj", updatedObj);

    const id = req.params.id;
    const updater = req.userData.userId;
    console.log("updating user ", updatedObj, id, updater);

    const updatedUser = await User.findByIdAndUpdate(id, { ...updatedObj });
    console.log(updatedUser, "updated user");
    if (updatedUser) {
      res
        .status(200)
        .json({ message: "Update successful!", user: updatedUser });
    } else {
      res.status(401).json({ message: "Not updated!" });
    }
  } catch (err) {
    res.status(500).json({
      message: "Couldn't update user! " + err,
    });
  }
});

router.post("/getuser", checkAuth, (req, res, next) => {
  res.json({
    email: req.userData.email,
    userid: req.userData.userId,
    name: req.userData.name,
    role: req.userData.role,
    site: req.userData.site,
  });
});

router.get("", checkAuth, async (req, res, next) => {
  if (req.userData.role !== "ADMIN") {
    return res.status("401").json({ message: "not Allowed" });
  }
  console.log(req.userData);

  try {
    const users = await User.find();
    if (users) {
      return res.status(200).json({
        users: users,
      });
    } else {
      return res.status(500).json({
        message: "No users found",
      });
    }
  } catch (err) {
    return res.status(500).json({
      message: "Error in user block ",
    });
  }
});

router.get("/:id", checkAuth, async (req, res, next) => {
  if (req.userData.role !== "ADMIN") {
    return res.status("401").json({ message: "not Allowed" });
  }
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      delete user.password;
      return res.status(200).json({ user });
    } else {
      return res.status(500).json({ message: "error getting user" });
    }
  } catch (err) {
    return res.status(500).json({ message: "error getting user" + err });
  }
});

module.exports = router;
