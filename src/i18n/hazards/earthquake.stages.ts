import type { StageCopy } from '../types'
import { stageBandAt, stageIndexForBands, type StageBand } from './stageUtils'

export const EARTHQUAKE_STAGE_BANDS: StageBand[] = [
  { startSec: 0, endSec: 3 },
  { startSec: 3, endSec: 6 },
  { startSec: 6, endSec: 9 },
  { startSec: 9, endSec: 12 },
  { startSec: 12, endSec: 16 },
  { startSec: 16, endSec: 18 },
  { startSec: 18, endSec: 20 },
  { startSec: 20, endSec: 24 },
  { startSec: 24, endSec: 27 },
  { startSec: 27, endSec: 30 },
]

export function earthquakeStageIndex(t: number): number {
  return stageIndexForBands(EARTHQUAKE_STAGE_BANDS, t)
}

export function earthquakeStageBand(index: number): StageBand {
  return stageBandAt(EARTHQUAKE_STAGE_BANDS, index)
}

export const earthquakeStagesEn: StageCopy[] = [
  {
    id: 'strain-build',
    title: 'Strain build — locked fault',
    descriptionEngineering:
      'Crustal blocks store elastic strain across the fault; slip δ and seismic moment M₀ remain near zero. PGA and Sa(0.3 s) readouts stay at background while static stress increases toward failure.',
    descriptionSimple:
      'Two sides of a rocky crack are stuck together while the ground slowly pulls them apart. It feels quiet, but the rocks are squeezing like a spring being stretched.',
  },
  {
    id: 'pre-slip',
    title: 'Pre-slip — nucleation zone',
    descriptionEngineering:
      'A small patch begins to slide; rupture duration window opens near model ruptureStart. P-wave radius r_P = v_P·t expands first—compare r_P and r_S readouts as the fast wave outruns slower S energy.',
    descriptionSimple:
      'A tiny part of the fault starts to slip first, like a zipper beginning to open. Very fast wiggles (P-waves) race outward before the stronger shaking arrives.',
  },
  {
    id: 'p-arrival',
    title: 'P-wave arrival — first motion',
    descriptionEngineering:
      'Compressional P-waves reach the city with vertical and longitudinal ground motion; PGA rises slightly but Sa remains moderate. Buildings feel a sharp jolt—structural demand is still below collapse thresholds.',
    descriptionSimple:
      'The first quick jolt hits town—like someone bumped the table leg. It is over in a blink, and people wonder if something bigger is coming.',
  },
  {
    id: 'rupture-front',
    title: 'Rupture front — growing slip',
    descriptionEngineering:
      'Slip δ accelerates inside the rupture window; M_w proxy from M₀ increases with μ·A·δ. Slip rate peaks while the rupture front propagates along strike—PGA envelope begins its main rise.',
    descriptionSimple:
      'The crack rips faster along the fault, like tearing a long piece of fabric. The ground shudders harder as more rock breaks loose at once.',
  },
  {
    id: 's-arrival',
    title: 'S-wave arrival — shear shaking',
    descriptionEngineering:
      'Shear S-waves arrive after P, producing larger horizontal accelerations; r_S = v_S·t lags r_P as shown on readouts. Sa(0.3 s) climbs toward values that excite typical building periods near 0.3 s.',
    descriptionSimple:
      'Stronger side-to-side shaking arrives—the kind that makes lamp chains swing in circles. This is usually when people run outside or hide under desks.',
  },
  {
    id: 'peak-shaking',
    title: 'Peak shaking — PGA maximum',
    descriptionEngineering:
      'PGA and shaking envelope E peak while δ is still accumulating; spectral acceleration Sa drives cracked → heavy → collapse transitions by distance decay. City root motion in the scene scales with this envelope.',
    descriptionSimple:
      'The ground dances its wildest—dishes crash and walls crack. It feels like the whole city is on a trampoline during a storm.',
  },
  {
    id: 'structural-response',
    title: 'Structural response — building damage',
    descriptionEngineering:
      'Buildings oscillate at their natural periods; demand vs capacity sets severity indices on the readout. Nonlinear effects (pounding, soft story) are implied once Sa exceeds code-like proxies in the model.',
    descriptionSimple:
      'Tall buildings sway like trees in wind; some brick walls crumble and chimneys topple. Homes farther from the fault may still crack if they are old or weak.',
  },
  {
    id: 'rupture-end',
    title: 'Rupture end — slip stops',
    descriptionEngineering:
      'Slip rate falls as the rupture front passes; δ approaches its final value and M_w stabilizes. PGA decays but coda shaking continues from reverberations and basin effects in the envelope E.',
    descriptionSimple:
      'The fault finishes ripping and the biggest kicks stop. The ground still rumbles softly, like thunder fading after lightning.',
  },
  {
    id: 'coda-decay',
    title: 'Coda decay — ringing ground',
    descriptionEngineering:
      'Shaking envelope E decays with a windowed sinusoid after ruptureEnd + 8 s in the model; Sa and PGA fall toward background. P-wave and S-wave radii continue expanding but amplitudes diminish with distance and damping.',
    descriptionSimple:
      'Shaking eases to a gentle roll, then almost nothing. Dust hangs in the air while people check on neighbors and leaks.',
  },
  {
    id: 'quiet-city',
    title: 'Quiet city — post-event',
    descriptionEngineering:
      'All kinematic readouts return near baseline; buildingsAffected count is fixed. Residual static offset across the fault remains (δ final) even though dynamic shaking has ended.',
    descriptionSimple:
      'The city goes still except for car alarms and sirens. Broken glass glitters on sidewalks, but the earth itself rests again.',
  },
]

