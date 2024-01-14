const Map = require('../../db/model/map');

const setZipCodes = async (req, res) => {
  const { startZip, endZip, userId } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, data: {}, message: 'Please enter userId' });
  }

  if (!startZip || !endZip) {
    return res.status(400).json({
      success: false,
      data: {},
      message: 'Please enter startZip and endZip'
    });
  }

  if (startZip.length !== 5 || endZip.length !== 5) {
    return res.status(400).json({
      success: false,
      data: {},
      message: 'startZip or endZip is invalid'
    });
  }

  try {
    const user = await Map.find({ userId });

    if (user.length !== 0) {
      await Map.updateOne(
        { userId },
        {
          startZip,
          endZip
        }
      );

      return res.status(201).json({
        success: true,
        data: {},
        message: 'Successfully updated zip codes.'
      });
    }

    const response = await Map.create({
      userId,
      startZip,
      endZip
    });

    console.log(response);
    return res.status(201).json({
      success: true,
      data: response,
      message: 'Successfully saved zip codes.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: 'Failed to save zip codes'
    });
  }
};

module.exports = setZipCodes;
