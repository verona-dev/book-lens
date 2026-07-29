const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Book = sequelize.define("Book", {
       id: {
           type: DataTypes.INTEGER,
           primaryKey: true,
           autoIncrement: true
       },
       
       title: {
           type: DataTypes.STRING,
           allowNull: false
       },
       
       author: {
           type: DataTypes.STRING,
           allowNull: false
       },
       
       genre: {
           type: DataTypes.STRING,
           allowNull: false
       },
       
       year: {
           type: DataTypes.INTEGER,
           allowNull: false
       },
       
       available: {
           type: DataTypes.BOOLEAN,
           defaultValue: true
       }
   },
   {
       tableName: "books",
       timestamps: false
   });

module.exports = Book;
