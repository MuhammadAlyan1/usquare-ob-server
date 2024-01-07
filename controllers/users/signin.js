function signin(req, res) {
  res.status(200).json({ success: true, data: 'signin success' });
}

module.exports = signin;
