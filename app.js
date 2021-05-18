const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const userRouter = require("./routes/userRoutes");

const app = express();

//app.enable('trust proxy');
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

//1. GLOBAL MIDDLEWARES
//Serving static files
app.use(express.static(path.join(__dirname, `public`)));

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/api/v1/users", userRouter);

module.exports = app;
