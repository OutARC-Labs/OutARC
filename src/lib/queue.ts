import { Queue } from 'bullmq'
import IORedis from 'ioredis'

// All queue jobs must match this shape
export interface ApplicationJob {
  userId: string
  jobTitle: string
  company: string
  jobDescription: string
  handshakeUrl: string
}

export const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

export const applicationQueue = new Queue('application', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})