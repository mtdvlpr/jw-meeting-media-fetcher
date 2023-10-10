import { platform } from 'os'
import { expect, test, ElectronApplication, Page } from '@playwright/test'
import { existsSync } from 'fs-extra'
import { join } from 'upath'
import { ipcRendererInvoke } from 'electron-playwright-helpers'
import { startApp, openHomePage } from './../helpers/electronHelpers'
import prefs from './../mocks/prefs/prefsOld.json'
import { delay, strip } from './../helpers/generalHelpers'
import locale from './../../src/locales/en.json'

let electronApp: ElectronApplication
let page: Page
let filename: string
let mediaPath: string

test.beforeAll(async () => {
  electronApp = await startApp()
  page = await openHomePage(electronApp)

  // Open add page
  await page.locator('.v-card', { hasText: locale.recurring }).click()
  if (platform() === 'darwin') {
    await delay(5 * 100)
  }
})

test.afterAll(async () => {
  await electronApp.close()
})

test('render the add media page correctly', async () => {
  // Check for correct heading
  expect(await page.locator(`text=${locale.recurring}`).count()).toBe(1)

  // Test if title is correct
  const title = await page.title()
  expect(title).toBe('Manage Recurring - M³')
})

test('add song', async () => {
  // Click song tab
  await page.locator('button', { hasText: locale.song }).click()

  // Wait for songs to be loaded
  await delay(1500)

  // Click song dropdown
  await page.locator('.v-autocomplete').click()

  // Get song title
  filename = strip(await page.locator('text=1. ').first().innerText())

  // Select first song
  await page.locator('text=1. ').first().click()

  // Fill in prefix
  /* await page.locator('.otp-field-box--0').first().fill('0')
  await page.locator('.otp-field-box--1').first().fill('1')
  await page.locator('.otp-field-box--0').nth(1).fill('2')
  await page.locator('.otp-field-box--1').nth(1).fill('3')
  await page.locator('.otp-field-box--0').nth(2).fill('4')
  await page.locator('.otp-field-box--1').nth(2).fill('5') */
  await page.locator('.v-text-field input').nth(1).fill('01-23-45')

  // Expect song to be present in media list
  expect(
    await page
      .locator(`text=01-23-45 - ${locale.song} ${filename}.mp4`)
      .count(),
  ).toBe(1)

  // Take screenshot
  if (platform() === 'linux') {
    await page.screenshot({ path: 'img/manage/song-media.png' })
  }

  // Click save button
  await page.locator('svg.fa-floppy-disk').click()

  // Wait for home button to appear
  await page.waitForSelector('svg.fa-house')

  // Expect song to be present in media list
  filename = `01-23-45 - ${locale.song} ${filename}.mp4`
  expect(await page.locator(`text=${filename}`).count()).toBe(1)

  // Expect song to be present in media folder
  mediaPath = (await ipcRendererInvoke(page, 'downloads')) as string
  expect(existsSync(join(mediaPath, prefs.lang, 'Recurring', filename))).toBe(
    true,
  )
})

test('rename song', async () => {
  // Click on rename button
  await page.locator('svg.fa-pen').click()

  // Expect check button to be visible
  await expect(page.locator('svg.fa-check')).toBeVisible()

  // Clear name input
  await page.locator('.v-text-field--suffixed input').fill('')

  // Rename song to 'new song name with special characters'
  filename = 'new song name with ()[]{}?|*'
  await page.locator('.v-text-field--suffixed input').fill(filename)

  // Take screenshot
  if (platform() === 'linux') {
    await page.screenshot({ path: 'img/manage/rename-media.png' })
  }

  filename = strip(filename) + '.mp4'

  // Click check button
  await page.locator('svg.fa-check').click()

  // Expect cleaned, renamed song to be present in media list
  expect(await page.locator(`text=${filename}`).count()).toBe(1)

  // Expect cleaned, renamed song to be present in media folder
  expect(existsSync(join(mediaPath, prefs.lang, 'Recurring', filename))).toBe(
    true,
  )
})

test('remove song', async () => {
  // Click on remove button
  await page.locator('svg.fa-square-minus').click()

  // Verify red color
  expect(await page.locator('button.text-error').count()).toBe(1)

  // Click on remove button again
  await page.locator('button.text-error').click()

  // Verify song has been removed from media list
  expect(await page.locator(`text=${filename}`).count()).toBe(0)

  // Verify song has been removed from media folder
  expect(existsSync(join(mediaPath, prefs.lang, 'Recurring', filename))).toBe(
    false,
  )
})
