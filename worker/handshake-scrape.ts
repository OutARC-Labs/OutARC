import { BrowserContext } from 'playwright'
import { pageLoadDelay, humanDelay } from './utils/delays'

export interface ScrapedJob {
  jobTitle: string
  company: string
  handshakeUrl: string
  jobDescription: string
}

export async function scrapeHandshake(
  context: BrowserContext,
  keywords: string[],
  limit = 10
): Promise<ScrapedJob[]> {
  const page = await context.newPage()
  const jobs: ScrapedJob[] = []

  try {
    const query = encodeURIComponent(keywords.join(' '))
    const url = `https://app.joinhandshake.com/stu/postings?query=${query}&postingType=JOB`
    console.log(`[Scrape] Navigating to: ${url}`)
    await page.goto(url, { waitUntil: 'networkidle' })
    await pageLoadDelay()

    await page.waitForSelector('[data-hook="posting-card"]', { timeout: 10000 })
    const cards = await page.locator('[data-hook="posting-card"]').all()
    console.log(`[Scrape] Found ${cards.length} job listings`)

    for (const card of cards.slice(0, limit)) {
      try {
        const jobTitle = await card.locator('h3').first().innerText()
        const company = await card.locator('[data-hook="posting-company-name"]').first().innerText()
        const href = await card.locator('a').first().getAttribute('href')
        const handshakeUrl = `https://app.joinhandshake.com${href}`

        await card.click()
        await humanDelay(1000, 2000)
        const descEl = page.locator('[data-hook="posting-description"]').first()
        const jobDescription = await descEl.innerText().catch(() => '')

        jobs.push({ jobTitle: jobTitle.trim(), company: company.trim(), handshakeUrl, jobDescription })
        console.log(`[Scrape] Captured: ${jobTitle} @ ${company}`)
        await humanDelay()
      } catch (err) {
        console.warn('[Scrape] Failed to extract job card, skipping', err)
      }
    }
  } finally {
    await page.close()
  }

  return jobs
}