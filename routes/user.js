
const User = require("../models/user");
const express = require("express");
const { clerkClient } = require('@clerk/express');

const router = express.Router();
// google oauth stuff
const os = require("os");
const fs = require("fs");
const homedir = os.homedir();
const fia_googleInfo = require(`${homedir}/.google_client_secret_fia.json`);
const FIA_GOOGLE_CLIENT_ID = fia_googleInfo.client_id;
const FIA_GOOGLE_CLIENT_SECRET = fia_googleInfo.client_secret;
const { OAuth2Client } = require('google-auth-library');
const fia_client = new OAuth2Client(FIA_GOOGLE_CLIENT_ID);

const fido_googleInfo = require(`${homedir}/.google_client_secret_fido.json`);
const FIDO_GOOGLE_CLIENT_ID = fido_googleInfo.client_id;
const fido_client = new OAuth2Client(FIDO_GOOGLE_CLIENT_ID);

// clerk oauth stuff
const { verifyClerkToken } = require('../utils/clerk');


const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const hostname = os.hostname();
const MyMail = require("../mail");
const _ = require("lodash");




var multer = require("multer");
const checkAuth = require("../middleware/check-auth");
const Mail = require("nodemailer/lib/mailer");
const DIR = "/var/www/uploads/userimages/";
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

// router.post("/verify", async (req, res, next) => {
//   try {
//     const { token, otp: inputOtp } = req.body;

//     if (!token || !inputOtp) {
//       return res.status(400).json({
//         success: false,
//         message: "Token and OTP are required",
//       });
//     }

//     const vUser = await User.findOne({ verify: token });
//     if (!vUser) {
//       return res.status(404).json({
//         success: false,
//         message: "No user found with this verification token",
//       });
//     }

//     // Verify OTP
//     const isOtpValid = await bcrypt.compare(inputOtp.toString(), vUser.otp);
//     if (!isOtpValid) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }

//     // Update user
//     vUser.verify = "";
//     vUser.isVerified = true;
//     vUser.otp = "";

//     const savedUser = await vUser.save();
//     if (!savedUser) {
//       throw new Error("Failed to save user verification");
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Verification successful",
//       result: _.omit(savedUser.toObject(), ['password', 'otp']),
//     });

//   } catch (err) {
//     console.error("Verification error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred during verification",
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined,
//     });
//   }
// });

router.post("/verify", async (req, res, next) => {
  // console.log(req.body, "req body");
  try {
    const token = req.body.token;
    if (!token) {
      return res.status(500).json({
        message: "token is not defined",
      });
    }

    let vUser = await User.findOne({ verify: token });

    if (!vUser) {
      return res.status(400).json({
        message: "No such user",
      });
    }

    // verify otp
    const otp = req.body.otp + '';

    console.log(otp, vUser.otp);
    const vOtp = await bcrypt.compare(otp, vUser.otp);
    // continue only if vOtp is valid
    console.log(vOtp);

    if (vOtp) {
      console.log('OTP verified')
      const obj = { verify: "", isVerified: true, otp: "" };
      vUser = _.extend(vUser, obj); // use lodash to update user

      const saved = await vUser.save();
      if (saved) {
        console.log(saved)
        return res.status(200).json({
          message: "Confirmation successful",
          result: saved
        });
      } else {
        return res.status(500).json({
          message: "Confirmation Update Not successful",
        });
      }

    } else {
      return res.status(500).json({
        message: "Wrong Entry!",
      });
    }
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

      const a = Math.floor(Math.random() * (9 - 1 + 1)) + 1;
      const b = Math.floor(Math.random() * (9 - 1 + 1)) + 1;
      const c = Math.floor(Math.random() * (9 - 1 + 1)) + 1;
      const d = Math.floor(Math.random() * (9 - 1 + 1)) + 1;
      // const otp = (a + '') + (b + '') + (c + '') + (d + '');
      const otp = `${a}${b}${c}${d}`;
      // convert otp to hash

      const salt = await bcrypt.genSalt(10)
      const otpHash = await bcrypt.hash(otp, salt)

      const obj = { resetLink: token, verify: token, otp: otpHash };
      user = _.extend(user, obj); // use lodash to update user

      user.save(async (err, result) => {
        console.log(result, " again");
        if (err) {
          return res.status(500).json({
            message: "Reset Link Update Not successful",
          });
        }

        await MyMail.forgotPassword(result._id, otp);

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
        message: "Authentication failed. Invalid credentials",
      });
    }

    // is email verified?
    if (vuser && vuser.verify) {
      return res
        .status(500)
        .json({ message: "Your Email not Verified. Check your inbox" });
    }

    const result = await bcrypt.compare(req.body.password, vuser.password);
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
    console.log(err)
    return res.status(500).json({ message: "Error in code block " + err });
  }

});

