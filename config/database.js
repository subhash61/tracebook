const Sequelize = require("sequelize");

module.exports = new Sequelize("tracebook", "postgres", "password", {
  host: "localhost",
  dialect: "postgres",
});
// module.exports = new Sequelize("postgres://postgres:password:5432/tracebook");
