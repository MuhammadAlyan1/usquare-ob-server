const mongoose = require('mongoose');

const connectDB = () => {
  try {
    mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
};

module.exports = connectDB;
