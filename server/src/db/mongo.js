import mongoose from 'mongoose'
import env from '../config/env.js'

export async function connectMongo() {
  mongoose.set('strictQuery', true)

  mongoose.connection.on('connected', () => console.log('[mongo] 已连接'))
  mongoose.connection.on('disconnected', () => console.warn('[mongo] 已断开'))
  mongoose.connection.on('error', (err) => console.error('[mongo] 错误:', err.message))

  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000
  })

  return mongoose.connection
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

export default connectMongo
