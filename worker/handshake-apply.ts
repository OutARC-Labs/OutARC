import { BrowserContext } from 'playwright'
import { writeFile } from 'fs/promises'
import { humanDelay, pageLoadDelay, humanType } from './utils/delays'

async function checkForCaptcha(page: any): Promise<boolean> {
  const captchaCount = await page.locator('[id*="captcha"], [class*="captcha"], iframe[src*="recaptcha"]').count()
  return captchaCount > 0
}

async function takeErrorScreenshot(page: any): Promise<string> {
  const ts = Date.now()
  const screenshotPath = `/tmp/hs-error-${ts}.png`
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(`[Apply] Error screenshot saved: ${screenshotPath}`)
  return screenshotPath
}

export interface ApplyResult {
  success: boolean
  error?: string
}

export async function applyToJob(
  context: BrowserContext,
  jobUrl: string,
  coverLetter: string,
  resumePath: string
): Promise<ApplyResult> {
  const page = await context.newPage()
  try {
    console.log(`[Apply] Navigating to: ${jobUrl}`)
    await page.goto(jobUrl, { waitUntil: 'networkidle' })
    await pageLoadDelay()

    if (await checkForCaptcha(page)) {
      return { success: false, error: 'captcha_detected' }
    }

    await humanDelay()
    const applyBtn = page.locator('button:has-text("Apply"), a:has-text("Apply Now")').first()
    await applyBtn.click()
    await pageLoadDelay()

    if (await checkForCaptcha(page)) {
      return { success: false, error: 'captcha_detected' }
    }

    const coverLetterTextarea = page.locator('textarea[name*="cover"], textarea[placeholder*="cover"]').first()
    const coverLetterUpload = page.locator('input[type="file"][accept*="pdf"]').first()

    if (await coverLetterTextarea.count() > 0) {
      console.log('[Apply] Pasting cover letter into text field')
      await coverLetterTextarea.click()
      await humanDelay(500, 1000)
      const chunks = coverLetter.match(/.{1,50}/g) || []
      for (const chunk of chunks) {
        await page.keyboard.type(chunk)
        await humanDelay(100, 300)
      }
    } else if (await coverLetterUpload.count() > 0) {
      console.log('[Apply] Uploading cover letter PDF')
      const clPath = `/tmp/cover-letter-${Date.now()}.txt`
      await writeFile(clPath, coverLetter)
      await coverLetterUpload.setInputFiles(clPath)
    }

    await humanDelay()

    const resumeInput = page.locator('input[type="file"]').first()
    if (await resumeInput.count() > 0 && resumePath) {
      console.log('[Apply] Attaching resume')
      await resumeInput.setInputFiles(resumePath)
      await humanDelay()
    }

    const submitBtn = page.locator('button[type="submit"], button:has-text("Submit")').last()
    await humanDelay(1000, 2000)
    await submitBtn.click()
    await pageLoadDelay()

    const successIndicators = [
      'text=Application submitted',
      'text=Successfully applied',
      'text=Your application has been',
    ]
    for (const indicator of successIndicators) {
      if (await page.locator(indicator).count() > 0) {
        console.log('[Apply] Success confirmed')
        return { success: true }
      }
    }

    await takeErrorScreenshot(page)
    return { success: false, error: 'no_success_indicator' }
  } catch (err: any) {
    await takeErrorScreenshot(page).catch(() => {})
    return { success: false, error: err.message }
  } finally {
    await page.close()
  }
}