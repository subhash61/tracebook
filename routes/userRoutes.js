const express = require("express");

const router = express.Router();
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

router.post(`/signup`, authController.signup);
router.post(`/login`, authController.login);
router.get(`/logout`, authController.logout);
router.post(`/forgotPassword`, authController.forgotPassword);
router.patch(`/resetPassword/:token`, authController.resetPassword);

router.use(authController.protect);
router.patch(`/updateMe`, userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe);

module.exports = router;
