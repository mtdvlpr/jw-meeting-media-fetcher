<template>
  <!-- TODO: remove this button when testing is done -->
  <v-btn color="primary" @click="launchFirstRun()">
    Open First Time Wizard
  </v-btn>
  <v-dialog :model-value="!!isNew" persistent transition="fade-transition">
    <v-window v-model="currentInitialSetting">
      <v-window-item v-for="step in firstRunSteps" :key="step.title">
        <v-card :title="step.title" class="mx-auto">
          <v-card-text>
            <settings-item v-for="pref in step.settings" :key="pref.key" :setting="pref" />
            <span class="text-caption text-grey-darken-1">
              {{ step.subtitle }}
            </span>
          </v-card-text>
          <v-divider />
          <v-card-actions>
            <v-btn v-if="currentInitialSetting > 0" variant="text" color="secondary" @click="previousStep()">
              Previous step
            </v-btn>
            <v-spacer />
            <template v-if="step.firstRunParam">
              <v-btn variant="flat" @click="setFirstRunParam(step.firstRunParam!, false)">
                No
              </v-btn>
              <v-btn variant="flat" color="primary" @click="setFirstRunParam(step.firstRunParam!, true)">
                Yes
              </v-btn>
            </template>
            <template v-else>
              <v-btn v-if="initialSettingsDone" @click="isNew = ''">
                Go to media calendar
              </v-btn>
              <v-btn variant="flat" color="primary" @click="nextStep(step.onComplete)">
                {{ initialSettingsDone ? 'Explore more settings' : 'Next' }}
              </v-btn>
            </template>
          </v-card-actions>
          <v-progress-linear :model-value="firstRunProgress" />
        </v-card>
      </v-window-item>
    </v-window>
  </v-dialog>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { ipcRenderer } from 'electron';
import { Setting } from '~~/types'

const props = defineProps<{
  requiredSettings: Record<string, Setting>
}>()

const isNew = useRouteQuery<string>('new', '')

const launchFirstRun = () => {
  currentInitialSetting.value = 0
  isNew.value = 'true'
}

