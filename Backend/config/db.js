const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI ||
        'mongodb+srv://tinsights642_db_user:toXFdqRVfJVi2r2C@cluster0.8xilfnq.mongodb.net/spotchat?retryWrites=true&w=majority&appName=Cluster0',
      {
        serverSelectionTimeoutMS: 15000,
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
  }
};

module.exports = connectDB;
