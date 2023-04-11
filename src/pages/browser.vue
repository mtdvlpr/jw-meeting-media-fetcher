<template>
  <div
    :style="`overflow: hidden; width: 100%; height: 100%;${
      mediaWidth && ratioX !== 0 ? `max-height: ${mediaHeight * ratioY}px` : ''
    }`"
  >
    <span v-if="!controller" class="pointer" />
    <iframe
      id="website"
      :src="url"
      :style="`width: ${mediaWidth ? mediaWidth + 'px' : '100%'};height: ${
        mediaHeight ? mediaHeight + 'px' : '100%'
      };${
        ratioX !== 0
          ? `transform: scale(${ratioX},${ratioY});transform-origin: 0 0`
          : ''
      }`"
    />
  </div>
</template>
<script setup lang="ts">
import type { Point } from 'electron'
import { useIpcRenderer, useIpcRendererOn } from '@vueuse/electron'
import { useRouteQuery } from '@vueuse/router'

const url = useRouteQuery<string>('url', '')
const controller = useRouteQuery<string>('controller', '')

definePageMeta({ layout: 'media' })
useHead({
  title: computed(() =>
    controller.value ? 'Website Controller' : 'Media Window'
  ),
})

onMounted(() => {
  const iframe = document.getElementById('website') as HTMLIFrameElement
  if (controller.value) {
    initController(iframe)
  } else {
    initWebsite(iframe)
  }
})

interface Target {
  tag: string
  id: string
  className: string
  text: string | null
  alt: string | null
  src: string | null
  href: string | null
}

const initController = (iframe: HTMLIFrameElement) => {
  useIpcRenderer().send('sendSize')
  const html = document.querySelector('html')!
  const body = document.querySelector('body')!
  // @ts-expect-error
  html.style['-webkit-app-region'] = 'no-drag'
  // @ts-expect-error
  body.style['-webkit-app-region'] = 'no-drag'

  iframe.onload = () => {
    const win = iframe.contentWindow
    const doc = iframe.contentDocument

    if (doc) {
      const head = doc.querySelector('head')
      if (head) {
        const style = document.createElement('style')
        style.innerHTML = `
                .lnc-firstRunPopup {
                  display: none !important;
                }
              `
        head.appendChild(style)
      }
    }
    if (win) {
      win.onmousemove = (e) => {
        log.debug('mouse moved', e)
        useIpcRenderer().send('moveMouse', {
          x: e.x / getWinWidth(win),
          y: e.y / getWinHeight(win),
        })
      }

      win.onscroll = () => {
        useIpcRenderer().send('scrollWebsite', {
          x: win.scrollX / getWinWidth(win),
          y: win.scrollY / getWinHeight(win),
        })
      }

      win.onclick = (e: MouseEvent) => {
        log.debug('Clicked', e.target)
        e.stopImmediatePropagation()
        let el = e.target as Element
        const invalidTags = ['svg', 'path', 'span']
        if (invalidTags.includes(el.tagName.toLowerCase())) {
          el = el.closest('button') ?? el.closest('a') ?? el
        }

        const target: Target = {
          tag: el.tagName.toLowerCase(),
          id: el.id,
          className:
            typeof el.className === 'string'
              ? el.className
              : // @ts-expect-error
                el.className?.baseVal, // SVGAnimatedString
          text: el.textContent,
          alt: el.getAttribute('alt'),
          src: el.getAttribute('src'),
          href: el.getAttribute('href'),
        }
        log.debug('Target', target)

        // @ts-expect-error: target does not exist on type Element
        if (target.tag === 'a' && el.target === '_blank') {
          e.preventDefault()
          useIpcRenderer().send('openWebsite', target.href)
        } else {
          useIpcRenderer().send('clickOnWebsite', target)
        }
      }
    }
  }
}

const initWebsite = (iframe: HTMLIFrameElement) => {
  // Hide cookie message
  iframe.onload = () => {
    const doc = iframe.contentDocument
    if (!doc) return
    const head = doc.querySelector('head')
    if (!head) return
    const style = document.createElement('style')
    style.innerHTML = `.lnc-firstRunPopup {display: none !important;}`
    head.appendChild(style)
  }

  useIpcRendererOn('moveMouse', (_e, pos: Point) => {
    const win = iframe.contentWindow
    const pointer = document.querySelector('.pointer') as HTMLElement
    if (win && pointer) {
      pointer.style.left = `${
        pos.x * getWinWidth(win) - getElWidth(pointer) / 2
      }px`
      pointer.style.top = `${
        pos.y * getWinHeight(win) - getElHeight(pointer) / 2
      }px`
    }
  })

  useIpcRendererOn('scrollWebsite', (_e, pos: Point) => {
    const win = iframe.contentWindow
    if (win) {
      win.scrollTo(pos.x * getWinWidth(win), pos.y * getWinHeight(win))
    }
  })

  useIpcRendererOn('clickOnWebsite', (_e, target: Target) => {
    const doc = iframe.contentDocument
    const { tag, id, className, text, src, alt, href } = target
    if (doc) {
      let el: HTMLElement | null = null
      if (id) {
        el = doc.getElementById(id)
      } else if (className && text) {
        const selector = `${tag}.${className.trim().replaceAll(/\s+/g, '.')}`
        el =
          (Array.from(doc.querySelectorAll(selector)).find(
            (e) => e.textContent === text
          ) as HTMLElement) ?? null
      } else if (src) {
        el = doc.querySelector(`${tag}[src="${src}"]`)
      } else if (alt) {
        el = doc.querySelector(`${tag}[alt="${alt}"]`)
      } else if (href) {
        el = doc.querySelector(`${tag}[href="${href}"]`)
      } else if (className) {
        const selector = `${tag}.${className.trim().replaceAll(/\s+/g, '.')}`
        el = doc.querySelector(selector)
      }
      log.debug('el', el)
      if (el) {
        try {
          el.click()
        } catch (e: unknown) {
          try {
            log.debug('Trying to click the parent')
            const button = el.closest('button')
            if (button) {
              log.debug('Found button', button)
              button.click()
            } else {
              const link = el.closest('a')
              if (link) link.click()
            }
          } catch (e) {
            log.error(e)
          }
        }
      }
    }
  })
}

// Window constraints
const winWidth = ref(0)
const winHeight = ref(0)
const mediaWidth = ref(0)
const mediaHeight = ref(0)
const ratioX = computed(() => {
  if (winWidth.value && mediaWidth.value) {
    return winWidth.value / mediaWidth.value
  } else {
    return 0
  }
})
const ratioY = computed(() => {
  if (winHeight.value && mediaHeight.value) {
    return winHeight.value / mediaHeight.value
  } else {
    return 0
  }
})

const getElWidth = (el: HTMLElement) => {
  return el.offsetWidth - (el.offsetWidth - el.clientWidth)
}
const getElHeight = (el: HTMLElement) => {
  return el.offsetHeight - (el.offsetHeight - el.clientHeight)
}
const getWinHeight = (win: Window) => {
  return win.document.firstElementChild?.scrollHeight ?? win.innerHeight
}
const getWinWidth = (win: Window) => {
  return win.document.firstElementChild?.scrollWidth ?? win.innerWidth
}

if (controller.value) {
  useIpcRendererOn('winSize', (_e, size: number[]) => {
    winWidth.value = size[0]
    winHeight.value = size[1]
  })

  useIpcRendererOn('mediaSize', (_e, size: number[]) => {
    mediaWidth.value = size[0]
    mediaHeight.value = size[1]
  })
}
</script>
<style lang="scss" scoped>
.pointer {
  height: 24px;
  width: 24px;
  border: 2px solid red;
  border-radius: 50%;
  display: inline-block;
  position: fixed;
  left: -10px;
  top: -10px;
}
</style>
