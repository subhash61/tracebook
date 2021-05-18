const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const crypto = require("crypto");

const User = require("../models/userModels");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { promisify } = require("util");
const Email = require("../utils/email");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user.id);

  res.cookie("jwt", token, {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
  });

  //Remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1.) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }
  //2.) check if user exist and password is correct
  const user = await User.findOne({ where: { email }, attributes: ["id", "email", "password"] });

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("email or password is wrong", 401));
  }

  //3.) if everything ok , then send token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedOut", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: "success",
  });
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1. Get user based on Posted email
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user) {
    return next(new AppError("there is no user with the email address", 404));
  }
  //2. Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save();

  //3. Sent it to the user's email address
  const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: "success",
      message: "Token sent to mail",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return next(new AppError("There was an error sending email . Try again later!", 500));
  }
});

exports.protect = catchAsync(async (req, res, next) => {
  //1. getting token and check if it's there
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }

  //2. Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log("decoded.id", decoded.id);

  //3. check if user stil exist
  const currentUser = await User.findByPk(decoded.id);
  if (!currentUser) {
    return next(new AppError(`the user belonging to the token doesn't exist`, 401));
  }

  // 4. check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError("User recently changed password| Please log in again", 401));
  }
  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1.) Get the user based on the token sent on mail
  const hashedToken = crypto.createHash("Sha256").update(req.params.token).digest("hex");

  const user = await User.findOne({
    where: {
      passwordResetToken: { [Op.eq]: hashedToken },
      // passwordResetExpires: { [Op.gt]: Date.now() },
    },
  });
  console.log("user.passwordResetExpires:", user.passwordResetExpires);
  //2.) If token has not expired , and there is a user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3.) Update changedPasswordAt property of the user

  //4.) Log user in , send JWT
  createSendToken(user, 200, req, res);
});
