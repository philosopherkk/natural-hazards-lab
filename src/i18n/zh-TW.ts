import type { Translations } from './types'

export const zhTW: Translations = {
  htmlLang: 'zh-TW',
  appTitle: '火山實驗室',
  appSubtitle: '互動式噴發時間軸',
  langToggle: 'English',
  langToggleAria: '切換語言為英文',
  timeline: '時間軸',
  timelineAria: '拖曳以調整 0 至 30 秒的噴發進程',
  intensity: '噴發強度',
  intensityAria: '調節火山口排放、羽流高度與熔岩輸出',
  cutaway: '剖面內部',
  cutawayAria: '顯示岩漿房、通道與地殼結構',
  labels: '解剖標籤',
  labelsAria: '顯示或隱藏三維模型上的標示',
  play: '播放',
  pause: '暫停',
  reverse: '倒播',
  reverseAria: '反向播放時間軸',
  reset: '重設',
  resetAria: '回到時間軸起點',
  stageHeading: '噴發階段',
  stageTime: '經過時間',
  legendHeading: '圖例',
  helpHeading: '操作與無障礙',
  helpIntro:
    '透過約 30 秒的 stylized 噴發循環，觀察岩漿儲存、通道運輸與地表過程如何演變。可拖曳時間軸或使用鍵盤快捷鍵。',
  footerVersion: '版本',
  footerUpdated: '更新日期',
  canvasAria: '含噴發動畫的三維火山模型',
  loading: '正在初始化 WebGL 場景…',
  loadingWebgl: '正在啟動 WebGL 渲染器…',
  loadingTextures: '正在準備地形材質…',
  loadingModel: '正在建立火山幾何…',
  loadingEffects: '正在載入噴發粒子…',
  labelChamber: '岩漿房',
  labelConduit: '火山通道',
  labelCrater: '火山口',
  labelLavaFlow: '熔岩流',
  labelPlume: '噴發羽流',
  legend: [
    { color: '#8b4513', label: '玄武質層理／圍岩' },
    { color: '#c45c26', label: '熔融岩漿與熔岩' },
    { color: '#6b7280', label: '火山灰與噴出物柱' },
    { color: '#fbbf24', label: '炽热火花與氣體輝光' },
  ],
  keyboard: [
    { keys: 'Space', action: '播放或暫停時間軸' },
    { keys: '← / →', action: '時間軸後退／前進' },
    { keys: 'Home', action: '跳至時間軸起點' },
    { keys: 'End', action: '跳至時間軸終點' },
    { keys: 'C', action: '切換剖面內部' },
    { keys: 'L', action: '切換解剖標籤' },
    { keys: 'R', action: '切換倒播' },
  ],
  stages: [
    {
      id: 'build-up',
      title: '積累期 — 岩漿匯聚與地殼應力',
      description:
        '在長期休眠期間，玄武質或安山質熔體於淺部岩漿庫中匯集，並由深部岩脈補充。在靜岩壓下，揮發分（H₂O、CO₂、S）仍以溶解態存在，但提高漿體整體可壓縮性。熱對流與結晶分異使上部岩漿庫逐漸富集矽與揮發分。隨岩漿注入，火山體與基盤蓄積彈性能，常於地表噴發前數月即出現微震與微弱形變（GPS、InSAR）。此階段通道常被淬火玻璃與熱液礦物部分封閉，使高壓氣體滯留。',
    },
    {
      id: 'pre-eruptive',
      title: '噴發前 — 脫氣、增壓與通道開啟',
      description:
        '當超壓接近頂板抗拉強度，裂隙向上穿過通道帶。揮發分出溶形成獨立氣相；氣泡成核、聚併並上升，降低有效密度、加速浮力驅動的上升。長週期地震與諧波事件反映流體在通道內的共振。山頂噴氣孔增強，釋出 SO₂ 與 H₂S；酸性淋濾可能削弱火山口壁。岩漿房自由面晃動並破碎泡沫頂蓋，首批富氣岩漿向火山口運移。這是封閉系統增壓轉向開放系統脫氣的關鍵過渡。',
    },
    {
      id: 'eruption-onset',
      title: '噴發起始 — 火山口開通與初期排放',
      description:
        '通道連通岩漿房與大氣後，沿解壓路徑壓力驟降。前沿岩漿經均相或非均相氣泡成核而破碎，形成液滴、晶體與膨脹氣體的多相射流。早期活動常為伏爾坎式或斯特龍博利式：間歇爆發噴出炽热彈與通道壁岩屑。在柱體崩塌形成高密度流之前，多為短促熔岩噴泉與濺落堆積。細粒灰自破裂氣泡壁進入羽流，開始順風輸運。',
    },
    {
      id: 'active',
      title: '活躍期 — 持續羽流、熔岩溢流與火山灰沉降',
      description:
        '在穩定岩漿供給下，噴發進入持續排放。噴發柱靠火山口動量通量與過熱氣體浮力上升；卷吸環境空氣降低整體密度，直至達中性浮力高度。細灰（<2 mm）經湍流擴散與重力沉降，形成降灰扇區與航空威脅。低黏度熔岩可自側翼裂隙或山頂涌出，形成渠化流，流變性隨溫度呈賓漢或牛頓行為並形成結殼與天然堤。羽流中冰粒摩擦帶電可產生閃電。通道侵蝕加寬火山口，調節質量噴出率。',
    },
    {
      id: 'settling',
      title: '衰歇期 — 排放減弱、柱體崩塌與噴發後冷卻',
      description:
        '隨岩漿房壓力與揮發分下降，質量通量減弱、羽流變矮。柱體可能動能不足而部分崩塌，形成順溝谷而下的高溫密度流——即使在以溢流為主的階段亦可能發生。熔岩流隨供給減少而停滯；表殼增厚並絕熱內部，使舌狀體緩慢就位。若降灰覆蓋坡面後遇雨或融雪，可形成次生泥流。脫氣轉為被動噴氣；通道開始被侵入體與熱液蝕變回填。形變常呈抬升反轉（下沉），直至下一積累期開始。',
    },
  ],
}
