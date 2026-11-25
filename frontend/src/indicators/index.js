import { registerIndicator } from 'klinecharts'
import { cmMacdMtfIndicator } from './cmMacdMtf'
import { adxDiBeikabuIndicator } from './adxDiBeikabu'
import { weisWaveVolumeIndicator } from './weisWaveVolume'
import { volumeOverlayIndicator } from './volumeOverlay'
import { superTrendIndicator } from './supertrend'
import { volumeProfileIndicator } from './volumeProfile'
import { ichimokuCloudIndicator } from './ichimokuCloud'
import { vwapIndicator } from './vwap'
import { mfiIndicator } from './mfi'
import { squeezeMomentumIndicator } from './squeezeMomentum'
import { waveTrendIndicator } from './waveTrend'
import { TRADINGVIEW_SUB_INDICATORS } from './tradingViewSubIndicators'
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
  registerIndicator(superTrendIndicator)
  registerIndicator(volumeProfileIndicator)
  registerIndicator(ichimokuCloudIndicator)
  registerIndicator(vwapIndicator)
  registerIndicator(mfiIndicator)
  registerIndicator(squeezeMomentumIndicator)
  registerIndicator(waveTrendIndicator)
  TRADINGVIEW_SUB_INDICATORS.forEach((ind) => registerIndicator(ind))
  registerCustomOverlays()
  registered = true
}