export const earthquakeStagesZhTW: StageCopy[] = [
  {
    id: 'strain-build',
    title: '應變累積 — 斷層鎖定',
    descriptionEngineering:
      '地殼塊體在斷層兩側蓄積彈性應變；滑移 δ 與 M₀ 近零。PGA 與 Sa 維持背景，靜應力朝破裂臨界上升。',
    descriptionSimple:
      '岩石裂縫兩邊卡住，地面卻慢慢把它們往外拉。表面很安靜，但岩石像被拉緊的彈簧。',
  },
  {
    id: 'pre-slip',
    title: '預滑 — 成核區',
    descriptionEngineering:
      '小 patch 開始滑移；模型 ruptureStart 附近破裂時間窗開啟。P 波半徑 r_P=v_P·t 先擴張—對照 r_P 與較慢的 r_S。',
    descriptionSimple:
      '斷層上一小段先動，像拉鍊剛拉開一點。很快的抖動（P 波）先跑出去，強烈搖晃還在後面。',
  },
  {
    id: 'p-arrival',
    title: 'P 波抵達 — 初至',
    descriptionEngineering:
      '縱波 P 波先到，引起垂直與縱向地面運動；PGA 略升但 Sa 仍 moderate。建物感到短促一震，需求仍低於倒塌門檻。',
    descriptionSimple:
      '第一下快抖進城—像有人踢到桌腳。一眨眼就過，大家想：會不會還有更大的？',
  },
  {
    id: 'rupture-front',
    title: '破裂前緣 — 滑移擴大',
    descriptionEngineering:
      'δ 在破裂窗內加速；M_w proxy 隨 μ·A·δ 上升。滑移率峰值隨破裂前緣沿走向傳播—PGA 包絡開始主要上升。',
    descriptionSimple:
      '裂縫沿斷層越撕越快，像扯開一條長布。越多岩石同時崩滑，地面抖得越厲害。',
  },
  {
    id: 's-arrival',
    title: 'S 波抵達 — 剪切搖晃',
    descriptionEngineering:
      '剪切 S 波晚於 P 波，水平加速度更大；r_S=v_S·t 落後 r_P。Sa(0.3 s) 爬向接近 0.3 s 週期建物的共振強度。',
    descriptionSimple:
      '更強的左右搖來了—燈鏈會畫圈圈。這時很多人往外跑或躲桌下。',
  },
  {
    id: 'peak-shaking',
    title: '峰值震動 — PGA 最大',
    descriptionEngineering:
      'PGA 與包絡 E 在 δ 仍累積時達峰；Sa 依距離衰減驅動 cracked→heavy→collapse。場景中城市晃動幅度隨包絡放大。',
    descriptionSimple:
      '地面跳得最瘋—碗盤摔、牆裂。整座城市像暴風雨裡的彈簧床。',
  },
  {
    id: 'structural-response',
    title: '結構反應 — 建物損害',
    descriptionEngineering:
      '建物以自振週期擺動；需求對容量決定 readout severity。Sa 超過模型 code-like proxy 時暗示 pounding、軟弱層等非線性效應。',
    descriptionSimple:
      '高樓像大樹迎風擺；磚牆碎、煙囪倒。離斷層較遠的舊房子也可能裂。',
  },
  {
    id: 'rupture-end',
    title: '破裂結束 — 滑移停止',
    descriptionEngineering:
      '滑移率隨破裂前緣通過而下降；δ 趨最終值，M_w 穩定。PGA 衰減但包絡 E 仍有尾波盆地效應。',
    descriptionSimple:
      '斷層撕完，最大的踢踏停了。地面仍輕微隆隆，像雷聲漸遠。',
  },
  {
    id: 'coda-decay',
    title: '尾波衰減 — 地面餘振',
    descriptionEngineering:
      'ruptureEnd+8 s 後 E 以窗化正弦衰減；Sa、PGA 回背景。P/S 波半徑仍擴張但振幅隨距離阻尼減小。',
    descriptionSimple:
      '搖晃變成輕微滾動，然後幾乎靜止。塵埃懸在空中，人們開始互問平安、找漏水。',
  },
  {
    id: 'quiet-city',
    title: '城市寧靜 — 震後',
    descriptionEngineering:
      '運動讀數近 baseline；buildingsAffected 定格。δ 最終靜態位錯仍在，動態搖晃已結束。',
    descriptionSimple:
      '城市安靜下來，只剩警報與救護聲。碎玻璃在人行道閃亮，大地本身終於休息。',
  },
]
