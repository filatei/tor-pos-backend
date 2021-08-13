const User = require("../models/user");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const MyMail = require("../mail");
const _ = require("lodash");
var multer = require("multer");
const checkAuth = require("../middleware/check-auth");
const Mail = require("nodemailer/lib/mailer");
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

router.post("/verify", async (req, res, next) => {
  // console.log(req.body, "req body");
  try {
    const token = req.body.token;
    // const userid = req.body.userid;
    if (!token) {
      return res.status(500).json({
        message: "token is not defined",
      });
    }
    //  verify token is valid
    jwt.verify(token, process.env.ACCESS_VERIFY_SECRET, (err, data) => {
      console.log(data, " tokenverified", err, " err");
      if (err) {
        return res.status(401).json({
          message: "Incorrect token or token expired",
        });
      }

      User.findOne({ verify: token }, (err, user) => {
        if (err || !user) {
          return res.status(500).json({
            message: "Confirmation Update Not successful",
          });
        }
        const obj = { verify: "", isVerified: true };
        user = _.extend(user, obj); // use lodash to update user

        user.save((err, result) => {
          console.log(result, " again");
          if (err) {
            return res.status(500).json({
              message: "Confirmation Update Not successful",
            });
          }

          return res.status(200).json({
            message: "Confirmation Successful",
            user: result,
          });
        });
      });
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error in main block " + err,
    });
  }
});

router.post("/confirmPassword", async (req, res, next) => {
  // console.log(req.body, "req body");
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(500).json({
        message: "email is required in body",
      });
    }

    User.findOne({ email }, async (err, user) => {
      if (err || !user) {
        return res.status(500).json({
          message: "Email does not exist",
        });
      }
      const token = jwt.sign(
        {
          email: email,
        },
        process.env.ACCESS_RESET_SECRET,
        { expiresIn: "2h" }
      );

      const obj = { resetLink: token };
      user = _.extend(user, obj); // use lodash to update user

      user.save(async (err, result) => {
        console.log(result, " again");
        if (err) {
          return res.status(500).json({
            message: "Reset Link Update Not successful",
          });
        }
        await MyMail.forgotPassword(result._id, result.resetLink);

        return res.status(200).json({
          message: "Confirmation Update Successful " + err,
          user: result,
        });
      });
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error in main block " + err,
    });
  }
});

router.post("/changePassword", async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(500).json({
        message: "token is required in body",
      });
    }

    //  verify resetLink is valid
    jwt.verify(token, process.env.ACCESS_RESET_SECRET, (err, data) => {
      if (err) {
        return res.status(401).json({
          message: "Incorrect token or token expired",
        });
      }

      User.findOne({ resetLink: token }, async (err, user) => {
        if (err || !user) {
          return res.status(500).json({
            message: "Confirmation Update Not successful",
          });
        }

        //  encrypt password
        const hash = await bcrypt.hash(password, 10);

        const obj = { resetLink: "", password: hash };
        user = _.extend(user, obj); // use lodash to update user

        user.save(async (err, result) => {
          console.log(result, " again");
          if (err) {
            return res.status(500).json({
              message: " passwd change Not successful",
            });
          }

          return res.status(200).json({
            message: "passwd change Successful",
            user: result,
          });
        });
      });
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error in main block " + err,
    });
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const vuser = await User.findOne({ email: req.body.email });

    if (!vuser) {
      return res.status(401).json({
        message: "Authentication failed. invalid credentials",
      });
    }

    // is email verified?
    if (vuser && vuser.verify) {
      return res
        .status(500)
        .json({ message: "Your Email not Verified. Check your inbox" });
    }

    // let fetchedsUser = vuser;

    console.log("fetcheduser ", vuser);
    const result = bcrypt.compare(req.body.password, vuser.password);
    if (!result) {
      return res.status(401).json({
        message: "Authentication failed.",
      });
    }
    const token = jwt.sign(
      {
        email: vuser.email,
        userId: vuser._id,
        name: vuser.name,
        role: vuser.role ? vuser.role : null,
        site: vuser.site ? vuser.site : null,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1000h" }
    );

    return res.status(200).json({
      token: token,
      expiresIn: 360000,
      userId: vuser._id,
      email: vuser.email,
      name: vuser.name,
      site: vuser.site,
      role: vuser.role,
      image: vuser.image,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error in code block " + err });
  }
});

router.post("/signup", async (req, res, next) => {
  const verifyToken = jwt.sign(
    {
      email: req.body.email,
      name: req.body.name,
    },
    process.env.ACCESS_VERIFY_SECRET,
    { expiresIn: 2000 * 60 } // 2 mins
  );

  bcrypt.hash(req.body.password, 10).then((hash) => {
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hash,
      verify: verifyToken,
    });

    user
      .save()
      .then(async (result) => {
        // console.log(result);
        delete result.password;
        await MyMail.verifyAuth(result._id, result.verify);
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

router.delete("/:id", checkAuth, async (req, res, next) => {
  if (!req.params.id) return res.status(401).json({ error: "empty id" });
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete Receipts");
    return res.status(500).json({ message: "Not allowed" });
  }

  User.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        message: "Deleting receipt failed!",
      });
    });
});

module.exports = router;
