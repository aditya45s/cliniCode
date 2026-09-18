import mongoose from 'mongoose'

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/carekare'
  await mongoose.connect(uri)
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}