router.post("/googleLogin", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const ticket = await fido_client.verifyIdToken({
      idToken: idToken,
      audience: FIDO_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: userId, email, name, picture } = payload;

    let user = await User.findOneAndUpdate({ email }, {
      email,
      name,
      image: picture,
      userId,
    }, { new: true, upsert: true });

    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id,
        name: user.name,
        role: user.role,
        site: user.site
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1000h" }
    );

    return res.status(200).json({
      token,
      expiresIn: 360000,
      userId: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error in code block " + err });
  }
});

// router.post('/clerk-login', async (req, res) => {
//   console.log(req.body, 'req.body clerk-login')
//   const { email, name, image } = req.body;

//   try {
//     let user = await User.findOne({ email });

//     if (!user) {
//       user = await User.create({ email, name, image });
//     } else {
//       user.lastLogin = new Date();
//       user.provider = "clerk";
//       await user.save();
//     }

//     const token = jwt.sign(
//       {
//         email: user.email,
//         userId: user._id,
//         name: user.name,
//       },
//       process.env.ACCESS_TOKEN_SECRET,
//       { expiresIn: '1000h' }
//     );

//     return res.json({ token });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: 'Error creating token' });
//   }
// });
router.post('/clerk-login',  async (req, res) => {

  try {
    // 1. Extract Bearer token
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }
    const token = auth.split(' ')[1];
    console.log(token, 'token from clerk login')

    // 2. Verify it locally
    const fromClerkSession = await verifyClerkSession(token);
    console.log(fromClerkSession, 'fromClerkSession from clerk login')
    const { sub: userId } = fromClerkSession;
    console.log(userId, 'userId from clerk login')

    // 3. Fetch full user profile from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);
    console.log(clerkUser, 'clerkUser from clerk login')
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const name  = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
    const image = clerkUser.imageUrl;

    if (!email) {
      return res.status(400).json({ message: 'Clerk user missing email' });
    }

    // 4. Upsert into your MongoDB
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name, image });
    } else {
      user.lastLogin = new Date();
      user.provider  = 'clerk';
      await user.save();
    }

    // 5. Issue your own JWT for backend auth
    const backendToken = jwt.sign(
      { email: user.email, userId: user._id, name: user.name },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1000h' }
    );

    return res.json({ token: backendToken });
  } catch (err) {
    console.error('Clerk login error:', err);
    return res.status(500).json({ message: 'Error verifying Clerk token or creating JWT' });
  }
});

router.post('/clerk-protected', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).end();
  }

  const token = auth.replace(/^Bearer\s+/, '');
  console.log(token, 'token from clerk protected')
  try {
    const payload = await verifyClerkToken(token);
    console.log(payload, 'payload from clerk protected')
    const userId = payload.sub;

    const user = await clerkClient.users.getUser(userId);
    // Now you can read:
    // user.emailAddresses[0].emailAddress
    // user.firstName / user.lastName
    // user.primaryPhoneNumber
    // user.publicMetadata.locale
    const email = user.emailAddresses?.[0]?.emailAddress;
    const name  = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const image = user.imageUrl;

    const existingUser = await User.findOne({ email: email });
    // user has no site, so we need to get it from the publicMetadata
    if (existingUser && !existingUser.site) {
      userSite = user.publicMetadata.site;
    }

    const update = { userId, name, image, email, provider: 'clerk', lastLogin: new Date(), site: userSite };
    let doc = await User.findOneAndUpdate({ email: email }, update, {
      new: true,
      upsert: true // Make this update into an upsert
    });
    console.log(doc, 'saveddoc from clerk protected')

    // payload.uid is the Clerk user ID, payload.sid is session ID, etc.
    res.status(200).json(doc);
  } catch (err) {
    console.error('JWT verify error:', err);
    res.status(401).json({ error: err.message });
  }
});




