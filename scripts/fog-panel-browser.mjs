// Regression UI: запустить pnpm dev --host 127.0.0.1 --port 5182 и отдельный
// Chrome с --remote-debugging-port=9332 --user-data-dir=/tmp/simplewar-fog-chrome.
// Затем: node scripts/fog-panel-browser.mjs. Сцену готовим через store,
// клетку выбираем настоящим кликом. Проверяется Chrome 1280×720, DPR 1.
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const targets = await (await fetch('http://127.0.0.1:9332/json')).json();
const ws = new WebSocket(
  targets.find(t => t.type === 'page').webSocketDebuggerUrl,
);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.reject(m.error);
    else p.resolve(m.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
await send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: 'http://127.0.0.1:5182' });
for (let n = 0; n < 100; n++) {
  if (await evaluate('!!document.querySelector("button")')) break;
  await new Promise(r => setTimeout(r, 50));
}
await evaluate(`(async () => {
 const modules = await Promise.all(['entities/maps', 'entities/units', 'entities/buildings', 'entities/games', 'entities/settings', 'features/visibility', 'features/game-loop', 'features/selection'].map(p => import('/src/' + p + '/index.ts')));
 const [m,u,b,g,s,v,l,selection] = modules;
 window.fogTest = { m,u,b,g,s,v,l,selection };
 l.resetGame(); s.useSettingsStore.setState({ gridColumns: 12, gridRows: 8 });
 const grid = Array.from({length:8},(_,y)=>Array.from({length:12},(_,x)=>({x,y,type:x===6&&y===2?'forest':'grass',isWalkable:!(x===6&&y===2)})));
 m.useMapStore.setState({grid});
 g.useGameLoopStore.setState({phase:'inProgress',activePlayer:'p1',currentTurn:1,participants:[{id:'p1',controller:'human'},{id:'p2',controller:'human'}]});
 v.initVisibilitySystem();
 const scout = u.useUnitsStore.getState().spawnUnit('worker',4,2,'p1',true);
 window.fogTest.scout=scout;
 u.useUnitsStore.getState().placeUnit(scout,0,0);
})()`);
await evaluate(
  'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
);
const point = await evaluate(
  `(() => { const {camera,cellSize}=fogTest.s.useSettingsStore.getState(); const c=[...document.querySelectorAll('canvas')].find(c=>c.className.includes('Highlight')); const r=c.getBoundingClientRect(); return {x:r.left+(6.5-camera.x)*cellSize,y:r.top+(2.5-camera.y)*cellSize}; })()`,
);
for (const type of ['mousePressed', 'mouseReleased'])
  await send('Input.dispatchMouseEvent', {
    type,
    ...point,
    button: 'left',
    clickCount: 1,
  });
await evaluate('new Promise(r => requestAnimationFrame(r))');
const before = await evaluate(
  'document.querySelector("[aria-label=\'Панель партии\']").innerText',
);
assert(before.includes('Непроходима'), before);
await evaluate(
  `fogTest.m.useMapStore.getState().setCell(6,2,{type:'grass',isWalkable:true})`,
);
await evaluate(
  'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
);
const hidden = await evaluate(
  'document.querySelector("[aria-label=\'Панель партии\']").innerText',
);
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(
  '/tmp/simplewar-fog-panel.png',
  Buffer.from(screenshot.data, 'base64'),
);
console.log(
  JSON.stringify({ before, hidden, same: before === hidden }, null, 2),
);
assert.equal(hidden, before, 'Скрытая расчистка изменила панель');
await evaluate(
  'fogTest.u.useUnitsStore.getState().placeUnit(fogTest.scout,4,2)',
);
await evaluate(
  'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
);
const revealed = await evaluate(
  'document.querySelector("[aria-label=\'Панель партии\']").innerText',
);
assert(revealed.includes('Проходима, ход 1'), revealed);
assert(!revealed.includes('Непроходима'), revealed);
console.log(JSON.stringify({ revealed, result: 'passed' }));
await evaluate(`(async () => {
  const { m, b, scout } = fogTest;
  m.useMapStore.getState().setCell(3,2,{type:'gold',isWalkable:false});
  const mine = b.useBuildingsStore.getState().spawnBuilding('mine',3,2,'p1');
  fogTest.mine = mine;
  const { assignWorker } = await import('/src/features/workers/index.ts');
  if (!assignWorker({actor:'p1',workerId:scout,buildingId:mine}).ok) throw new Error('assign failed');
})()`);
await evaluate(
  'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
);
const minePoint = await evaluate(
  `(() => { const {camera,cellSize}=fogTest.s.useSettingsStore.getState(); const c=[...document.querySelectorAll('canvas')].find(c=>c.className.includes('Highlight')); const r=c.getBoundingClientRect(); return {x:r.left+(3.5-camera.x)*cellSize,y:r.top+(2.5-camera.y)*cellSize}; })()`,
);
for (const type of ['mousePressed', 'mouseReleased'])
  await send('Input.dispatchMouseEvent', {
    type,
    ...minePoint,
    button: 'left',
    clickCount: 1,
  });
