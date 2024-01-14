const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const cors = require('cors');
const { default: mongoose } = require('mongoose');
const mapRouter = require('./routes/map');
const connectDB = require('./db/connection.js');

connectDB();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/map', mapRouter);

mongoose.connection.once('open', () => {
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Listening on port ${process.env.PORT || 5000}`);
  });
});
