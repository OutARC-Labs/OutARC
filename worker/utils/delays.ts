function gaussianRand(min: number, max: number): number {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
    num = num / 10.0 + 0.5
    if (num > 1 || num < 0) return gaussianRand(min, max)
    return Math.floor(num * (max - min) + min)
  }
  
  export async function humanDelay(min = 800, max = 3000): Promise<void> {
    const ms = gaussianRand(min, max)
    await new Promise(r => setTimeout(r, ms))
  }
  
  export async function pageLoadDelay(): Promise<void> {
    const ms = gaussianRand(2000, 5000)
    await new Promise(r => setTimeout(r, ms))
  }
  
  export async function typingDelay(): Promise<void> {
    const ms = gaussianRand(50, 150)
    await new Promise(r => setTimeout(r, ms))
  }
  
  export async function humanType(page: any, selector: string, text: string): Promise<void> {
    await page.click(selector)
    for (const char of text) {
      await page.keyboard.type(char)
      await typingDelay()
    }
  }