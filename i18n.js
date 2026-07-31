const languageNames = {
  en: 'English',
  'zh-CN': '简体中文',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  'pt-BR': 'Português',
};

const dictionaries = {
  en: {
    import: 'Import',
    importTitle: 'Import GLB / OBJ / STL',
    resetView: 'Reset view',
    scene: 'Scene',
    sceneObjects: 'Scene objects',
    sphere: 'Sphere',
    box: 'Round Box',
    ground: 'Ground',
    light: 'Key Light',
    dragMove: 'Drag to move',
    wheelZoom: 'Wheel to zoom',
    sdfViewport: 'SDF realtime 3D viewport',
    webgpuViewport: 'WebGPU SDF realtime viewport',
    threeViewport: 'Three.js GLB PBR layer',
    meshViewport: 'Imported mesh render layer',
    mouseMode: 'Mouse interaction mode',
    move: 'Move',
    orbit: 'Orbit',
    perspective: 'Perspective',
    renderFail: 'Unable to start real-time rendering',
    dropTitle: 'Release to import model',
    playPause: 'Play or pause sequence',
    animationFrame: 'Animation frame',
    modelParameters: 'Model parameters',
    transform: 'Transform',
    reset: 'Reset',
    scale: 'Scale',
    waitingSdf: 'Waiting for real SDF import',
    trueSdf: 'Unified SDF + source material field',
    contactDebug: 'Contact reveal',
    materialDiagnostics: 'Imported material diagnostics',
    importedMaterial: 'Imported material',
    chooseGlb: 'Select GLB',
    material: 'Materials',
    texture: 'Textures',
    metalness: 'Metalness',
    roughness: 'Roughness',
    domainRouter: 'Math domain router',
    implicit: 'Implicit geometry',
    phase: 'Phase evolution',
    optical: 'Refractive material',
    waitingState: 'Waiting for interaction state',
    domainSignatureLive: 'Proximity {proximity} · Penetration {penetration} · Speed {speed}',
    geometry: 'Geometry',
    random: 'Random',
    shapePresets: 'Shape presets',
    blendPreset: 'Fuse',
    stackPreset: 'Stack',
    orbitPreset: 'Orbit',
    blend: 'Fusion strength',
    solver: 'Boolean solver',
    threshold: 'Contact threshold',
    consume: 'Erosion radius',
    smooth: 'Boolean smoothing',
    noise: 'Front noise',
    dissolve: 'Dissolve rate',
    recovery: 'Recovery rate',
    spacing: 'Object spacing',
    radius: 'Sphere size',
    boxSize: 'Round-box size',
    surface: 'Surface',
    materialPresets: 'Glass material presets',
    marble: 'Glass marble',
    crystal: 'Crystal',
    smoke: 'Smoked',
    frosted: 'Frosted',
    surfaceColors: 'Surface colors',
    iceBlue: 'Ice blue glass',
    electricBlue: 'Electric blue',
    limeGreen: 'Lime green',
    orangeSoda: 'Orange soda',
    lemonYellow: 'Lemon yellow',
    specular: 'Glass reflection',
    transmission: 'Transmission',
    ior: 'IOR',
    fieldFn: 'Field function',
    customColor: 'Custom color',
    customGlass: 'Custom glass',
    parsed: 'Parsed',
    importedObject: 'Imported object',
    frame: 'frame',
    frames: 'frames',
    webglRealtime: 'WebGL2 realtime',
    webgpuRealtime: 'WebGPU realtime',
    webgpuFirstReady: 'WebGPU first-frame ready',
    webglFallback: 'WebGL2 fallback',
    noWebgpuAdapter: 'No WebGPU adapter',
    webgpuDeviceLost: 'WebGPU device lost',
    webgpuError: 'WebGPU',
    threeUnified: 'Three.js unified depth SDF',
    threeInitFailed: 'Three.js initialization failed',
    renderUnavailable: 'Renderer unavailable',
    webgl2Unavailable: 'WebGL2 is not enabled in this browser or GPU. Enable hardware acceleration and try again.',
    emptyMesh: 'One file does not contain usable triangles.',
    importFailed: 'Import failed',
    glbImportFailed: 'GLB import failed',
    unsupportedServer: 'This server only imports GLB / OBJ / STL for now.',
    chooseMeshFormat: 'Please choose GLB / OBJ / STL files.',
    maxGlb: 'Import up to five models.',
    reachedLimit: 'Reached the five-model limit.',
    parsingFrames: 'Parsing {count} frame(s)...',
    importedFrames: 'Imported {name}: {count} frame(s)',
    convertedGlb: 'Converted GLB loaded',
    blenderConverting: 'Converting Blender file...',
    trueSdfEnabled: 'True SDF + source material field enabled',
    trueSdfFeature: 'True SDF + baked material field',
    trueSdfMaterial: 'True SDF + source material fusion',
    metalFallback: 'Metal material fallback applied',
    threeParsed: 'Three.js parsed {count} material(s)',
    threeLoadFailed: 'Three.js material parsing failed',
    contactDebugOn: 'Contact reveal enabled',
    contactDebugOff: 'Contact reveal disabled',
    materialImported: 'Imported',
    materialMissing: 'Material not imported',
    meshCache: 'mesh cache',
    sourceMaterialFields: 'source material fields',
    realSdfSources: 'real SDF sources',
  },
  'zh-CN': {
    import: '导入',
    importTitle: '导入 GLB / OBJ / STL',
    resetView: '重置视角',
    scene: '场景',
    sceneObjects: '场景对象',
    sphere: '球体',
    box: '圆角盒',
    ground: '地面',
    light: '主光源',
    dragMove: '拖动移动',
    wheelZoom: '滚轮缩放',
    sdfViewport: 'SDF 实时三维视口',
    webgpuViewport: 'WebGPU SDF 实时视口',
    threeViewport: 'Three.js GLB PBR 图层',
    meshViewport: '导入网格渲染图层',
    mouseMode: '鼠标交互模式',
    move: '移动',
    orbit: '视角',
    perspective: '透视',
    renderFail: '无法启动实时渲染',
    dropTitle: '松开以导入模型',
    playPause: '播放或暂停序列',
    animationFrame: '动画帧',
    modelParameters: '模型参数',
    transform: '变换',
    reset: '复位',
    scale: '缩放',
    waitingSdf: '等待导入真实 SDF',
    trueSdf: '统一 SDF + 源材质场',
    contactDebug: '接触显影',
    materialDiagnostics: '导入材质诊断',
    importedMaterial: '导入材质',
    chooseGlb: '选择 GLB',
    material: '材质',
    texture: '纹理',
    metalness: '金属度',
    roughness: '粗糙度',
    domainRouter: '数学域路由',
    implicit: '隐式几何',
    phase: '相场演化',
    optical: '折射材质',
    waitingState: '等待交互状态',
    domainSignatureLive: '接近 {proximity} · 穿透 {penetration} · 速度 {speed}',
    geometry: '几何',
    random: '随机',
    shapePresets: '形状预设',
    blendPreset: '融合',
    stackPreset: '堆叠',
    orbitPreset: '环绕',
    blend: '融合强度',
    solver: '布尔结算器',
    threshold: '接触阈值',
    consume: '侵蚀半径',
    smooth: '布尔平滑',
    noise: '前沿扰动',
    dissolve: '溶解速率',
    recovery: '恢复速率',
    spacing: '物体间距',
    radius: '球体尺寸',
    boxSize: '圆角尺寸',
    surface: '表面',
    materialPresets: '玻璃材质预设',
    marble: '玻璃弹珠',
    crystal: '水晶',
    smoke: '烟熏',
    frosted: '磨砂',
    surfaceColors: '表面颜色',
    iceBlue: '冰蓝玻璃',
    electricBlue: '电光蓝',
    limeGreen: '荧光绿',
    orangeSoda: '橙汽水',
    lemonYellow: '柠檬黄',
    specular: '玻璃反射',
    transmission: '透射',
    ior: '折射率',
    fieldFn: '场函数',
    customColor: '自定义颜色',
    customGlass: '自定义玻璃',
    parsed: '已解析',
    importedObject: '导入物体',
    frame: '帧',
    frames: '帧',
    webglRealtime: 'WebGL2 实时',
    webgpuRealtime: 'WebGPU 实时',
    webgpuFirstReady: 'WebGPU 首帧就绪',
    webglFallback: 'WebGL2 回退',
    noWebgpuAdapter: '无 WebGPU 适配器',
    webgpuDeviceLost: 'WebGPU 设备已丢失',
    webgpuError: 'WebGPU',
    threeUnified: 'Three.js 统一深度 SDF',
    threeInitFailed: 'Three.js 初始化失败',
    renderUnavailable: '渲染器不可用',
    webgl2Unavailable: '当前浏览器或显卡未启用 WebGL2。请开启硬件加速后重试。',
    emptyMesh: '某个文件中没有可用的三角形。',
    importFailed: '导入失败',
    glbImportFailed: 'GLB 导入失败',
    unsupportedServer: '当前服务暂时只支持 GLB / OBJ / STL。',
    chooseMeshFormat: '请选择 GLB / OBJ / STL 文件。',
    maxGlb: '最多导入五个模型。',
    reachedLimit: '已经达到五个模型上限。',
    parsingFrames: '正在解析 {count} 帧……',
    importedFrames: '已导入 {name}：{count} 帧',
    convertedGlb: '已加载转换后的 GLB',
    blenderConverting: '正在转换 Blender 文件……',
    trueSdfEnabled: '真实 SDF + 源材质场已开启',
    trueSdfFeature: '真实 SDF + 烘焙材质场',
    trueSdfMaterial: '真实 SDF + 原始材质融合',
    metalFallback: '已应用金属材质回退',
    threeParsed: 'Three.js 已解析 {count} 个材质',
    threeLoadFailed: 'Three.js 材质解析失败',
    contactDebugOn: '接触显影已开启',
    contactDebugOff: '接触显影已关闭',
    materialImported: '已导入',
    materialMissing: '材质未导入',
    meshCache: '网格缓存',
    sourceMaterialFields: '源材质场',
    realSdfSources: '真实 SDF 源',
  },
};

