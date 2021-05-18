const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION !!! ");
  console.log(err.name, err.message);
  process.exit(1);
});

const app = require("./app");

const db = require("./config/database");

//4. start server
db.authenticate()
  .then(() => {
    console.log("Database connected....");
  })
  .catch((err) => {
    console.log(err);
  });

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`App is running on ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("UNHANDLED REJECTION !!! Shutting down....");
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully");
  server.close(() => {
    console.log("Process Terminated !");
  });
});
