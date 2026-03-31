import { ScrapedJob } from './handshake-scrape'

export interface TailorResult {
  coverLetter: string
  resumeBullets: { original: string; rewritten: string }[]
}

const SYSTEM_PROMPT = `You are a professional resume and cover letter writer for UW–Madison computer science students applying for internships. Your job is to tailor application materials to match a specific job posting while staying completely truthful to the candidate's actual experience.

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation.

Output format:
{
  "coverLetter": "3 paragraphs, max 250 words",
  "resumeBullets": [
    { "original": "original bullet from resume", "rewritten": "tailored version under 20 words" },
    ...
  ]
}

Cover letter rules:
- Start with something specific (NOT "I am excited to apply" or "I would be a great fit")
- 3 paragraphs: why this role, relevant experience, call to action
- Sound like a real college junior, not corporate-robotic
- Never invent experiences or metrics

Resume bullet rules:
- Select 3 most relevant bullets from the resume
- Start with strong action verbs
- Under 20 words each
- Mirror job description keywords naturally
- Never inflate scope or add technologies not mentioned`

function buildUserPrompt(job: ScrapedJob, resumeText: string): string {
  return `RESUME:
${resumeText}

JOB:
Title: ${job.jobTitle}
Company: ${job.company}
Description: ${job.jobDescription}

Return JSON with coverLetter and resumeBullets (array of {original, rewritten}).`
}

function stripJsonMarkdown(content: string): string {
  return content
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim()
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callOpenRouter(prompt: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://outarc.app',
      'X-Title': 'OutARC',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4-5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.5,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenRouter API error: ${res.status} - ${errorText}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

export async function tailorApplication(
  job: ScrapedJob,
  resumeText: string,
  retries = 2
): Promise<TailorResult> {
  const prompt = buildUserPrompt(job, resumeText)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000
        console.log(`[tailor] Retry attempt ${attempt} after ${backoffMs}ms delay`)
        await delay(backoffMs)
      }

      const content = await callOpenRouter(prompt)
      const cleaned = stripJsonMarkdown(content)
      const parsed = JSON.parse(cleaned)

      // Validate structure
      if (!parsed.coverLetter || !Array.isArray(parsed.resumeBullets)) {
        throw new Error('Invalid response structure')
      }

      // Ensure resumeBullets has the right shape
      const bullets = parsed.resumeBullets.map((b: any) => ({
        original: b.original || '',
        rewritten: b.rewritten || '',
      }))

      return {
        coverLetter: parsed.coverLetter,
        resumeBullets: bullets,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(`[tailor] Attempt ${attempt + 1} failed:`, lastError.message)
    }
  }

  throw lastError || new Error('Tailor application failed after retries')
}
