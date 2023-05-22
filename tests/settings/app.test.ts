import { platform } from 'os'
import { expect, test, ElectronApplication, Page } from '@playwright/test'
import { version } from '../../package.json'
import { delay } from '../helpers/generalHelpers'
import locale from './../../src/locales/en.json'
import { startApp, openHomePage } from './../helpers/electronHelpers'

let electronApp: ElectronApplication
let page: Page

test.beforeAll(async () => {
  electronApp = await startApp()
  page = await openHomePage(electronApp)

  // Open settings page
  await page.locator('[aria-label="settings"]').click()
  if (platform() === 'darwin') {
    await delay(5 * 100)
  }
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
  expect(title).toBe('Settings - M³')
})

test('app theme', async () => {
  // Expand application setup
  await page.locator('button', { hasText: locale.optionsApp }).click()

  if (platform() === 'linux') {
    await page.screenshot({ path: 'img/settings/app.png' })
  }

  // Check light theme
  await page.locator('.theme-preference').click()
  await page.getByText(locale.light, { exact: true }).click()
  expect(await page.locator('div.v-application.v-theme--light').count()).toBe(1)

  // Check dark theme
  await page.locator('.theme-preference').click()
  await page.getByText(locale.dark, { exact: true }).click()
  expect(await page.locator('div.v-application.v-theme--dark').count()).toBe(1)
})
