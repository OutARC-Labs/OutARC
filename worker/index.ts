import { Worker, Job } from 'bullmq'
import { connection } from '../src/lib/queue'

console.log('[OutARC Worker] Starting...')

const worker = new Worker(
  'application',
  async (job: Job) => {
    console.log(`[Worker] Processing job ${job.id} — ${job.name}`)
    console.log('[Worker] Job data:', JSON.stringify(job.data, null, 2))
  },
  { connection, concurrency: 1 }
)

worker.on('completed', (job) => console.log(`[Worker] Job ${job.id} completed`))
worker.on('failed', (job, err) => console.error(`[Worker] Job ${job?.id} failed: ${err.message}`))