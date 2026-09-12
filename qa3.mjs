export default async function run(page, ui) {
  const uname = 'qas' + Date.now().toString(36)
  await page.goto('http://localhost:5173/signup')
  await page.waitForSelector('form input')
  const inputs = page.locator('form input:not([type=checkbox])')
  await inputs.nth(0).fill(uname)
  await inputs.nth(1).fill('QA Tester')
  await inputs.nth(2).fill('+49 151 000')
  await inputs.nth(3).fill('TestPass123!')
  await inputs.nth(4).fill('TestPass123!')
  await page.locator('input[type=checkbox]').check()
  await page.locator('button[type=submit]').click()

  // wait until we leave the signup page (or 8s)
  await page.waitForFunction(() => !location.pathname.includes('signup'), { timeout: 8000 }).catch(() => { })
  const afterSignup = { url: page.url(), body: (await page.locator('body').innerText()).slice(0, 200) }

  // check localStorage session
  const ls = await page.evaluate(() => Object.keys(localStorage).map(k => k.slice(0, 40)))

  // now try signing in with the same username
  await page.goto('http://localhost:5173/signin')
  await page.waitForSelector('form input')
  await page.locator('form input').nth(0).fill(uname)
  await page.locator('form input').nth(1).fill('TestPass123!')
  await page.locator('button[type=submit]').click()
  await page.waitForTimeout(3000)
  return { uname, afterSignup, localStorage: ls, afterSignin: { url: page.url(), body: (await page.locator('body').innerText()).slice(0, 300) } }
}
