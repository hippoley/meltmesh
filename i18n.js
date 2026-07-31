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
    resetView: 'Reset view',
    scene: 'Scene',
    sphere: 'Sphere',
    box: 'Round Box',
    ground: 'Ground',
    light: 'Key Light',
    dragMove: 'Drag to move',
    wheelZoom: 'Wheel to zoom',
    move: 'Move',
    orbit: 'Orbit',
    perspective: 'Perspective',
    renderFail: 'Unable to start real-time rendering',
    dropTitle: 'Release to import model',
    transform: 'Transform',
    reset: 'Reset',
    scale: 'Scale',
    waitingSdf: 'Waiting for real SDF import',
    contactDebug: 'Contact reveal',
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
    geometry: 'Geometry',
    random: 'Random',
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
    marble: 'Glass marble',
    crystal: 'Crystal',
    smoke: 'Smoked',
    frosted: 'Frosted',
    specular: 'Glass reflection',
    transmission: 'Transmission',
    ior: 'IOR',
    fieldFn: 'Field function',
    customColor: 'Custom color',
    customGlass: 'Custom glass',
    parsed: 'Parsed',
    importedObject: 'Imported object',
  },
  'zh-CN': {
    import: '导入', resetView: '重置视角', scene: '场景', sphere: '球体', box: '圆角盒', ground: '地面', light: '主光源',
    dragMove: '拖动移动', wheelZoom: '滚轮缩放', move: '移动', orbit: '视角', perspective: '透视',
    renderFail: '无法启动实时渲染', dropTitle: '松开以导入模型', transform: '变换', reset: '复位', scale: '缩放',
    waitingSdf: '等待导入真实 SDF', contactDebug: '接触显影', importedMaterial: '导入材质', chooseGlb: '请选择 GLB',
    material: '材质', texture: '纹理', metalness: '金属度', roughness: '粗糙度', domainRouter: '数学域路由',
    implicit: '隐式几何', phase: '相场演化', optical: '折射材质', waitingState: '等待交互状态',
    geometry: '几何参数', random: '随机', blendPreset: '融合', stackPreset: '堆叠', orbitPreset: '环绕',
    blend: '融合强度', solver: '布尔结算器', threshold: '接触阈值', consume: '侵蚀半径', smooth: '布尔平滑',
    noise: '前沿扰动', dissolve: '溶解速率', recovery: '恢复速率', spacing: '形体间距', radius: '球体尺寸',
    boxSize: '圆角尺寸', surface: '表面', marble: '高透弹珠', crystal: '水晶', smoke: '烟熏', frosted: '磨砂',
    specular: '玻璃反射', transmission: '透射率', ior: '折射率 IOR', fieldFn: '场函数',
    customColor: '自定义染色', customGlass: '自定义玻璃', parsed: '已解析', importedObject: '导入物体',
  },
};

