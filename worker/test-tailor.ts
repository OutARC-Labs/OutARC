// Test the tailor function with a sample job
// Run with: npx tsx worker/test-tailor.ts

import 'dotenv/config'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { tailorApplication } from './tailor'

const testJob = {
  jobTitle: 'Software Developer Intern',
  company: 'Epic Systems',
  jobDescription: `Join Epic's software team to build healthcare software used by millions.
You'll work on real features in a full-stack environment using JavaScript and SQL.
We value curiosity, collaboration, and people who can jump into an unfamiliar codebase.
Strong CS fundamentals required.`,
  handshakeUrl: 'https://example.com/job/123',
}

const testResume = `
Rithik Sharma
UW-Madison CS Junior | rithik@wisc.edu

Experience:
- Built a full-stack web app using React and Node.js for a student org with 200+ members
- Wrote Python scripts to automate data cleaning for a research lab, saving 4 hours/week
- Helped debug REST APIs and wrote unit tests during a summer internship at a local startup

Skills: Python, JavaScript, React, Node.js, SQL, Git
`

async function main() {
  console.log('Testing tailor function...\n')
  console.log('Job:', testJob.jobTitle, 'at', testJob.company)
  console.log('---')

  try {
    const result = await tailorApplication(testJob, testResume)
    console.log('\n✅ Success!\n')
    console.log('Cover Letter:')
    console.log(result.coverLetter)
    console.log('\n---\n')
    console.log('Resume Bullets:')
    result.resumeBullets.forEach((b, i) => {
      console.log(`\n${i + 1}. Original: ${b.original}`)
      console.log(`   Rewritten: ${b.rewritten}`)
    })
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

main()
