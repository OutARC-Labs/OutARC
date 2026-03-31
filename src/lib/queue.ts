import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

export interface ApplicationJob {
  userId: string
  jobTitle: string
  company: string
  jobDescription: string
  handshakeUrl: string
}

export const connection = new Redis(process.env.REDIS_URL as string, {
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
