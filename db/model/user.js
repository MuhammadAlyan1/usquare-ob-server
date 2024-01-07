const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    require: [true, 'Please enter username'],
    unique: [true, 'User already exists']
  },
  email: {
    type: String,
    require: [true, 'Please enter email'],
    unique: [true, 'email already in use']
  },
  password: {
    type: String,
    require: [true, 'Please enter password']
  },
  role: {
    type: String,
    enum: [
      'user',
      'moderator',
      'admin',
      'game developer',
      'content creator',
      'coach',
      'esport elite'
    ],
    default: 'user'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
