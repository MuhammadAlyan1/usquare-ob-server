const mongoose = require('mongoose');

const MapSchema = new mongoose.Schema({
  userId: {
    type: String,
    require: [true, 'Please enter userId'],
    unique: [true, 'userId already exists']
  },

  startZip: {
    type: String,
    require: [true, 'Please enter start zip']
  },

  endZip: {
    type: String,
    require: [true, 'Please enter end zip']
  },

  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Map', MapSchema);
