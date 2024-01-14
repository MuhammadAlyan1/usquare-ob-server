const Map = require('../../db/model/map');

const getZipCodes = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res
      .status(400)
      .json({ success: false, data: {}, message: 'Please enter userId' });
  }

  try {
    const user = await Map.find({ userId });

    if (user.length === 0) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'User does not exists.'
      });
    }

    return res.status(201).json({
      success: true,
      data: user[0],
      message: 'Successfully retrieved zip codes.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: 'Failed to retrieve zip codes'
    });
  }
};

module.exports = getZipCodes;
