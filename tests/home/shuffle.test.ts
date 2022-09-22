// eslint-disable-next-line import/named
import { expect, test } from '@playwright/test'
import { ElectronApplication, Page } from 'playwright'
import { version } from '../../package.json'
import { startApp, openHomePage } from './../helpers/electronHelpers'
import { delay } from './../helpers/generalHelpers'
import prefs from './../mocks/prefs/prefsOld.json'
import locale from './../../src/renderer/locales/en.json'

let electronApp: ElectronApplication
let page: Page

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  electronApp = await startApp()
})

test.afterAll(async () => {
  await electronApp.close()
})

test('shuffle music starts', async () => {
  page = await openHomePage(electronApp)
  const baseURL = page.url()

  // Open settings page
  await page.locator('[aria-label="settings"]').click()

  // Check for correct version
  expect((await page.locator('text=M³ v').innerText()).toLowerCase()).toBe(
    `m³ v${version}`
  )

  // Expand meeting setup
  await page.locator('button', { hasText: locale.optionsMeetings }).click()

  // Turn shuffle music on
  await page.locator(`text=${locale.enableMusicButton}`).check()

  // Go back to home page
  await page.locator('[aria-label="home"]').click()

  // Verify home page
  expect(page.locator(`text=${prefs.congregationName}`).innerText).toBeTruthy()

  // Weird bug in Windows that changes the lang parameter after going back home (only when testing)
  await page.goto(baseURL)

  // Click shuffle button
  const shuffleBtn = page.locator('[aria-label="shuffle"]')
  await shuffleBtn.click()

  // Verify orange color
  expect((await shuffleBtn.getAttribute('class'))?.includes('warning')).toBe(
    true
  )

  // Click shuffle button again
  await shuffleBtn.click()

  // Wait for stop icon to appear
  await page.waitForSelector('.fa-stop')
  await delay(1000)

  // Expect time remaining to appear
  expect(await shuffleBtn.innerText()).toMatch(/\d{2}:\d{2}/g)
})

test('stop shuffle correctly', async () => {
  const shuffleBtn = page.locator('[aria-label="shuffle"]')

  // Click shuffle button to stop
  await shuffleBtn.click()

  // Verify red color
  expect((await shuffleBtn.getAttribute('class'))?.includes('error')).toBe(true)

  // Click button again
  await shuffleBtn.click()

  // Verify blue color
  expect((await shuffleBtn.getAttribute('class'))?.includes('info')).toBe(true)
})
