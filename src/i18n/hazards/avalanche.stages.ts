import type { StageCopy } from '../types'
import { stageBandAt, stageIndexForBands, type StageBand } from './stageUtils'

export const AVALANCHE_STAGE_BANDS: StageBand[] = [
  { startSec: 0, endSec: 3 },
  { startSec: 3, endSec: 6 },
  { startSec: 6, endSec: 7.5 },
  { startSec: 7.5, endSec: 9 },
  { startSec: 9, endSec: 11 },
  { startSec: 11, endSec: 15 },
  { startSec: 15, endSec: 18 },
  { startSec: 18, endSec: 22 },
  { startSec: 22, endSec: 26 },
  { startSec: 26, endSec: 30 },
]

export function avalancheStageIndex(t: number): number {
  return stageIndexForBands(AVALANCHE_STAGE_BANDS, t)
}

export function avalancheStageBand(index: number): StageBand {
  return stageBandAt(AVALANCHE_STAGE_BANDS, index)
}

export const avalancheStagesEn: StageCopy[] = [
  {
    id: 'loading',
    title: 'Snow loading — storm deposition',
    descriptionEngineering:
      'Fresh snow adds normal stress σ_n on slope angle α; density ρ increases toward storm-snow values while basal friction μ is unchanged. Shear stress on buried weak layers rises slowly—compare slope α and density ρ readouts.',
    descriptionSimple:
      'New snow falls on the mountain and stacks up like frosting on a cake. Each layer makes the hillside heavier and a little more slippery underneath.',
  },
  {
    id: 'metamorphism',
    title: 'Metamorphism — weak layer growth',
    descriptionEngineering:
      'Temperature gradients and vapor transport create faceted grains at a buried interface; effective shear strength drops while the slab above stays cohesive. Slab fracture depth z_s (readout) begins to register once release smoothstep activates near t ≈ 6 s.',
    descriptionSimple:
      'Hidden inside the snowpack, sugary weak snow forms like crisp cereal between strong layers. The top slab is still one piece, but it is resting on a fragile sheet.',
  },
  {
    id: 'tension-crack',
    title: 'Tension crack — slab tension',
    descriptionEngineering:
      'Bending of the slab under its own weight opens a crown fracture upslope; tensile stress concentrates at the crown while compression builds at the stauchwall. Released volume V remains zero until the weak layer fails completely.',
    descriptionSimple:
      'A long crack opens at the top of the slope, like ice splitting on a lake. The snow above the crack is starting to pull away from the mountain.',
  },
  {
    id: 'release',
    title: 'Release — slab failure',
    descriptionEngineering:
      'Shear overcomes μ·σ_n on the weak layer; slab depth z_s jumps and released volume V steps according to slab area × depth. The block detaches and gravity driving stress ∝ sin α exceeds resistive τ = μ·σ_n.',
    descriptionSimple:
      'The weak layer snaps and a huge plate of snow breaks free. It is no longer stuck to the hill—it is a sliding white raft ready to go.',
  },
  {
    id: 'acceleration',
    title: 'Acceleration — slab to flow',
    descriptionEngineering:
      'The detached slab accelerates downslope; speed v rises toward √(2gH) proxy values while runout distance L extends. Impact pressure P = ½ρv² climbs quickly—watch v and P on the panel.',
    descriptionSimple:
      'The snow plate tips forward and races downhill, faster and faster like a runaway sled. The air fills with a roaring white cloud.',
  },
  {
    id: 'mixed-regime',
    title: 'Mixed flow — powder and dense core',
    descriptionEngineering:
      'The flow separates into a low-density suspension (saltation) over a denser basal shear layer; effective ρ in P = ½ρv² reflects mixed regime. Voellmy-style friction limits how far L can grow for given μ and α.',
    descriptionSimple:
      'Some snow flies like a mist while a heavy core churns at the bottom. It looks like a white waterfall mixed with fog.',
  },
  {
    id: 'channelized',
    title: 'Channelized flow — gully confinement',
    descriptionEngineering:
      'Topography confines the avalanche into a gully, increasing depth and local ρ; runout L advances toward valley chalets offset from the path. Chalet severity indices begin rising when L and P exceed structure thresholds.',
    descriptionSimple:
      'The avalanche squeezes into a narrow valley and grows taller, like water in a hose. It is aimed straight at the row of alpine cabins.',
  },
  {
    id: 'impact',
    title: 'Impact — chalet loading',
    descriptionEngineering:
      'Front dynamic pressure P = ½ρv² loads walls; structures transition scoured → impact → buried as L overtakes each offset. Friction μ dominates deceleration but momentum still delivers destructive impulse to façades.',
    descriptionSimple:
      'The white wave smashes into chalets—windows shatter and roofs buckle. Snow piles up around the houses like a bulldozer made of fluff.',
  },
  {
    id: 'deposition',
    title: 'Deposition — runout stop',
    descriptionEngineering:
      'Basal friction and turbulent dissipation reduce v; impact pressure decays as L stabilizes at the Voellmy runout limit. Deposited volume spreads into a lobate terminal fan—chaletsAffected count holds on the readout.',
    descriptionSimple:
      'The avalanche spreads out and slows down, dumping snow in a big pile at the bottom of the valley. It finally grinds to a halt, leaving buried and broken cabins behind.',
  },
  {
    id: 'static-settle',
    title: 'Static settle — post-flow pack',
    descriptionEngineering:
      'Pore pressure equilibrates and the deposit compacts; ρ increases slightly while v → 0. Residual stress in the snowpack is negligible; engineering readouts show background friction-dominated values.',
    descriptionSimple:
      'Everything goes quiet. The snow pile settles like fresh laundry on a bed, and only the damaged chalets show where the slide passed.',
  },
]

