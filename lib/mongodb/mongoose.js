import mongoose from "mongoose";

let initialized = false;

export const connect = async () => {
  mongoose.set("strictQuery", true);

  console.log("MongoDB URI:", process.env.MONGODB_URI); 

  if (initialized) {
    console.log("MongoDB already connected");
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MongoDB URI not found in environment variables");
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "nextjs-social-app",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    initialized = true;
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};
