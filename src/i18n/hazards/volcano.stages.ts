import type { StageCopy } from '../types'
import { stageBandAt, stageIndexForBands, type StageBand } from './stageUtils'

export const VOLCANO_STAGE_BANDS: StageBand[] = [
  { startSec: 0, endSec: 3 },
  { startSec: 3, endSec: 6 },
  { startSec: 6, endSec: 8 },
  { startSec: 8, endSec: 10 },
  { startSec: 10, endSec: 12 },
  { startSec: 12, endSec: 16 },
  { startSec: 16, endSec: 20 },
  { startSec: 20, endSec: 24 },
  { startSec: 24, endSec: 27 },
  { startSec: 27, endSec: 30 },
]

export function volcanoStageIndex(t: number): number {
  return stageIndexForBands(VOLCANO_STAGE_BANDS, t)
}

export function volcanoStageBand(index: number): StageBand {
  return stageBandAt(VOLCANO_STAGE_BANDS, index)
}

export const volcanoStagesEn: StageCopy[] = [
  {
    id: 'chamber-influx',
    title: 'Chamber influx — melt delivery',
    descriptionEngineering:
      'Basaltic melt enters a shallow reservoir at modest mass flux; bulk compressibility and chamber volume set how fast P_chamber rises while vent discharge Q remains near zero. Microseismic RMS and surface inflation track the growing melt fraction without opening the conduit.',
    descriptionSimple:
      'Hot melted rock trickles into a pocket under the volcano, like filling a balloon under the mountain. Nothing has erupted yet, but the ground may swell a tiny bit and small shakes can be felt far away.',
  },
  {
    id: 'pressurization',
    title: 'Pressurization — gas and strain',
    descriptionEngineering:
      'Volatile exsolution raises internal gas pressure; SO₂ flux and long-period tremor increase as the roof loads elastically. Country rock around the chamber stores strain energy while roof yield margin (see readouts) begins to fall from early ash fallout on distant slopes.',
    descriptionSimple:
      'Bubbles of gas build up inside the magma, making the pocket feel tight like a shaken soda bottle. The mountain grumbles more often, and a little gray dust may drift onto roofs downhill.',
  },
  {
    id: 'fracture-link',
    title: 'Fracture linkage — path to the vent',
    descriptionEngineering:
      'Ring fractures and dyke tips connect the chamber to the conduit; effective permeability jumps so ΔP can bleed upward once the vent unseals. Viscosity η(T) still governs whether ascent will stay laminar once Q opens—watch η and Q readouts in the next steps.',
    descriptionSimple:
      'Cracks grow upward like roots through the rock until they almost reach the crater. The magma is getting a hallway to the surface, but the top is still plugged.',
  },
  {
    id: 'vent-unsealing',
    title: 'Pre-eruptive — vent unsealing',
    descriptionEngineering:
      'Overpressure exceeds lithostatic load at the vent seal; rock plugs fail and the first gas puffs escape. Chamber pressure P_chamber starts a controlled drop while micro-tremor spikes; heat flux Q̇ remains small until sustained magma ascent begins.',
    descriptionSimple:
      'The cork at the top wiggles loose and wisps of steam and ash puff out. It sounds like the mountain is breathing hard before the big sneeze.',
  },
  {
    id: 'jet-onset',
    title: 'Onset — jet and dynamic pressure',
    descriptionEngineering:
      'Sudden ΔP drives Q upward through the conduit; Hagen–Poiseuille flow sets mean ascent velocity u, and dynamic pressure q = ½ρu² loads façades and trees. Thermal flux Q̇ scales with Q·ΔT as molten material reaches the crater—compare q and Q on the engineering panel.',
    descriptionSimple:
      'The eruption starts for real: lava and hot gas shoot up the throat of the volcano. A strong hot wind can slam into houses like a gust from a furnace.',
  },
  {
    id: 'plume-rise',
    title: 'Plume rise — ash column',
    descriptionEngineering:
      'Buoyancy from hot mixture drives a convective plume; entrainment dilutes the column while ash load on roofs increases with integrated fallout flux. Plume height sets wind-borne ash reach; yield margin on village structures falls as ash load factor grows in the readouts.',
    descriptionSimple:
      'A tall dark cloud towers into the sky, sprinkling ash like dirty snow on the village. Roofs get heavy with gray powder and the air smells like burnt rock.',
  },
  {
    id: 'effusion-peak',
    title: 'Peak effusion — lava channel',
    descriptionEngineering:
      'Sustained supply keeps Q high; channel depth d scales empirically with (Q/v)^0.35 as lava accelerates down slope. Crystal fraction falls while T stays high; conduit tracers show maximum activity in the 3D view.',
    descriptionSimple:
      'A bright river of lava pours out of the crater and races down the mountainside. It glows orange at night and melts anything flammable in its path.',
  },
  {
    id: 'lava-front',
    title: 'Lava front — slope impacts',
    descriptionEngineering:
      'The integrated lava front advances with effusion history; structures transition through ash, blast, fire, and burial thresholds by distance and time. Heat flux and q decay slowly with distance but burial depth grows where the front stalls against buildings.',
    descriptionSimple:
      'The slow-moving lava tongue reaches homes on the slope. Some houses catch fire from the heat, others get buried like toys in wet sand.',
  },
  {
    id: 'waning',
    title: 'Waning — declining discharge',
    descriptionEngineering:
      'Chamber pressure and Q fall as the reservoir drains; η rises as T drops and tremor RMS decays. Plume collapses locally while lava channels crust over; structure severity tallies stabilize as new damage stops.',
    descriptionSimple:
      'The roaring quiets and the lava river starts to thicken and stop moving. Ash still hangs in the air, but the worst of the blast is over.',
  },
  {
    id: 'post-eruptive',
    title: 'Post-eruptive — cooling tally',
    descriptionEngineering:
      'Residual heat flux and minor gas release continue while P_chamber approaches lithostatic equilibrium. Final structure counts reflect ash load, dynamic pressure, thermal exposure, and burial—parameters return toward background in the readouts.',
    descriptionSimple:
      'The volcano rests while people count damaged homes. The ground is still warm, like embers after a campfire, and scientists watch for smaller after-puffs.',
  },
]

