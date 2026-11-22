// The four lands of the book and the order of its spreads. Spread 0 is the map; 1–12 are the playable pages.
export const LANDS = {
  map:      { name: '決策智慧島', en: 'MAP', color: '#e8b84e' },
  prologue: { name: '啟程港', en: 'PROLOGUE', color: '#f0c665', blurb: '兩位領導者在港口送你出發。' },
  people:   { name: '人間市集', en: 'PEOPLE', color: '#cfe25c', blurb: '真實、想買、口碑、記憶：人心裡的事。' },
  model:    { name: '推演沙盤', en: 'MODEL', color: '#f79c88', blurb: '先在沙盤上推演，再由人下判斷。' },
  ai:       { name: '代理城', en: 'AI', color: '#6fd6e0', blurb: 'AI 代理替人辦事的城市。' },
};

// id = file name in js/scenes/. Each file's default export carries the rest (title, sources, ground, build).
export const ORDER = [
  { id: 'map', land: 'map' },
  { id: 's01-loop', land: 'prologue' },      // 第 1 篇 唐心慧 AI for Growth
  { id: 's02-distance', land: 'prologue' },  // 第 2 篇 邵懿文 品牌與人的真實距離
  { id: 's03-real', land: 'people' },        // 第 6、3 篇 真實與信任
  { id: 's04-want', land: 'people' },        // 第 7 篇 想買
  { id: 's05-voice', land: 'people' },       // 第 9、13、19 篇 口碑與 AI 答案
  { id: 's06-memory', land: 'people' },      // 第 8、10、11 篇 共同記憶
  { id: 's07-twins', land: 'model' },        // 第 12 篇 People Model
  { id: 's08-judge', land: 'model' },        // 第 14、5 篇 衡斷力
  { id: 's09-undertow', land: 'model' },     // 第 16 篇 文化暗流
  { id: 's10-pause', land: 'ai' },           // 第 17、18、15 篇 體驗與猶豫
  { id: 's11-spec', land: 'ai' },            // 第 20、21、4 篇 交付力
  { id: 's12-gates', land: 'ai' },           // 第 22 篇 Agent 權限
];

export const SECTION_NAMES = { intro: '前言 Prologue', people: 'People', model: 'Model', ai: 'AI' };
export const SECTION_COLORS = { intro: '#f0c665', people: '#cfe25c', model: '#f79c88', ai: '#6fd6e0' };
/** printed pages that exist in print/ (p.2–3 and p.196–197 carry contact e-mails and are left out) */
export const FIRST_PAGE = 4, LAST_PAGE = 195;