const languagePacks = {
  ja: {
    import: 'インポート', importTitle: 'GLB / OBJ / STL をインポート', resetView: 'ビューをリセット', scene: 'シーン', sceneObjects: 'シーンオブジェクト',
    sphere: '球体', box: '角丸ボックス', ground: '床', light: 'キーライト', dragMove: 'ドラッグで移動', wheelZoom: 'ホイールでズーム',
    move: '移動', orbit: '視点', perspective: '透視', renderFail: 'リアルタイムレンダリングを開始できません', dropTitle: '離してモデルをインポート',
    transform: '変換', reset: 'リセット', scale: 'スケール', waitingSdf: '実 SDF のインポート待ち', trueSdf: '統合 SDF + ソース材質場',
    contactDebug: '接触表示', importedMaterial: 'インポート材質', chooseGlb: 'GLB を選択', material: '材質', texture: 'テクスチャ',
    metalness: '金属度', roughness: '粗さ', domainRouter: '数学ドメインルーター', implicit: '陰関数幾何', phase: '相場発展',
    optical: '屈折材質', waitingState: '相互作用待ち', geometry: 'ジオメトリ', random: 'ランダム', blendPreset: '融合',
    domainSignatureLive: '近接 {proximity} · 貫通 {penetration} · 速度 {speed}',
    stackPreset: '積層', orbitPreset: '周回', blend: '融合強度', solver: 'ブールソルバー', threshold: '接触しきい値',
    consume: '浸食半径', smooth: 'ブール平滑化', noise: '前線ノイズ', dissolve: '溶解速度', recovery: '回復速度',
    spacing: '物体間隔', radius: '球体サイズ', boxSize: '角丸サイズ', surface: '表面', marble: 'ガラス玉',
    crystal: 'クリスタル', smoke: 'スモーク', frosted: 'フロスト', specular: 'ガラス反射', transmission: '透過', ior: '屈折率',
    fieldFn: '場の関数', customColor: 'カスタム色', customGlass: 'カスタムガラス', parsed: '解析済み', importedObject: 'インポート物体',
  },
  ko: {
    import: '가져오기', importTitle: 'GLB / OBJ / STL 가져오기', resetView: '뷰 재설정', scene: '장면', sceneObjects: '장면 객체',
    sphere: '구체', box: '라운드 박스', ground: '바닥', light: '주 조명', dragMove: '드래그로 이동', wheelZoom: '휠로 확대',
    move: '이동', orbit: '시점', perspective: '원근', renderFail: '실시간 렌더링을 시작할 수 없습니다', dropTitle: '놓으면 모델 가져오기',
    transform: '변환', reset: '초기화', scale: '스케일', waitingSdf: '실제 SDF 가져오기 대기', trueSdf: '통합 SDF + 원본 재질장',
    contactDebug: '접촉 표시', importedMaterial: '가져온 재질', chooseGlb: 'GLB 선택', material: '재질', texture: '텍스처',
    metalness: '금속도', roughness: '거칠기', domainRouter: '수학 도메인 라우터', implicit: '암시적 기하', phase: '상장 진화',
    optical: '굴절 재질', waitingState: '상호작용 대기', geometry: '기하', random: '랜덤', blendPreset: '융합',
    domainSignatureLive: '근접 {proximity} · 관통 {penetration} · 속도 {speed}',
    stackPreset: '쌓기', orbitPreset: '궤도', blend: '융합 강도', solver: '불리언 솔버', threshold: '접촉 임계값',
    consume: '침식 반경', smooth: '불리언 평활화', noise: '전선 노이즈', dissolve: '용해 속도', recovery: '회복 속도',
    spacing: '객체 간격', radius: '구체 크기', boxSize: '라운드 박스 크기', surface: '표면', marble: '유리 구슬',
    crystal: '크리스털', smoke: '스모크', frosted: '프로스트', specular: '유리 반사', transmission: '투과', ior: '굴절률',
    fieldFn: '장 함수', customColor: '사용자 색상', customGlass: '사용자 유리', parsed: '해석 완료', importedObject: '가져온 객체',
  },
  es: {
    import: 'Importar', importTitle: 'Importar GLB / OBJ / STL', resetView: 'Restablecer vista', scene: 'Escena', sceneObjects: 'Objetos de escena',
    sphere: 'Esfera', box: 'Caja redondeada', ground: 'Suelo', light: 'Luz principal', dragMove: 'Arrastrar para mover', wheelZoom: 'Rueda para zoom',
    move: 'Mover', orbit: 'Órbita', perspective: 'Perspectiva', renderFail: 'No se pudo iniciar el render en tiempo real', dropTitle: 'Suelta para importar el modelo',
    transform: 'Transformar', reset: 'Restablecer', scale: 'Escala', waitingSdf: 'Esperando SDF real', trueSdf: 'SDF unificado + campo de material fuente',
    contactDebug: 'Revelar contacto', importedMaterial: 'Material importado', chooseGlb: 'Seleccionar GLB', material: 'Materiales', texture: 'Texturas',
    metalness: 'Metalicidad', roughness: 'Rugosidad', domainRouter: 'Enrutador matemático', implicit: 'Geometría implícita', phase: 'Evolución de fase',
    optical: 'Material refractivo', waitingState: 'Esperando interacción', geometry: 'Geometría', random: 'Aleatorio', blendPreset: 'Fusionar',
    domainSignatureLive: 'Proximidad {proximity} · Penetración {penetration} · Velocidad {speed}',
    stackPreset: 'Apilar', orbitPreset: 'Orbitar', blend: 'Fuerza de fusión', solver: 'Solucionador booleano', threshold: 'Umbral de contacto',
    consume: 'Radio de erosión', smooth: 'Suavizado booleano', noise: 'Ruido frontal', dissolve: 'Velocidad de disolución', recovery: 'Recuperación',
    spacing: 'Espaciado', radius: 'Tamaño de esfera', boxSize: 'Tamaño de caja', surface: 'Superficie', marble: 'Canica de vidrio',
    crystal: 'Cristal', smoke: 'Ahumado', frosted: 'Esmerilado', specular: 'Reflexión de vidrio', transmission: 'Transmisión', ior: 'IOR',
    fieldFn: 'Función de campo', customColor: 'Color personalizado', customGlass: 'Vidrio personalizado', parsed: 'Analizado', importedObject: 'Objeto importado',
  },
  fr: {
    import: 'Importer', importTitle: 'Importer GLB / OBJ / STL', resetView: 'Réinitialiser la vue', scene: 'Scène', sceneObjects: 'Objets de scène',
    sphere: 'Sphère', box: 'Boîte arrondie', ground: 'Sol', light: 'Lumière principale', dragMove: 'Glisser pour déplacer', wheelZoom: 'Molette pour zoomer',
    move: 'Déplacer', orbit: 'Orbite', perspective: 'Perspective', renderFail: 'Impossible de lancer le rendu temps réel', dropTitle: 'Relâcher pour importer le modèle',
    transform: 'Transformation', reset: 'Réinitialiser', scale: 'Échelle', waitingSdf: 'En attente du SDF réel', trueSdf: 'SDF unifié + champ de matériau source',
    contactDebug: 'Révéler le contact', importedMaterial: 'Matériau importé', chooseGlb: 'Sélectionner GLB', material: 'Matériaux', texture: 'Textures',
    metalness: 'Métallicité', roughness: 'Rugosité', domainRouter: 'Routeur mathématique', implicit: 'Géométrie implicite', phase: 'Évolution de phase',
    optical: 'Matériau réfractif', waitingState: 'En attente d’interaction', geometry: 'Géométrie', random: 'Aléatoire', blendPreset: 'Fusion',
    domainSignatureLive: 'Proximité {proximity} · Pénétration {penetration} · Vitesse {speed}',
    stackPreset: 'Empiler', orbitPreset: 'Orbite', blend: 'Force de fusion', solver: 'Solveur booléen', threshold: 'Seuil de contact',
    consume: 'Rayon d’érosion', smooth: 'Lissage booléen', noise: 'Bruit de front', dissolve: 'Vitesse de dissolution', recovery: 'Récupération',
    spacing: 'Espacement', radius: 'Taille sphère', boxSize: 'Taille boîte', surface: 'Surface', marble: 'Bille de verre',
    crystal: 'Cristal', smoke: 'Fumé', frosted: 'Dépoli', specular: 'Réflexion du verre', transmission: 'Transmission', ior: 'IOR',
    fieldFn: 'Fonction de champ', customColor: 'Couleur personnalisée', customGlass: 'Verre personnalisé', parsed: 'Analysé', importedObject: 'Objet importé',
  },
  de: {
    import: 'Importieren', importTitle: 'GLB / OBJ / STL importieren', resetView: 'Ansicht zurücksetzen', scene: 'Szene', sceneObjects: 'Szenenobjekte',
    sphere: 'Kugel', box: 'Abgerundete Box', ground: 'Boden', light: 'Hauptlicht', dragMove: 'Ziehen zum Bewegen', wheelZoom: 'Mausrad zum Zoomen',
    move: 'Bewegen', orbit: 'Orbit', perspective: 'Perspektive', renderFail: 'Echtzeit-Rendering konnte nicht starten', dropTitle: 'Loslassen, um Modell zu importieren',
    transform: 'Transformieren', reset: 'Zurücksetzen', scale: 'Skalierung', waitingSdf: 'Warte auf echtes SDF', trueSdf: 'Einheitliches SDF + Quellmaterialfeld',
    contactDebug: 'Kontakt anzeigen', importedMaterial: 'Importiertes Material', chooseGlb: 'GLB wählen', material: 'Materialien', texture: 'Texturen',
    metalness: 'Metallizität', roughness: 'Rauheit', domainRouter: 'Mathematischer Router', implicit: 'Implizite Geometrie', phase: 'Phasenentwicklung',
    optical: 'Refraktives Material', waitingState: 'Warte auf Interaktion', geometry: 'Geometrie', random: 'Zufall', blendPreset: 'Fusion',
    domainSignatureLive: 'Nähe {proximity} · Durchdringung {penetration} · Geschwindigkeit {speed}',
    stackPreset: 'Stapel', orbitPreset: 'Orbit', blend: 'Fusionsstärke', solver: 'Boolescher Solver', threshold: 'Kontakt-Schwelle',
    consume: 'Erosionsradius', smooth: 'Boolesche Glättung', noise: 'Front-Rauschen', dissolve: 'Auflösungsrate', recovery: 'Erholung',
    spacing: 'Objektabstand', radius: 'Kugelgröße', boxSize: 'Boxgröße', surface: 'Oberfläche', marble: 'Glasmurmel',
    crystal: 'Kristall', smoke: 'Rauchglas', frosted: 'Mattglas', specular: 'Glasreflexion', transmission: 'Transmission', ior: 'IOR',
    fieldFn: 'Feldfunktion', customColor: 'Eigene Farbe', customGlass: 'Eigenes Glas', parsed: 'Analysiert', importedObject: 'Importiertes Objekt',
  },
  'pt-BR': {
    import: 'Importar', importTitle: 'Importar GLB / OBJ / STL', resetView: 'Redefinir vista', scene: 'Cena', sceneObjects: 'Objetos da cena',
    sphere: 'Esfera', box: 'Caixa arredondada', ground: 'Chão', light: 'Luz principal', dragMove: 'Arraste para mover', wheelZoom: 'Roda para zoom',
    move: 'Mover', orbit: 'Órbita', perspective: 'Perspectiva', renderFail: 'Não foi possível iniciar o render em tempo real', dropTitle: 'Solte para importar o modelo',
    transform: 'Transformar', reset: 'Redefinir', scale: 'Escala', waitingSdf: 'Aguardando SDF real', trueSdf: 'SDF unificado + campo de material fonte',
    contactDebug: 'Revelar contato', importedMaterial: 'Material importado', chooseGlb: 'Selecionar GLB', material: 'Materiais', texture: 'Texturas',
    metalness: 'Metalicidade', roughness: 'Rugosidade', domainRouter: 'Roteador matemático', implicit: 'Geometria implícita', phase: 'Evolução de fase',
    optical: 'Material refrativo', waitingState: 'Aguardando interação', geometry: 'Geometria', random: 'Aleatório', blendPreset: 'Fundir',
    domainSignatureLive: 'Proximidade {proximity} · Penetração {penetration} · Velocidade {speed}',
    stackPreset: 'Empilhar', orbitPreset: 'Orbitar', blend: 'Força de fusão', solver: 'Solver booleano', threshold: 'Limiar de contato',
    consume: 'Raio de erosão', smooth: 'Suavização booleana', noise: 'Ruído frontal', dissolve: 'Taxa de dissolução', recovery: 'Recuperação',
    spacing: 'Espaçamento', radius: 'Tamanho da esfera', boxSize: 'Tamanho da caixa', surface: 'Superfície', marble: 'Bola de vidro',
    crystal: 'Cristal', smoke: 'Fumê', frosted: 'Fosco', specular: 'Reflexão do vidro', transmission: 'Transmissão', ior: 'IOR',
    fieldFn: 'Função de campo', customColor: 'Cor personalizada', customGlass: 'Vidro personalizado', parsed: 'Analisado', importedObject: 'Objeto importado',
  },
};

