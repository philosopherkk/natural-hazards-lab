import type { StageCopy } from '../types'
import { stageBandAt, stageIndexForBands, type StageBand } from './stageUtils'

export const TSUNAMI_STAGE_BANDS: StageBand[] = [
  { startSec: 0, endSec: 3 },
  { startSec: 3, endSec: 5 },
  { startSec: 5, endSec: 8 },
  { startSec: 8, endSec: 12 },
  { startSec: 12, endSec: 16 },
  { startSec: 16, endSec: 18 },
  { startSec: 18, endSec: 22 },
  { startSec: 22, endSec: 26 },
  { startSec: 26, endSec: 28 },
  { startSec: 28, endSec: 30 },
]

export function tsunamiStageIndex(t: number): number {
  return stageIndexForBands(TSUNAMI_STAGE_BANDS, t)
}

export function tsunamiStageBand(index: number): StageBand {
  return stageBandAt(TSUNAMI_STAGE_BANDS, index)
}

export const tsunamiStagesEn: StageCopy[] = [
  {
    id: 'plate-lock',
    title: 'Plate lock — offshore strain',
    descriptionEngineering:
      'Subduction plates stick while elastic strain accumulates in the overriding crust and ocean floor; fault slip D remains negligible. Wave height H and celerity c = √(gh) stay at background—only offshore strain energy grows.',
    descriptionSimple:
      'Far out at sea, two giant pieces of Earth are stuck together like glued shoes. The ground under the ocean bends slowly, storing up a big squeeze.',
  },
  {
    id: 'nucleation',
    title: 'Nucleation — rupture begins',
    descriptionEngineering:
      'The locked patch starts to slip at the hypocenter; D increases within a smooth pulse between t ≈ 1.5–8 s in the model. Seafloor uplift begins lifting the water column, but H is still small compared to later shoaling.',
    descriptionSimple:
      'The stuck spot finally twitches and begins to tear. A tiny jolt under the sea starts to push water upward, like lifting a rug’s edge.',
  },
  {
    id: 'co-seismic-slip',
    title: 'Co-seismic slip — seafloor uplift',
    descriptionEngineering:
      'Rapid fault slip D lifts the seafloor; initial tsunami height H scales with slip and source width, setting wavelength λ from the rupture dimension. Wave front distance x = c·Δt starts advancing once tTravel > 0 after the source time.',
    descriptionSimple:
      'The seafloor jumps in one big jerk, shoving a huge hill of water above it. The ocean is no longer flat—a long bump begins to spread.',
  },
  {
    id: 'deep-propagation',
    title: 'Deep propagation — long waves',
    descriptionEngineering:
      'In deep water, phase speed follows c = √(gh) with small h; the tsunami travels fast with low amplitude. Froude number Fr = U/√(gH) stays moderate; compare celerity and wave height readouts as the front propagates.',
    descriptionSimple:
      'The water bump races across the deep ocean so fast ships might barely feel it. It is wide and low, like a fast-moving platform under the sea.',
  },
  {
    id: 'shoaling-start',
    title: 'Shoaling start — depth decreases',
    descriptionEngineering:
      'As bathymetry shallows, conservation of energy flux concentrates wave height: H rises while c = √(gh) falls. Fr increases toward shore, signaling steeper, more destructive forms—watch H and Fr climb together.',
    descriptionSimple:
      'The wave reaches shallower water and stands up taller, like a roller slowing at the bottom of a hill but growing higher. It becomes easier to see from the beach.',
  },
  {
    id: 'runup-build',
    title: 'Run-up build — coastal amplification',
    descriptionEngineering:
      'Run-up R ~ H · slope amplification drives water above mean sea level; arrival smoothstep near t ≈ 10–14 s marks coastal approach in the model. Inundation depth h_i begins rising where shoreline slope traps flux.',
    descriptionSimple:
      'The wave climbs the underwater slope and grows into a wall of water aimed at the coast. Beachgoers would see a dark line on the horizon getting bigger.',
  },
  {
    id: 'inundation',
    title: 'Inundation — coastal flooding',
    descriptionEngineering:
      'h_i at the shoreline proxy peaks as runup R and H combine; coastal structures transition surge → flood → collapse by h_i thresholds. Dynamic pressure on walls scales with depth and flow speed U in Fr = U/√(gH).',
    descriptionSimple:
      'Water pours over beaches and into streets, picking up cars and boats like bath toys. Houses first get wet, then flooded, as the sea pushes inland.',
  },
  {
    id: 'structural-failure',
    title: 'Structural failure — building response',
    descriptionEngineering:
      'Hydrostatic and hydrodynamic loads exceed coastal building capacity; affected structure count rises on the readout as h_i persists. Fr remains elevated while flow is supercritical on steep beach faces.',
    descriptionSimple:
      'Some weaker buildings buckle or float off their foundations when the push of water is too strong. Debris rides the current like a messy soup.',
  },
  {
    id: 'recession',
    title: 'Recession — drawdown',
    descriptionEngineering:
      'Wave energy dissipates through bottom friction and breaking; h_i and Fr decay while slip pulse has ended. Offshore trough follows crest, temporarily exposing seabed—x advance slows as celerity drops in very shallow h.',
    descriptionSimple:
      'The sea pulls back, sucking water off the beach and leaving fish flopping on sand. It feels like the ocean took a huge breath in after shouting.',
  },
  {
    id: 'quiet-coast',
    title: 'Quiet coast — residual surge',
    descriptionEngineering:
      'Inundation depth h_i approaches zero in the model window; structure damage tallies hold while free surface oscillations damp. Celerity and wave height readouts return toward calm-shore values.',
    descriptionSimple:
      'Waves finally slosh lower and the coast goes quiet, but mud and broken homes show where the tsunami visited. Cleanup begins while the ocean rocks gently.',
  },
]

