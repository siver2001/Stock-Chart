import { registerIndicator } from 'klinecharts'
import { cmMacdMtfIndicator } from './cmMacdMtf'
import { adxDiBeikabuIndicator } from './adxDiBeikabu'
import { weisWaveVolumeIndicator } from './weisWaveVolume'
import { volumeOverlayIndicator } from './volumeOverlay'
import { registerCustomOverlays } from './customOverlays'

let registered = false

export function registerAllCustomIndicators() {
  if (registered) return
  registerIndicator(volumeOverlayIndicator)
  registerIndicator(cmMacdMtfIndicator)
  registerIndicator(adxDiBeikabuIndicator)
  registerIndicator({ ...adxDiBeikabuIndicator, name: 'ADX_DI_BO' })
  registerIndicator(weisWaveVolumeIndicator)
  registerIndicator({ ...weisWaveVolumeIndicator, name: 'WEIS_WAVE_VOL' })
  registerCustomOverlays()
  registered = true
}