for (const [lang, pack] of Object.entries(languagePacks)) {
  dictionaries[lang] = { ...dictionaries.en, ...pack };
}

const accessibilityPacks = {
  ja: {
    animationFrame: 'アニメーションフレーム', iceBlue: 'アイスブルーガラス', electricBlue: 'エレクトリックブルー', limeGreen: 'ライムグリーン',
    orangeSoda: 'オレンジソーダ', lemonYellow: 'レモンイエロー', materialDiagnostics: 'インポート材質の診断', materialPresets: 'ガラス材質プリセット',
    meshViewport: 'インポートメッシュ描画レイヤー', modelParameters: 'モデルパラメータ', mouseMode: 'マウス操作モード', playPause: 'シーケンスの再生/一時停止',
    sdfViewport: 'SDF リアルタイム 3D ビューポート', shapePresets: '形状プリセット', surfaceColors: '表面カラー', threeViewport: 'Three.js GLB PBR レイヤー',
    webgpuViewport: 'WebGPU SDF リアルタイムビューポート',
  },
  ko: {
    animationFrame: '애니메이션 프레임', iceBlue: '아이스 블루 유리', electricBlue: '일렉트릭 블루', limeGreen: '라임 그린',
    orangeSoda: '오렌지 소다', lemonYellow: '레몬 옐로', materialDiagnostics: '가져온 재질 진단', materialPresets: '유리 재질 프리셋',
    meshViewport: '가져온 메시 렌더 레이어', modelParameters: '모델 매개변수', mouseMode: '마우스 상호작용 모드', playPause: '시퀀스 재생/일시정지',
    sdfViewport: 'SDF 실시간 3D 뷰포트', shapePresets: '형상 프리셋', surfaceColors: '표면 색상', threeViewport: 'Three.js GLB PBR 레이어',
    webgpuViewport: 'WebGPU SDF 실시간 뷰포트',
  },
  es: {
    animationFrame: 'Fotograma de animación', iceBlue: 'Vidrio azul hielo', electricBlue: 'Azul eléctrico', limeGreen: 'Verde lima',
    orangeSoda: 'Naranja soda', lemonYellow: 'Amarillo limón', materialDiagnostics: 'Diagnóstico de material importado', materialPresets: 'Preajustes de vidrio',
    meshViewport: 'Capa de render de malla importada', modelParameters: 'Parámetros del modelo', mouseMode: 'Modo de interacción del ratón', playPause: 'Reproducir o pausar secuencia',
    sdfViewport: 'Vista 3D SDF en tiempo real', shapePresets: 'Preajustes de forma', surfaceColors: 'Colores de superficie', threeViewport: 'Capa PBR GLB de Three.js',
    webgpuViewport: 'Vista SDF WebGPU en tiempo real',
  },
  fr: {
    animationFrame: 'Image d’animation', iceBlue: 'Verre bleu glace', electricBlue: 'Bleu électrique', limeGreen: 'Vert citron',
    orangeSoda: 'Orange soda', lemonYellow: 'Jaune citron', materialDiagnostics: 'Diagnostic du matériau importé', materialPresets: 'Préréglages de verre',
    meshViewport: 'Calque de rendu du maillage importé', modelParameters: 'Paramètres du modèle', mouseMode: 'Mode d’interaction souris', playPause: 'Lire ou mettre en pause la séquence',
    sdfViewport: 'Vue 3D SDF temps réel', shapePresets: 'Préréglages de forme', surfaceColors: 'Couleurs de surface', threeViewport: 'Calque GLB PBR Three.js',
    webgpuViewport: 'Vue SDF WebGPU temps réel',
  },
  de: {
    animationFrame: 'Animationsframe', iceBlue: 'Eisblaues Glas', electricBlue: 'Elektrisches Blau', limeGreen: 'Limettengrün',
    orangeSoda: 'Orange Soda', lemonYellow: 'Zitronengelb', materialDiagnostics: 'Diagnose des importierten Materials', materialPresets: 'Glasmaterial-Vorgaben',
    meshViewport: 'Render-Ebene für importiertes Mesh', modelParameters: 'Modellparameter', mouseMode: 'Maus-Interaktionsmodus', playPause: 'Sequenz abspielen oder pausieren',
    sdfViewport: 'SDF Echtzeit-3D-Viewport', shapePresets: 'Formvorgaben', surfaceColors: 'Oberflächenfarben', threeViewport: 'Three.js GLB-PBR-Ebene',
    webgpuViewport: 'WebGPU SDF Echtzeit-Viewport',
  },
  'pt-BR': {
    animationFrame: 'Quadro de animação', iceBlue: 'Vidro azul gelo', electricBlue: 'Azul elétrico', limeGreen: 'Verde limão',
    orangeSoda: 'Laranja soda', lemonYellow: 'Amarelo limão', materialDiagnostics: 'Diagnóstico do material importado', materialPresets: 'Predefinições de vidro',
    meshViewport: 'Camada de render da malha importada', modelParameters: 'Parâmetros do modelo', mouseMode: 'Modo de interação do mouse', playPause: 'Reproduzir ou pausar sequência',
    sdfViewport: 'Viewport 3D SDF em tempo real', shapePresets: 'Predefinições de forma', surfaceColors: 'Cores de superfície', threeViewport: 'Camada GLB PBR do Three.js',
    webgpuViewport: 'Viewport SDF WebGPU em tempo real',
  },
};