await evaluate('new Promise(r => requestAnimationFrame(r))');
const pickPoint = await evaluate(
  `(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Выбрать рабочего')); if (!b) throw new Error('pick button missing'); b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`,
);
for (const type of ['mousePressed', 'mouseReleased'])
  await send('Input.dispatchMouseEvent', {
    type,
    ...pickPoint,
    button: 'left',
    clickCount: 1,
  });
await evaluate(
  'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
);
const picked = await evaluate(
  `({ selection: fogTest.selection.useSelectionStore.getState().selection, worker: fogTest.scout, panel: document.querySelector("[aria-label='Панель партии']").innerText })`,
);
console.log(
  JSON.stringify({
    selectedWorker: picked.selection,
    hasWorkPanel: picked.panel.includes('Добывает:'),
  }),
);
assert.deepEqual(picked.selection, { kind: 'unit', id: picked.worker });
assert(picked.panel.includes('Добывает:'), picked.panel);

// Выбранному укрытому рабочему можно отдать обычный приказ выхода движением.
const exitPoint = await evaluate(
  `(() => { const {camera,cellSize}=fogTest.s.useSettingsStore.getState(); const c=[...document.querySelectorAll('canvas')].find(c=>c.className.includes('Highlight')); const r=c.getBoundingClientRect(); return {x:r.left+(4.5-camera.x)*cellSize,y:r.top+(2.5-camera.y)*cellSize}; })()`,
);
for (const type of ['mousePressed', 'mouseReleased'])
  await send('Input.dispatchMouseEvent', {
    type,
    ...exitPoint,
    button: 'left',
    clickCount: 1,
  });
await evaluate(
  'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
);
const exited = await evaluate(
  `(() => {const u=fogTest.u.useUnitsStore.getState().units[fogTest.scout];return {x:u.x,y:u.y,workplaceId:u.workplaceId,movePoints:u.movePoints};})()`,
);
assert.deepEqual(exited, { x: 4, y: 2, workplaceId: null, movePoints: 3 });
console.log('Sheltered worker moved out: passed');

// Тот же механизм обязан снимать выбор врага после его ухода в туман.
await evaluate(
  'fogTest.selection.useSelectionStore.getState().clearSelection()',
);
await evaluate(
  `fogTest.enemy=fogTest.u.useUnitsStore.getState().spawnUnit('worker',5,2,'p2')`,
);
await evaluate(
  'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
);
const enemyPoint = await evaluate(
  `(() => { const {camera,cellSize}=fogTest.s.useSettingsStore.getState(); const c=[...document.querySelectorAll('canvas')].find(c=>c.className.includes('Highlight')); const r=c.getBoundingClientRect(); return {x:r.left+(5.5-camera.x)*cellSize,y:r.top+(2.5-camera.y)*cellSize}; })()`,
);
for (const type of ['mousePressed', 'mouseReleased'])
  await send('Input.dispatchMouseEvent', {
    type,
    ...enemyPoint,
    button: 'left',
    clickCount: 1,
  });
await evaluate('new Promise(r => requestAnimationFrame(r))');
assert.equal(
  await evaluate(
    'fogTest.selection.useSelectionStore.getState().selection?.id',
  ),
  await evaluate('fogTest.enemy'),
);
await evaluate(
  'fogTest.u.useUnitsStore.getState().placeUnit(fogTest.enemy,11,7)',
);
await evaluate(
  'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
);
assert.equal(
  await evaluate('fogTest.selection.useSelectionStore.getState().selection'),
  null,
);
console.log('Hidden enemy selection cleared: passed');
ws.close();
