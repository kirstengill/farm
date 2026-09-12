export default async function run(page, ui) {
  const uname = 'qa' + Date.now().toString(36)
  await page.goto('http://localhost:5173/signup')
  await page.waitForSelector('form input')
  const inputs = page.locator('form input:not([type=checkbox])')
  await inputs.nth(0).fill(uname)
  await inputs.nth(1).fill('QA Tester')
  await inputs.nth(2).fill('+49 151 000')
  await inputs.nth(3).fill('TestPass123!')
  await inputs.nth(4).fill('TestPass123!')
  await page.locator('input[type=checkbox]').check()

  const respPromise = page.waitForResponse(r => r.url().includes('/auth/v1/signup'), { timeout: 15000 })
  await page.locator('button[type=submit]').click()
  let resp = null, respBody = null
  try {
    resp = await respPromise
    respBody = await resp.text()
  } catch { }
  await page.waitForTimeout(2500)
  return {
    username: uname,
    signupStatus: resp?.status(),
    signupBody: respBody ? respBody.slice(0, 400) : null,
    url: page.url(),
  }
}