export const tsunamiStagesZhTW: StageCopy[] = [
  {
    id: 'plate-lock',
    title: '板塊鎖定 — 離岸應變',
    descriptionEngineering:
      '俯衝帶板塊卡住，上覆地殼與海底彈性應變累積；滑移 D 仍可忽略。H 與 c=√(gh) 維持背景—僅離岸應變能上升。',
    descriptionSimple:
      '遠海兩大塊地球像黏住的鞋底互相卡住。海底慢慢被彎曲，把一股大勁憋在心裡。',
  },
  {
    id: 'nucleation',
    title: '成核 — 破裂開始',
    descriptionEngineering:
      '鎖定段在震源開始滑移；模型中 D 在 t≈1.5–8 s 的 smooth 脈衝內上升。海底抬升推動水柱，但 H 仍小於後續淺化階段。',
    descriptionSimple:
      '卡住的地方終於抽動、開始撕裂。海底輕輕一頂，像掀起地毯邊角，推起一點水。',
  },
  {
    id: 'co-seismic-slip',
    title: '同震滑移 — 海底抬升',
    descriptionEngineering:
      '快速滑移 D 抬升海底；初始 H 隨滑移與源寬縮放，λ 由破裂尺度設定。源時後 tTravel>0 時 x=c·Δt 開始前進。',
    descriptionSimple:
      '海底猛地一跳，把一大包水頂上去。海面不再平坦—長長的水丘開始擴散。',
  },
  {
    id: 'deep-propagation',
    title: '深海傳播 — 長波',
    descriptionEngineering:
      '深水 c=√(gh) 使海嘯高速、低振幅前進。Fr=U/√(gH) 適中—對照 celerity 與 H 隨波前推進。',
    descriptionSimple:
      '水丘在深海跑得很快，大船可能只覺得輕微晃動。它又寬又矮，像海底底下快速移動的平台。',
  },
  {
    id: 'shoaling-start',
    title: '淺化起始 — 水深變淺',
    descriptionEngineering:
      '地形變淺使能通量集中，H 上升、c 下降。Fr 向岸增大，波形更陡、更具破壞性—觀察 H 與 Fr 同步上升。',
    descriptionSimple:
      '浪進入淺水區站得更高，像雲霄飛車到底部卻變高。從沙灘上越來越看得清楚。',
  },
  {
    id: 'runup-build',
    title: '爬高累積 — 海岸放大',
    descriptionEngineering:
      'R~H·坡度放大使水位高於平均海平面；模型 t≈10–14 s 的 arrival smoothstep 標記近岸。岸坡困住通量時 h_i 開始上升。',
    descriptionSimple:
      '浪沿水下斜坡爬升，變成指向海岸的水牆。海邊的人會看見地平線上深色線條越來越大。',
  },
  {
    id: 'inundation',
    title: '淹水 — 海岸溢流',
    descriptionEngineering:
      '岸線 proxy 的 h_i 在 R 與 H 合成下達峰；建物依 h_i 由 surge→flood→collapse 轉換。牆面動壓隨深度與 U 在 Fr=U/√(gH) 中體現。',
    descriptionSimple:
      '水漫過沙灘衝進街道，像洗澡玩具一樣推走車和船。房子先進水，再被整片海水往內陸推。',
  },
  {
    id: 'structural-failure',
    title: '結構破壞 — 建物反應',
    descriptionEngineering:
      '靜水與動水載重超過海岸建物能力；h_i 持續時受影響戶數上升。陡坡面上 Fr 仍高，流動可呈超臨界。',
    descriptionSimple:
      '較弱的房子被水推得歪倒或整棟浮起。碎片在水流裡像雜燴湯一樣翻滾。',
  },
  {
    id: 'recession',
    title: '退水 — 抽吸',
    descriptionEngineering:
      '底摩擦與破碎耗散使 h_i、Fr 衰減；滑移脈衝已結束。波峰後離岸 trough 暫時露出海床—極淺 h 下 c 下降使 x 推進變慢。',
    descriptionSimple:
      '海水驟退，把沙灘上的水吸走，魚在沙上跳。像海洋大吼之後用力吸一口氣。',
  },
  {
    id: 'quiet-coast',
    title: '海岸寧靜 — 殘餘湧浪',
    descriptionEngineering:
      '模型時間窗內 h_i 趨近零；建物損害計數定格，自由面振盪阻尼。celerity 與 H 讀數回到近岸平靜值。',
    descriptionSimple:
      '浪終於變小，海岸安靜，但泥濘與破損的家顯示海嘯來過。人們開始清理，海面輕輕搖晃。',
  },
]
