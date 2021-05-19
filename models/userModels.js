const { Sequelize, DataTypes } = require('sequelize');
// const validator = require("validator");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const db = require('../config/database');

const User = db.define('user', {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'A User must have a name',
      },
      notEmpty: {
        args: true,
        msg: 'name cannot be empty',
      },
    },
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isEmail: {
        args: true,
        msg: "It's not a valid email",
      },
      notNull: {
        msg: 'A user must have an email id',
      },
      isLowercase: true,
    },
    unique: {
      args: true,
      msg: 'Email address already in use!',
    },
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'A user must have an password',
      },
      notEmpty: {
        args: true,
        msg: 'password cannot be empty',
      },
      len: {
        args: [8],
        msg: 'Minimum 8 characters required in password',
      },
    },

    select: false,
  },
  passwordConfirm: {
    type: Sequelize.VIRTUAL,

    validate: {
      //This only works on . create and save
      checkPassword() {
        if (this.passwordConfirm !== this.password) {
          throw new Error('password  and password confrim are different');
        }
      },
    },
    select: false,
  },
  photo: {
    type: Sequelize.STRING,
    defaultValue: 'default.jpg',
  },

  createdAt: {
    type: Sequelize.DATE,
  },
  updatedAt: {
    type: Sequelize.DATE,
  },
  passwordChangedAt: Sequelize.DATE,
  passwordResetToken: Sequelize.STRING,
  passwordResetExpires: Sequelize.DATE,
});

User.beforeSave(async (user) => {
  console.log('beforeSave');
  if (!user.changed('password')) return;
  // return next();

  //Hash the password at the cost of 12
  user.password = await bcrypt.hash(user.password, 12);

  //delete passwordConfirm from the database
  user.passwordConfirm = undefined;
  console.log(
    'passwordResetExpires',
    user.passwordResetExpires,
    'passwordResetToken',
    user.passwordResetToken
  );
});
User.beforeSave(function (user) {
  if (!user.changed('password') || user.isNewRecord) return;

  console.log('!user.changed(password):', !user.changed('password'));
  user.passwordChangedAt = Date.now() - 1000;
  //console.log('passwordChanged at:', this.passwordChangedAt);
});

User.prototype.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

User.prototype.changedPasswordAfter = function (JWTTimestamp) {
  console.log('changepasswordafter', JWTTimestamp);

  if (this.passwordChangedAt) {
    console.log('changepasswordAfter', typeof this.passwordChangedAt);
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log('this.passwordChangedAt:', this.passwordChangedAt);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

User.prototype.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('Sha256')
    .update(resetToken)
    .digest('hex');
  //console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  console.log(this.passwordResetExpires.getTime());
  return resetToken;
};

module.exports = User;
