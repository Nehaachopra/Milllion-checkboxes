import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI!);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    throw new Error(`Error connecting to MongoDB: ${error}`);
  }
};

export default connectDB;