const clones = {
  ja: ['インポート','ビューをリセット','シーン','球','角丸ボックス','地面','キーライト','ドラッグで移動','ホイールでズーム','移動','視点','透視','リアルタイムレンダリングを開始できません','離してモデルを読み込み','変換','リセット','スケール','実 SDF の読み込み待ち','接触表示','インポート材質','GLB を選択','材質','テクスチャ','金属度','粗さ','数学ドメインルーター','暗黙幾何','相場進化','屈折材質','相互作用状態待ち','ジオメトリ','ランダム','融合','積層','周回','融合強度','ブールソルバー','接触しきい値','侵食半径','ブール平滑','前線ノイズ','溶解速度','回復速度','物体間隔','球サイズ','角丸サイズ','表面','ガラス玉','クリスタル','スモーク','フロスト','ガラス反射','透過率','IOR','場関数','カスタム色','カスタムガラス','解析済み','インポート物体'],
  ko: ['가져오기','시점 초기화','장면','구','라운드 박스','바닥','주 조명','드래그 이동','휠 줌','이동','시점','원근','실시간 렌더링을 시작할 수 없음','놓아서 모델 가져오기','변환','초기화','스케일','실제 SDF 가져오기 대기','접촉 표시','가져온 재질','GLB 선택','재질','텍스처','금속도','거칠기','수학 도메인 라우터','암시적 기하','위상장 진화','굴절 재질','상호작용 상태 대기','기하','랜덤','융합','스택','궤도','융합 강도','불리언 솔버','접촉 임계값','침식 반경','불리언 평활','전선 노이즈','용해 속도','회복 속도','물체 간격','구 크기','라운드 박스 크기','표면','유리 구슬','크리스털','스모크','프로스트','유리 반사','투과율','IOR','장 함수','사용자 색상','사용자 유리','분석됨','가져온 물체'],
  es: ['Importar','Restablecer vista','Escena','Esfera','Caja redondeada','Suelo','Luz principal','Arrastrar para mover','Rueda para zoom','Mover','Vista','Perspectiva','No se pudo iniciar el render en tiempo real','Suelta para importar modelo','Transformar','Restablecer','Escala','Esperando SDF real','Revelar contacto','Material importado','Selecciona GLB','Materiales','Texturas','Metalicidad','Rugosidad','Router matemático','Geometría implícita','Evolución de fase','Material refractivo','Esperando interacción','Geometría','Aleatorio','Fusionar','Apilar','Orbitar','Fuerza de fusión','Solver booleano','Umbral de contacto','Radio de erosión','Suavizado booleano','Ruido de frente','Velocidad de disolución','Recuperación','Espaciado','Tamaño esfera','Tamaño caja','Superficie','Canica de vidrio','Cristal','Ahumado','Esmerilado','Reflexión vidrio','Transmisión','IOR','Función de campo','Color personalizado','Vidrio personalizado','Analizado','Objeto importado'],
  fr: ['Importer','Réinitialiser la vue','Scène','Sphère','Boîte arrondie','Sol','Lumière principale','Glisser pour déplacer','Molette pour zoomer','Déplacer','Vue','Perspective','Impossible de lancer le rendu temps réel','Relâcher pour importer','Transformation','Réinitialiser','Échelle','En attente de SDF réel','Révéler le contact','Matériau importé','Sélectionner GLB','Matériaux','Textures','Métallicité','Rugosité','Routeur mathématique','Géométrie implicite','Évolution de phase','Matériau réfractif','En attente d’interaction','Géométrie','Aléatoire','Fusion','Empilement','Orbite','Force de fusion','Solveur booléen','Seuil de contact','Rayon d’érosion','Lissage booléen','Bruit du front','Vitesse de dissolution','Récupération','Espacement','Taille sphère','Taille boîte','Surface','Bille de verre','Cristal','Fumé','Dépoli','Réflexion verre','Transmission','IOR','Fonction de champ','Couleur personnalisée','Verre personnalisé','Analysé','Objet importé'],
  de: ['Importieren','Ansicht zurücksetzen','Szene','Kugel','Abgerundete Box','Boden','Hauptlicht','Ziehen zum Bewegen','Mausrad zum Zoomen','Bewegen','Ansicht','Perspektive','Echtzeit-Rendering konnte nicht starten','Loslassen zum Importieren','Transformieren','Zurücksetzen','Skalierung','Warte auf echtes SDF','Kontakt anzeigen','Importiertes Material','GLB wählen','Materialien','Texturen','Metallizität','Rauheit','Mathe-Domain-Router','Implizite Geometrie','Phasenentwicklung','Refraktives Material','Warte auf Interaktion','Geometrie','Zufall','Fusion','Stapel','Orbit','Fusionsstärke','Boolescher Solver','Kontakt-Schwelle','Erosionsradius','Boolesche Glättung','Front-Rauschen','Auflösungsrate','Erholung','Objektabstand','Kugelgröße','Boxgröße','Oberfläche','Glasmurmel','Kristall','Rauchglas','Mattglas','Glasreflexion','Transmission','IOR','Feldfunktion','Eigene Farbe','Eigenes Glas','Analysiert','Importiertes Objekt'],
  'pt-BR': ['Importar','Redefinir vista','Cena','Esfera','Caixa arredondada','Chão','Luz principal','Arraste para mover','Roda para zoom','Mover','Visão','Perspectiva','Não foi possível iniciar render em tempo real','Solte para importar modelo','Transformar','Redefinir','Escala','Aguardando SDF real','Revelar contato','Material importado','Selecionar GLB','Materiais','Texturas','Metalicidade','Rugosidade','Roteador matemático','Geometria implícita','Evolução de fase','Material refrativo','Aguardando interação','Geometria','Aleatório','Fundir','Empilhar','Orbitar','Força de fusão','Solver booleano','Limiar de contato','Raio de erosão','Suavização booleana','Ruído frontal','Taxa de dissolução','Recuperação','Espaçamento','Tamanho esfera','Tamanho caixa','Superfície','Bola de vidro','Cristal','Fumê','Fosco','Reflexão vidro','Transmissão','IOR','Função de campo','Cor personalizada','Vidro personalizado','Analisado','Objeto importado'],
};
const orderedKeys = Object.keys(dictionaries.en);
for (const [lang, values] of Object.entries(clones)) dictionaries[lang] = Object.fromEntries(orderedKeys.map((key, index) => [key, values[index] || dictionaries.en[key]]));