router.post("/fidoLogin", async (req, res, next) => {
  try {
    // console.log(req.body, "users/login");
    const { idToken } = req.body;
    let userId, email, name;
    // console.log(idToken, 'idToken')
    // secret is google_secret
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const ticket = await fia_client.verifyIdToken({
      idToken: idToken,
      audience: FIA_GOOGLE_CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });

    const payload = ticket.getPayload();
    userId = payload['sub'];
    email = payload['email'];
    const email_verified = payload['email_verified'];
    const family_name = payload['family_name'];
    const given_name = payload['given_name'];
    const picture = payload['picture'];
    name = payload['name'];
    const hd = payload['hd']; // domain

    // If request specified a G Suite domain:
    // const domain = payload['hd'];

    // we need to store userId, email, name, 
    const update = { userId, name, domain: hd, image: picture, email };
    let doc = await User.findOneAndUpdate({ email: email }, update, {
      new: true,
      upsert: true // Make this update into an upsert
    });
    console.log(doc, 'doc fido')
    // const vuser = await User.findOne({ email: email });
    // console.log(vuser, 'vuser')

    // is user in DB?
    // if user not in DB, store it and send new user (Welcome) signal to frontend
    // if user in DB, send 'Welcome Back' signal to frontend
    //  in both cases, create token and send token to frontEnd
    //  get email, name, givenName, familyName, imageUrl from idToken or DB and 
    //  store them in DB and then use them below
    //  new user wont have role or site  yet

    const token = jwt.sign(
      {
        email,
        userId: doc._id,
        role: doc.role,
        site: doc.site
      },
      secret,
      { expiresIn: "1000h" }
    );

    return res.status(200).json({
      token: token,
      expiresIn: 360000,
      userId: doc._id,
      name, image: picture,
      email, doc
    });
  } catch (err) {
    return res.status(500).json({ message: "Error in code block " + err });
  }
});