export const avalancheStagesZhTW: StageCopy[] = [
  {
    id: 'loading',
    title: '積雪 — 暴風雪堆積',
    descriptionEngineering:
      '新雪在坡度 α 上增加法向應力 σ_n；密度 ρ 朝暴風雪值上升，基底摩擦 μ 不變。 buried 弱面剪應力緩升—對照 α 與 ρ 讀數。',
    descriptionSimple:
      '新雪落在山上，像蛋糕上再抹一層糖霜。每一層都讓山坡更重，底下也更容易滑動。',
  },
  {
    id: 'metamorphism',
    title: '變質 — 弱層形成',
    descriptionEngineering:
      '溫度梯度與水汽輸運在 buried 界面形成稜角晶粒，有效抗剪強度下降而上層雪塊仍連貫。釋放 smoothstep 在 t≈6 s 附近啟動後，z_s 讀數開始上升。',
    descriptionSimple:
      '雪包深處長出像脆穀片一樣的弱雪，夾在硬雪之間。上面整片雪還是一體，但底下像墊了一張薄紙。',
  },
  {
    id: 'tension-crack',
    title: '張力裂 — 雪塊受拉',
    descriptionEngineering:
      '雪塊自重彎曲在上坡形成 crown 裂縫；拉應力集中，stauchwall 處壓應力增大。弱面完全破裂前 V 仍為零。',
    descriptionSimple:
      '坡頂出現長長的裂縫，像結冰的湖面裂開。裂縫上方的雪正慢慢和山坡分家。',
  },
  {
    id: 'release',
    title: '釋放 — 雪塊破裂',
    descriptionEngineering:
      '弱面剪應力超過 μ·σ_n；z_s 跳升，V 依面積×深度階躍。雪塊脫離，重力驅動應力 ∝ sin α 超過 τ=μ·σ_n。',
    descriptionSimple:
      '弱層「啪」地斷了，一大片雪離開山坡。它像白色大筏，準備往下滑。',
  },
  {
    id: 'acceleration',
    title: '加速 — 滑塊轉流',
    descriptionEngineering:
      '脫離雪塊沿坡加速；v 朝 √(2gH) proxy 上升，滑距 L 延伸。P=½ρv² 快速增大—請看 v 與 P。',
    descriptionSimple:
      '雪板往前一傾，越滑越快，像失控的雪橇。空氣裡充滿轟隆的白霧聲。',
  },
  {
    id: 'mixed-regime',
    title: '混合流 — 粉雪與密核',
    descriptionEngineering:
      '流體分為低密度懸浮與高密度底層；P=½ρv² 中的有效 ρ 反映混合狀態。Voellmy 摩擦限制给定 μ、α 下 L 的上限。',
    descriptionSimple:
      '有些雪像霧一樣飛，底下則有沉重的核心翻滾。看起來像混了霧的白色瀑布。',
  },
  {
    id: 'channelized',
    title: '束流 — 溝谷限制',
    descriptionEngineering:
      '地形把雪崩束在溝谷，局部加深、ρ 上升；L 朝偏移的山屋推進。L 與 P 超過門檻時山屋 severity 開始上升。',
    descriptionSimple:
      '雪崩擠進窄谷變更高，像水灌進水管，直對著小木屋列隊衝去。',
  },
  {
    id: 'impact',
    title: '衝擊 — 山屋受力',
    descriptionEngineering:
      '前緣 P=½ρv² 載重外牆；隨 L 越過各 offset，損害由掃刷→衝擊→掩埋。μ 主導減速但動量仍對立面造成破壞脈衝。',
    descriptionSimple:
      '白浪撞上小木屋—窗戶碎、屋頂彎。雪像 fluffy 推土機一樣堆在房子四周。',
  },
  {
    id: 'deposition',
    title: '堆積 — 滑距終止',
    descriptionEngineering:
      '基底摩擦與湍散使 v 下降；L 在 Voellmy 滑距限附近穩定，P 衰減。堆積體呈舌狀—chaletsAffected 讀數定格。',
    descriptionSimple:
      '雪崩散開變慢，在谷底堆成大雪堆，終於停住。被埋、被毀的小木屋留在原地。',
  },
  {
    id: 'static-settle',
    title: '靜置 — 堆積壓實',
    descriptionEngineering:
      '孔隙水壓平衡、堆積體壓實，ρ 略升而 v→0。雪包殘餘應力可忽略；讀數回到摩擦主導背景值。',
    descriptionSimple:
      '一切安靜下來。雪堆像剛鋪好的床單慢慢沉下去，只有壞掉的小木屋記得雪路徑過。',
  },
]
