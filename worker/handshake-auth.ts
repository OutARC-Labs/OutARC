import { chromium, Browser, BrowserContext } from 'playwright'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { humanDelay, pageLoadDelay, humanType } from './utils/delays'

const COOKIE_DIR = '/tmp/outarc-sessions'

function cookiePath(userId: string): string {
  return path.join(COOKIE_DIR, `hs-session-${userId}.json`)
}

async function saveCookies(context: BrowserContext, userId: string) {
  await mkdir(COOKIE_DIR, { recursive: true })
  const cookies = await context.cookies()
  await writeFile(cookiePath(userId), JSON.stringify(cookies))
  console.log(`[Auth] Cookies saved for user ${userId}`)
}

async function loadCookies(context: BrowserContext, userId: string): Promise<boolean> {
  const cPath = cookiePath(userId)
  if (!existsSync(cPath)) return false
  const cookies = JSON.parse(await readFile(cPath, 'utf-8'))
  await context.addCookies(cookies)
  return true
}

async function isSessionValid(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage()
  try {
    await page.goto('https://app.joinhandshake.com/stu', { waitUntil: 'load' })
    await pageLoadDelay()
    const url = page.url()
    return !url.includes('/login') && !url.includes('/users/sign_in')
  } finally {
    await page.close()
  }
}

async function loginFresh(
  context: BrowserContext,
  email: string,
  password: string,
  userId: string
): Promise<void> {
  const page = await context.newPage()
  console.log('[Auth] Logging in fresh...')
  await page.goto('https://app.joinhandshake.com/login', { waitUntil: 'load', timeout: 60000 })
  await pageLoadDelay()
  await humanDelay()

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()

  if (await emailInput.count() === 0) {
    const signInBtn = page.locator('a:has-text("email"), button:has-text("email"), [data-ref="email"]').first()
    await signInBtn.click({ timeout: 10000 })
    await humanDelay(1000, 2000)
  }

  await humanType(page, 'input[type="email"], input[name="email"]', email)
  await humanDelay()
  await humanType(page, 'input[type="password"], input[name="password"]', password)
  await humanDelay(800, 1500)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/stu**', { timeout: 30000 })
  await pageLoadDelay()
  await saveCookies(context, userId)
  await page.close()
  console.log('[Auth] Login successful')
}

export async function getHandshakeContext(
  email: string,
  password: string,
  userId: string
): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })
  const hasCookies = await loadCookies(context, userId)
  if (hasCookies) {
    console.log('[Auth] Checking saved session...')
    if (await isSessionValid(context)) {
      console.log('[Auth] Session still valid, reusing cookies')
      return { browser, context }
    }
    console.log('[Auth] Session expired, re-authenticating')
  }
  await loginFresh(context, email, password, userId)
  return { browser, context }
}