router.post("/fiaLogin", async (req, res, next) => {
  try {
    // console.log(req.body, "users/login");
    const { idToken } = req.body;
    let userId, email, name;
    // console.log(idToken, 'idToken')
    // secret is google_secret
    const secret = FIA_GOOGLE_CLIENT_SECRET;
    const ticket = await fia_client.verifyIdToken({
      idToken: idToken,
      audience: FIA_GOOGLE_CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });

    const payload = ticket.getPayload();
    userId = payload['sub'];
    email = payload['email'];
    const email_verified = payload['email_verified'];
    const family_name = payload['family_name'];
    const given_name = payload['given_name'];
    const picture = payload['picture'];
    name = payload['name'];
    const hd = payload['hd']; // domain

    // If request specified a G Suite domain:
    // const domain = payload['hd'];

    // we need to store userId, email, name, 
    const update = { userId, name, domain: hd, image: picture, email };
    let doc = await User.findOneAndUpdate({ email: email }, update, {
      new: true,
      upsert: true // Make this update into an upsert
    });
    console.log(doc, 'doc')
    // const vuser = await User.findOne({ email: email });
    // console.log(vuser, 'vuser')


    // is user in DB?
    // if user not in DB, store it and send new user (Welcome) signal to frontend
    // if user in DB, send 'Welcome Back' signal to frontend
    //  in both cases, create token and send token to frontEnd
    //  get email, name, givenName, familyName, imageUrl from idToken or DB and 
    //  store them in DB and then use them below
    //  new user wont have role or site  yet

    const token = jwt.sign(
      {
        email,
        userId: doc._id,
        role: doc.role,
        site: doc.site
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1000h" }
    );

    return res.status(200).json({
      token: token,
      expiresIn: 360000,
      userId: doc._id,
      name, image: picture,
      email,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error in code block " + err });
  }
});
// router.post("/signup", async (req, res) => {
//   try {
//     const { email, name, phone, password } = req.body;

//     // Basic validation
//     if (!email || !name || !phone || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     // Generate verification token
//     const verifyToken = jwt.sign(
//       { email, name },
//       process.env.ACCESS_VERIFY_SECRET,
//       { expiresIn: '20m' } // 20 minutes
//     );

//     // Generate OTP
//     const otp = Array.from({ length: 4 }, () =>
//       Math.floor(Math.random() * 9) + 1
//     ).join('');

//     // Hash OTP and password
//     const salt = await bcrypt.genSalt(10);
//     const [otpHash, passwordHash] = await Promise.all([
//       bcrypt.hash(otp, salt),
//       bcrypt.hash(password, salt)
//     ]);

//     // Create user
//     const user = new User({
//       name,
//       email,
//       image: 'assets/images/no-person.png',
//       password: passwordHash,
//       verify: verifyToken,
//       phone,
//       otp: otpHash
//     });

//     const savedUser = await user.save();
//     console.log(savedUser, 'savedUser')

//     // try {
//     //   await MyMail.verifyAuth(savedUser._id, savedUser.verify, otp);
//     // } catch (mailError) {
//     //   console.error("Failed to send verification email:", mailError);
//     //   // Don't fail the request - just log the error
//     // }

//     return res.status(201).json({
//       success: true,
//       message: "User created successfully",
//       result: _.omit(savedUser.toObject(), ['password']),
//     });

//   } catch (err) {
//     console.error("Signup error:", err);

//     // Handle duplicate key errors (like duplicate email)
//     if (err.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: "User with this email already exists",
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Failed to create user",
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined,
//     });
//   }
// });

router.post("/signup", async (req, res, next) => {
  const verifyToken = jwt.sign(
    {
      email: req.body.email,
      name: req.body.name,
    },
    process.env.ACCESS_VERIFY_SECRET,
    { expiresIn: 2000 * 600 } // 20 mins
  );

  const phone = req.body.phone;
  const a = Math.floor(Math.random() * (9 - 1 + 1)) + 1;
  const b = Math.floor(Math.random() * (9 - 1 + 1)) + 1;
  const c = Math.floor(Math.random() * (9 - 1 + 1)) + 1;
  const d = Math.floor(Math.random() * (9 - 1 + 1)) + 1;
  // const otp = (a + '') + (b + '') + (c + '') + (d + '');
  const otp = `${a}${b}${c}${d}`;
  // convert otp to hash

  const salt = await bcrypt.genSalt(10)
  const otpHash = await bcrypt.hash(otp, salt)
  console.log(otp, 'otp', 'hash ', otpHash)

  bcrypt.hash(req.body.password, 10).then((hash) => {
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      image: 'assets/images/no-person.png',
      password: hash,
      verify: verifyToken,
      phone,
      otp: otpHash
    });



    user
      .save()
      .then(async (result) => {


        res.status(201).json({
          message: "User created!",
          result: _.omit(result.toObject(), ['password']),
          otp
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

  try {
    let userObj = req.body;
    userObj._id = req.params.id;
    // userData  was added to checkAuth middleware and passed along
    // console.log('id params', req.params.id)
    let url = "";
    let path;
    if (!req.body.name || !req.body.email) {
      return res.status(500).json({
        message: "Empty Update request. name or email cant be empty "
      });
    }
    if (req.file) {
      if (hostname.includes("torama")) {
        url = "https://fido-api.torama.ng";
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

  } catch (error) {
    return res.status(401).json({
      message: "Error " + error
    });

  }

});

router.put("/updateRole/:id", checkAuth, async (req, res, next) => {
  if (req.userData.role !== "ADMIN") {
    return res.status("401").json({ message: "not Allowed" });
  }

  try {
    console.log(req.body);
    const { role, site, name } = req.body;
    let updatedObj;
    console.log(role, site, "role, site");
    if (role) {
      updatedObj = { ...updatedObj, role };
    }
    if (site) {
      updatedObj = { ...updatedObj, site };
    }
    if (name) {
      updatedObj = { ...updatedObj, name };
    }

    const id = req.params.id;
    const updater = req.userData.userId;

    const updatedUser = await User.findByIdAndUpdate(id, { ...updatedObj });
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

router.put("/resetUserPassword/:id", checkAuth, async (req, res, next) => {
  if (req.userData.role !== "ADMIN") {
    return res.status("401").json({ message: "not Allowed" });
  }

  try {
    console.log(req.body);


    const id = req.params.id;
    const updater = req.userData.userId;
    const updatedHash = await bcrypt.hash("123456", 10);

    const updatedUser = await User.findByIdAndUpdate(id, { password: updatedHash });
    if (updatedUser) {
      console.log(updatedUser, "updatedUser")
      res
        .status(200)
        .json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not updated!" });
    }
  } catch (err) {
    res.status(500).json({
      message: "Couldn't update user password! " + err,
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
  // if (req.userData.role !== "ADMIN") {
  //   return res.status("401").json({ message: "not Allowed" });
  // }

  try {
    const users = await User.find({}, { name: { $toUpper: "$name" }, email: 1, role: 1, site: 1, image: 1, _id: 1 }).sort({ name: 1 }).lean();
    if (users) {
      // users = users.map(u => u.name==='Akpodigha Filatei'?u.name='MD':null)
      { $toUpper: "$item" }

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
    const user = await User.findById(req.params.id, { name: 1, email: 1, role: 1, site: 1 });
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
  const alloweds = process.env.DIRECTORS;

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

// Add this at the end of your routes
router.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});


module.exports = router;
