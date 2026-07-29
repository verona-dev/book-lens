const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("library", "root", "", {
    host: "localhost",
    dialect: "mysql",
    port: 3309,
    logging: false
});

module.exports = sequelize;
