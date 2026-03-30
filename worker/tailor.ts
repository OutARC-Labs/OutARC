import { ScrapedJob } from './handshake-scrape'

export interface TailorResult {
  coverLetter: string
  resumeBullets: string[]
}

export async function tailorApplication(
  job: ScrapedJob,
  resumeText: string
): Promise<TailorResult> {
  const prompt = `
You are a professional resume writer for UW-Madison CS students.
Given the resume and job description below, return ONLY valid JSON with this shape:
{
  "bullets": ["bullet 1", "bullet 2", "bullet 3"],
  "coverLetter": "full cover letter text"
}

Rules:
- Each bullet: action verb, under 20 words, include a metric if possible
- Cover letter: 3 paragraphs, under 250 words, sounds like a real student wrote it
- Never start with "I am excited to" or "I would be a great fit"

RESUME:
${resumeText}

JOB:
Title: ${job.jobTitle}
Company: ${job.company}
${job.jobDescription}
`.trim()

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.4,
    }),
  })

  const data = await res.json()
  const content = data.choices[0].message.content
  const clean = content.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(clean)

  return {
    coverLetter: parsed.coverLetter,
    resumeBullets: parsed.bullets,
  }
}