const textBindings = [
  ['.import-button span','import'], ['#resetView','resetView','title'], ['#resetView','resetView','aria-label'],
  ['.scene-panel .panel-heading span:first-child','scene'], ['[data-object="sphere"] strong','sphere'], ['[data-object="box"] strong','box'],
  ['[data-focus="ground"] strong','ground'], ['[data-focus="light"] strong','light'], ['.scene-footer span:first-child','dragMove'], ['.scene-footer span:last-child','wheelZoom'],
  ['[data-mode="move"]','move'], ['[data-mode="orbit"]','orbit'], ['.viewport-label span:first-child','perspective'],
  ['#errorPanel strong','renderFail'], ['#dropHint strong','dropTitle'], ['#selectedName', ['sphere','transform']],
  ['#resetObject','reset'], ['.scale-field span','scale'], ['#fusionLabel','waitingSdf'], ['.debug-toggle span','contactDebug'],
  ['.material-readout header span','importedMaterial'], ['#materialReadoutStatus','chooseGlb'], ['#readoutMaterialCount','material','previous'],
  ['#readoutTextureCount','texture','previous'], ['#readoutMetalness','metalness','previous'], ['#readoutRoughness','roughness','previous'],
  ['.domain-router header span','domainRouter'], ['#domainPrimary','implicit'], ['#domain-implicitGeometry','implicit','previous'],
  ['#domain-phaseField','phase','previous'], ['#domain-optical','optical','previous'], ['#domainSignature','waitingState'],
  ['.panel-heading:nth-of-type(2) span','geometry'], ['#randomize','random'], ['[data-preset="blend"]','blendPreset'], ['[data-preset="stack"]','stackPreset'], ['[data-preset="orbit"]','orbitPreset'],
  ['output[for="blend"]','blend','control'], ['.solver-label span','solver'], ['output[for="contactThreshold"]','threshold','control'],
  ['output[for="consumeScale"]','consume','control'], ['output[for="booleanSmooth"]','smooth','control'], ['output[for="frontNoise"]','noise','control'],
  ['output[for="dissolveRate"]','dissolve','control'], ['output[for="recoveryRate"]','recovery','control'], ['output[for="spacing"]','spacing','control'],
  ['output[for="radius"]','radius','control'], ['output[for="boxSize"]','boxSize','control'], ['.material-heading span:first-child','surface'],
  ['#materialStatus','marble'], ['[data-material="marble"]','marble'], ['[data-material="crystal"]','crystal'], ['[data-material="smoke"]','smoke'], ['[data-material="frosted"]','frosted'],
  ['output[for="roughness"]','roughness','control'], ['output[for="specular"]','specular','control'], ['output[for="transmission"]','transmission','control'], ['output[for="ior"]','ior','control'],
  ['.equation span','fieldFn'],
];

function translate(lang, key) {
  const table = dictionaries[lang] || dictionaries.en;
  return table[key] || dictionaries.en[key] || key;
}

function setPreviousText(selector, value) {
  const target = document.querySelector(selector);
  const label = target?.previousElementSibling;
  if (label) label.textContent = value;
}

function setControlLabel(selector, value) {
  const output = document.querySelector(selector);
  const label = output?.parentElement?.querySelector('b');
  if (label) label.textContent = value;
}

function setText(selector, value, mode) {
  if (Array.isArray(value)) value = value.map(key => translate(currentLanguage, key)).join(' · ');
  if (mode === 'previous') return setPreviousText(selector, value);
  if (mode === 'control') return setControlLabel(selector, value);
  const target = document.querySelector(selector);
  if (!target) return;
  if (mode === 'title' || mode === 'aria-label') target.setAttribute(mode, value);
  else target.textContent = value;
}

function normalizeLanguage(value) {
  if (!value) return 'en';
  const normalized = value.toLowerCase();
  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('pt')) return 'pt-BR';
  return ['en','ja','ko','es','fr','de'].find(lang => normalized.startsWith(lang)) || 'en';
}

let currentLanguage = normalizeLanguage(localStorage.getItem('meltmesh-language') || navigator.language);

function applyLanguage(lang = currentLanguage) {
  currentLanguage = dictionaries[lang] ? lang : 'en';
  localStorage.setItem('meltmesh-language', currentLanguage);
  document.documentElement.lang = currentLanguage;
  for (const [selector, key, mode] of textBindings) setText(selector, key, mode);
  const select = document.getElementById('languageSelect');
  if (select) select.value = currentLanguage;
  window.dispatchEvent(new CustomEvent('meltmesh-language-change', { detail: { language: currentLanguage } }));
}

function installLanguageSelect() {
  const select = document.getElementById('languageSelect');
  if (!select) return;
  select.innerHTML = Object.entries(languageNames).map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
  select.addEventListener('change', event => applyLanguage(event.target.value));
  select.value = currentLanguage;
}

window.meltmeshI18n = { languageNames, dictionaries, translate, applyLanguage, get currentLanguage(){ return currentLanguage; } };
const bootI18n = () => { installLanguageSelect(); applyLanguage(currentLanguage); };
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootI18n, { once: true });
else bootI18n();
