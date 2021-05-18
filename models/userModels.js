const { Sequelize, DataTypes } = require("sequelize");
// const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = require("../config/database");

const User = db.define("user", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: "A User must have a name",
      },
      notEmpty: {
        args: true,
        msg: "name cannot be empty",
      },
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: {
        args: true,
        msg: "It's not a valid email",
      },
      notNull: {
        msg: "A user must have an email id",
      },
      isLowercase: true,
    },
    unique: {
      args: true,
      msg: "Email address already in use!",
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: "A user must have an password",
      },
      notEmpty: {
        args: true,
        msg: "password cannot be empty",
      },
      len: {
        args: [8],
        msg: "Minimum 8 characters required in password",
      },
    },

    select: false,
  },
  passwordConfirm: {
    type: DataTypes.VIRTUAL,
    allowNull: false,

    validate: {
      notNull: {
        msg: "A user must have an passwordConfirm",
      },
      notEmpty: {
        args: true,
        msg: "name cannot be empty",
      },
      //This only works on . create and save
      checkPassword() {
        if (this.passwordConfirm !== this.password) {
          throw new Error("password  and password confrim are different");
        }
      },
    },
    select: false,
  },
  photo: {
    type: DataTypes.STRING,
    default: "default.jpg",
  },

  createdAt: {
    type: DataTypes.DATE,
    default: Date.now(),
  },
  updatedAt: {
    type: DataTypes.DATE,
    silent: true,
  },
  passwordChangedAt: DataTypes.DATE,
  passwordResetToken: DataTypes.STRING,
  passwordResetExpires: DataTypes.DATE,
});

User.beforeSave(async (user, next) => {
  console.log("beforeSave");
  if (!user.changed("password")) return;
  // return next();

  //Hash the password at the cost of 12
  user.password = await bcrypt.hash(user.password, 12);

  //delete passwordConfirm from the database
  user.passwordConfirm = undefined;
});
User.beforeCreate(function (user, next) {
  if (!user.changed("password") || user.isNewRecord) return;

  console.log("!user.changed(password):", !user.changed("password"));
  user.passwordChangedAt = Date.now() - 1000;
  //console.log('passwordChanged at:', this.passwordChangedAt);
});

User.prototype.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

User.prototype.changedPasswordAfter = function (JWTTimestamp) {
  console.log("changepassword", this);
  if (this.passwordChangedAt) {
    console.log("changepasswordAfter");
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

User.prototype.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto.createHash("Sha256").update(resetToken).digest("hex");
  //console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  console.log(this.passwordResetExpires.getTime());
  return resetToken;
};

module.exports = User;