const firstRunParams = ref<Record<string, boolean>>({})
const setFirstRunParam = (param: string, value: boolean) => {
  firstRunParams.value[param] = value
  nextStep()
}
interface FirstRunStep {
  skip?: boolean
  title: string
  subtitle?: string
  firstRunParam?: string
  settings?: Setting[]
  onComplete?: () => void
}
const firstRunSteps = computed((): FirstRunStep[] => {
  return [
    {
      title: 'Welcome!',
      subtitle: "Let's configure a few things, and then we'll get on our way.",
    },
    {
      title: 'What language do you want the app to be displayed in?',
      subtitle:
        'M³ will display helpful tips and information in this language. Choose the language you understand best.',
      settings: [props.requiredSettings['app.localAppLang']],
    },
    {
      firstRunParam: 'usingAtKh',
      title: 'Are you using this app at a Kingdom Hall?',
      subtitle:
        "If so, we'll configure a few things for you right off the bat.",
    },
    {
      skip: !firstRunParams.value.usingAtKh,
      firstRunParam: 'companionToJw',
      title: 'Will you be using this app as a companion to JW Library?',
      subtitle:
        "Select 'No' if you plan on using M³ to display all meeting media. This will activate fully automated meeting media retrieval, yeartext display, background music playback, and other practical features. Close JW Library before proceeding if you select 'No'!",
    },
    {
      title: firstRunParams.value.usingAtKh
        ? 'What is the name of your congregation or group?'
        : 'Choose a name for this profile',
      subtitle:
        'This will be used to quickly switch between profiles, if ever you decide create more than one in the future.',
      settings: [props.requiredSettings['app.congregationName']],
    },
    {
      title: firstRunParams.value.usingAtKh
        ? 'What is the language of your congregation or group?'
        : 'In what language should media be downloaded?',
      subtitle:
        'Media such as videos and pictures will be downloaded from publications in this language from jw.org.',
      settings: [props.requiredSettings['media.lang']],
      onComplete: () => {
        if (firstRunParams.value.usingAtKh) {
          enableExternalDisplayAndMusic()
        }
      },
    },
    {
      skip: firstRunParams.value.companionToJw,
      title: "Excellent! We're off to a good start.",
      subtitle:
        "You'll notice the yeartext is now being displayed on the external monitor! But let's keep going.",
    },
    {
      skip: firstRunParams.value.companionToJw,
      title: 'What are your meeting days and times?',
      subtitle:
        "We'll use this info to make sure that all media is categorized into dated folders for each meeting.",
      settings: [
        props.requiredSettings['meeting.mwDay'],
        props.requiredSettings['meeting.mwStartTime'],
        props.requiredSettings['meeting.weDay'],
        props.requiredSettings['meeting.weStartTime'],
      ],
      onComplete: () => {
        enableExternalDisplayAndMusic()
      },
    },
    {
      title: 'Where should media be stored?',
      subtitle:
        'Choose the folder in which media to be played at meetings should be saved on this computer.',
      settings: [props.requiredSettings['app.localOutputPath']],
      onComplete: () => {
        if (!firstRunParams.value.companionToJw) startMediaSync()
      },
    },
    {
      skip:
        !firstRunParams.value.usingAtKh || firstRunParams.value.companionToJw,
      title: 'Excellent!',
      subtitle:
        "We're almost done! We'll start fetching media while we wrap up with our initial setup.",
    },
    {
      skip:
        !firstRunParams.value.usingAtKh || firstRunParams.value.companionToJw,
      firstRunParam: 'usingObs',
      title: 'Does your Kingdom Hall use a program called OBS Studio?',
      subtitle:
        'OBS Studio is a free app used to manage camera and video feeds.',
    },
    {
      skip:
        !firstRunParams.value.usingAtKh ||
        firstRunParams.value.companionToJw ||
        !firstRunParams.value.usingObs,
      firstRunParam: 'integrateObs',
      title: 'Would you like to integrate M³ with OBS Studio?',
      subtitle:
        'Doing so will greatly simplify and facilitate sharing media during hybrid meetings.',
    },
    {
      skip: !firstRunParams.value.integrateObs,
      title: 'Is OBS Studio configured properly?',
      subtitle:
        'Make sure that the OBS Studio Websocket plugin is configured with a port number and password, and that the OBS Studio virtual camera is installed on this computer. When this is done, click next.',
    },
    {
      skip: !firstRunParams.value.integrateObs,
      title:
        "Enter the port and password configured in OBS Studio's Websocket plugin.",
      settings: [
        props.requiredSettings['app.obs.port'],
        props.requiredSettings['app.obs.password'],
      ],
      onComplete: () => {
        enableObs()
      },
    },
    {
      skip: !firstRunParams.value.integrateObs,
      title: 'Configure a scene in OBS Studio to show a stage wide shot.',
      subtitle: 'Once the scene has been created, select it here.',
      settings: [props.requiredSettings['app.obs.cameraScene']],
    },
    {
      skip: !firstRunParams.value.integrateObs,
      title:
        'Configure a scene in OBS Studio that will capture the media while it is displayed.',
      subtitle:
        'This can be either a "display capture" or a "window capture". Once the scene has been created, select it here.',
      settings: [props.requiredSettings['app.obs.mediaScene']],
    },
    {
      skip: firstRunParams.value.companionToJw,
      title:
        'Make sure that the setting to "use dual monitors" in Zoom is enabled.',
      subtitle:
        "That way, you'll be able to quickly show and hide Zoom participants on the TV screens when needed.",
    },
    {
      skip: firstRunParams.value.companionToJw,
      title: 'How can I show Zoom on the TVs instead of the media or yeartext?',
      subtitle:
        "Look for this button in M³'s sidebar. Clicking it will temporarily hide the media and yeartext, and reveal the Zoom participants underneath. Once the Zoom part is over, you can show the yeartext again using the same button.",
    },
    {
      skip: firstRunParams.value.companionToJw,
      title: 'What about background music?',
      subtitle:
        "In the sidebar, you'll also find a button to start and stop background music playback. Note that background music will start playing automatically before a meeting is scheduled to start when M³ is launched, and will stop automatically one minute before the meeting. However, background music playback will need to be manually started after the concluding prayer.",
    },
    {
      title: 'Congratulations!',
      subtitle:
        'M³ is now ready to be used. Feel free to browse around the other available options, or if you prefer you can head right to the media playback screen.',
    },
  ]
})
const currentInitialSetting = ref(0)
const initialSettingsDone = computed(
  () => currentInitialSetting.value === firstRunSteps.value.length - 1
)
const firstRunProgress = computed(
  () => ((currentInitialSetting.value + 1) / firstRunSteps.value.length) * 100
)
const { screens, mediaScreenInit } = storeToRefs(usePresentStore())
const enableExternalDisplayAndMusic = () => {
  const usingAtKh = !!firstRunParams.value.usingAtKh
  setPrefs('media.enableMediaDisplayButton', usingAtKh)

  // TODO: I just manually took the function from "onChange" for the media.enableMediaDisplayButton button, but there has to be a better way
  if (usingAtKh !== mediaScreenInit.value) {
    toggleMediaWindow(usingAtKh ? 'open' : 'close')
  } else {
    ipcRenderer.send('hideMediaWindow')
  }

  if (usingAtKh) {
    if (
      getPrefs('media.preferredOutput') === 'window' &&
      screens.value.length > 0
    ) {
      setPrefs('media.preferredOutput', screens.value[0].id)
    }
    refreshBackgroundImgPreview()
  }
  useStatStore().setShowMediaPlayback(usingAtKh)
  // onChange end

  setPrefs('media.enableMusicButton', usingAtKh)
  // TODO: I just manually took the function from "onChange" for the meeting.enableMusicButton button, but there has to be a better way
  useStatStore().setShowMusicButton(usingAtKh)
  // onChange end

  const companionToJw = usingAtKh && !!firstRunParams.value.companionToJw
  setPrefs('meeting.companionToJw', companionToJw)
  setPrefs('media.hideWinAfterMedia', companionToJw)

  if (usingAtKh) {
    setPrefs('meeting.autoStartMusic', !companionToJw)
    setPrefs('meeting.enableMusicFadeOut', !companionToJw)
    setPrefs('meeting.musicFadeOutTime', 60)
    setPrefs('meeting.musicFadeOutType', 'smart')
    setPrefs('meeting.specialCong', companionToJw)
    setPrefs('media.hideWinAfterMedia', companionToJw)
  }
}

const startMediaSync = () => {
  // start media sync here
  // eslint-disable-next-line no-console
  console.log('start media sync here')
  // presentSelect.value.syncMedia()
}

const enableObs = () => {
  // enable obs integration
  // test port and pw
  // if fail, go back a step
}
const previousStep = () => {
  let stepSize = 1
  while (firstRunSteps.value[currentInitialSetting.value - stepSize].skip) {
    stepSize++
  }
  currentInitialSetting.value -= stepSize
}

const nextStep = (action?: () => void) => {
  if (action) action()
  if (initialSettingsDone.value) {
    isNew.value = ''
  } else {
    let stepSize = 1
    while (firstRunSteps.value[currentInitialSetting.value + stepSize].skip) {
      stepSize++
    }
    currentInitialSetting.value += stepSize
  }
}
</script>