export const volcanoStagesZhTW: StageCopy[] = [
  {
    id: 'chamber-influx',
    title: '岩漿房進流 — 熔體補給',
    descriptionEngineering:
      '玄武質熔體以有限質量通量進入淺部岩漿房；體積模量與房室容積決定 P_chamber 上升速率，此時噴口排放 Q 仍接近零。微震 RMS 與地表抬升隨熔體分率增加，通道尚未打開。',
    descriptionSimple:
      '滾燙的熔岩慢慢流進山底下的「大口袋」，像在地底吹氣球。還沒噴發，但地面可能微微鼓起，遠處偶爾感到小震動。',
  },
  {
    id: 'pressurization',
    title: '增壓 — 揮發分與應變',
    descriptionEngineering:
      '揮發分逸出使內壓升高，SO₂ 通量與長週期震動增強，頂板彈性負荷蓄積。遠坡早期落灰使屋頂強度裕度（讀數面板）開始下降。',
    descriptionSimple:
      '岩漿裡的氣泡越來越多，像搖過的汽水瓶。山開始更常低吼，灰塵像細粉飄到山下人家的屋頂。',
  },
  {
    id: 'fracture-link',
    title: '裂隙連通 — 通往火山口',
    descriptionEngineering:
      '環狀裂隙與岩脈尖端連通岩漿房與通道，有效滲透率跳升，一旦噴口解封 ΔP 可向上洩放。黏度 η(T) 仍決定 Q 開啟後流動是否維持層流—請對照後續 η 與 Q 讀數。',
    descriptionSimple:
      '裂縫像樹根往上長，幾乎通到火山口。岩漿有路可走了，但山頂還像被塞住。',
  },
  {
    id: 'vent-unsealing',
    title: '噴發前 — 噴口解封',
    descriptionEngineering:
      '超壓超過噴口封蓋的靜岩壓，岩塞破裂，首批氣體噴出。P_chamber 開始可控下降，微震峰值出現；在持續岩漿上升前 Q̇ 仍小。',
    descriptionSimple:
      '山頂的「瓶塞」鬆動，蒸氣和灰燻一下一下冒出來。像大噴嚏前深深吸氣。',
  },
  {
    id: 'jet-onset',
    title: '起始 — 射流與動壓',
    descriptionEngineering:
      'ΔP 驟降推升通道 Q；Hagen–Poiseuille 流決定平均上升速度 u，動壓 q=½ρu² 作用於外牆與樹木。熔體抵達火山口時 Q̇ 隨 Q·ΔT 增大—可對照工程面板的 q 與 Q。',
    descriptionSimple:
      '真正的噴發開始：滾燙的熔岩和熱氣衝出火山喉嚨。熱風像從火爐吹來，猛撞門窗。',
  },
  {
    id: 'plume-rise',
    title: '羽流上升 — 灰柱',
    descriptionEngineering:
      '高溫混合物的浮力驅動對流羽流；卷夾稀釋柱體，積分落灰通量使屋頂灰載增加。羽流高度決定下風灰害範圍；聚落結構裕度隨灰載因子下降。',
    descriptionSimple:
      '又黑又高的雲柱衝天，像髒髒的雪灑在村莊。屋頂被灰壓得變重，空氣聞起來像燒過的石頭。',
  },
  {
    id: 'effusion-peak',
    title: '峰值溢流 — 熔岩河道',
    descriptionEngineering:
      '穩定供應維持高 Q；河道深度 d 隨 (Q/v)^0.35 經驗關係增大。結晶分率在高溫下降低；3D 場景中通道示踪達最大活度。',
    descriptionSimple:
      '明亮的熔岩河從火山口湧出，沿山坡奔下。夜裡像橙色河流，路過的東西很容易被點燃。',
  },
  {
    id: 'lava-front',
    title: '熔岩前緣 — 坡面衝擊',
    descriptionEngineering:
      '積分熔岩前緣隨排放歷史前進；建物依距離與時間跨越灰載、衝擊、火災與掩埋門檻。熱通量與 q 隨距離衰減，但前緣停滯處掩埋深度增加。',
    descriptionSimple:
      '慢慢爬行的熔岩舌碰到坡上的房子。有的被烤到起火，有的像被濕沙子蓋住一樣被埋沒。',
  },
  {
    id: 'waning',
    title: '衰減 — 排放下降',
    descriptionEngineering:
      '房室排空使 P 與 Q 下降；降溫使 η 上升，震動 RMS 衰減。羽流局部塌縮，熔岩河道表面結殼；結構損害統計趨於穩定。',
    descriptionSimple:
      '吼聲變小，熔岩河開始變稠、幾乎不動。空中仍有灰，最猛烈的階段已過。',
  },
  {
    id: 'post-eruptive',
    title: '噴發後 — 冷卻統計',
    descriptionEngineering:
      '殘餘 Q̇ 與弱氣體釋放持續，P_chamber 趨近靜岩壓平衡。最終建物計數反映灰載、動壓、熱暴露與掩埋—讀數漸回背景值。',
    descriptionSimple:
      '火山安靜下來，大家數著壞掉的房子。地面仍暖，像營火餘燼，科學家留意較小的後續噴氣。',
  },
]
