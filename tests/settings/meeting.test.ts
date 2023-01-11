import { expect, test } from '@playwright/test'
import { ElectronApplication, Page } from 'playwright'
import { version } from '../../package.json'
import { delay } from '../helpers/generalHelpers'
import locale from './../../src/renderer/locales/en.json'
import { startApp, openHomePage } from './../helpers/electronHelpers'

let electronApp: ElectronApplication
let page: Page

test.beforeAll(async () => {
  electronApp = await startApp()
  page = await openHomePage(electronApp)

  // Open settings page
  await page.locator('[aria-label="settings"]').click()
})

test.afterAll(async () => {
  await electronApp.close()
})

test('render the settings page correctly', async () => {
  // Check for correct version
  expect((await page.locator('text=M³ v').innerText()).toLowerCase()).toBe(
    `m³ v${version}`
  )

  // Test if title is correct
  const title = await page.title()
  expect(title).toBe('Settings - Meeting Media Manager')

  // Expand media setup
  await page.locator('button', { hasText: locale.optionsMeetings }).click()
  // eslint-disable-next-line no-magic-numbers
  await delay(500)
  await page.screenshot({ path: 'screenshots/settings/meeting.png' })
})
