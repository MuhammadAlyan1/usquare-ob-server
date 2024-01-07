const User = require('../../db/model/user');
const bcrypt = require('bcrypt');

async function signup(req, res) {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res
      .status(400)
      .json({ success: false, data: {}, message: 'Please enter all fields.' });
  }

  try {
    // Check if the username already exists in the database
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Username already exists.'
      });
    }

    // Check if the email already exists in the database
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Email is already in use.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
      role: 'user'
    });

    return res.status(201).json({
      success: true,
      data: newUser,
      message: 'Successfully created new user'
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      success: false,
      data: {},
      message: 'There was an error while creating an account'
    });
  }
}

module.exports = signup;
