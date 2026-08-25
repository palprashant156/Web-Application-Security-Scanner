import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/webguard';
    await mongoose.connect(mongoURI);
    console.log('[db]: Connected to MongoDB successfully.');
  } catch (error) {
    console.error('[db]: Error connecting to MongoDB:', error);
    process.exit(1);
  }
}