for (const [lang, pack] of Object.entries(accessibilityPacks)) {
  dictionaries[lang] = { ...dictionaries[lang], ...pack };
}

function normalizeLanguage(value) {
  if (!value) return 'en';
  const normalized = value.toLowerCase();
  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('pt')) return 'pt-BR';
  return ['en', 'ja', 'ko', 'es', 'fr', 'de'].find(lang => normalized.startsWith(lang)) || 'en';
}

let currentLanguage = normalizeLanguage(localStorage.getItem('meltmesh-language') || navigator.language);
let isApplying = false;

function translate(lang, key, params = {}) {
  const table = dictionaries[lang] || dictionaries.en;
  let value = table[key] || dictionaries.en[key] || key;
  for (const [name, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${name}}`, replacement);
  }
  return value;
}

function applyStaticBindings() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = translate(currentLanguage, element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    element.setAttribute('title', translate(currentLanguage, element.dataset.i18nTitle));
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    element.setAttribute('aria-label', translate(currentLanguage, element.dataset.i18nAriaLabel));
  });
}

function applyLanguage(lang = currentLanguage) {
  if (isApplying) return;
  isApplying = true;
  currentLanguage = dictionaries[lang] ? lang : 'en';
  localStorage.setItem('meltmesh-language', currentLanguage);
  document.documentElement.lang = currentLanguage;
  applyStaticBindings();
  const select = document.getElementById('languageSelect');
  if (select) select.value = currentLanguage;
  isApplying = false;
  window.dispatchEvent(new CustomEvent('meltmesh-language-change', { detail: { language: currentLanguage } }));
}

function installLanguageSelect() {
  const select = document.getElementById('languageSelect');
  if (!select) return;
  select.innerHTML = Object.entries(languageNames)
    .map(([code, name]) => `<option value="${code}">${name}</option>`)
    .join('');
  select.addEventListener('change', event => applyLanguage(event.target.value));
  select.value = currentLanguage;
}

window.meltmeshI18n = {
  languageNames,
  dictionaries,
  translate,
  applyLanguage,
  get currentLanguage() {
    return currentLanguage;
  },
};

const bootI18n = () => {
  installLanguageSelect();
  applyLanguage(currentLanguage);
};

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootI18n, { once: true });
else bootI18n();
