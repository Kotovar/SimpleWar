// Проверка лечения кликами в Chrome 1280×720, DPR 1; сцена задана через store.
// pnpm dev --host 127.0.0.1 --port 5182
// Chrome: --remote-debugging-port=9332 --user-data-dir=/tmp/simplewar-heal-chrome
// node scripts/healing-feedback-browser.mjs
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
for (const sheltered of [false, true]) {
  await evaluate(`(async () => {
 const [m,u,b,g,s,l] = await Promise.all(['entities/maps','entities/units','entities/buildings','entities/games','entities/settings','features/game-loop'].map(p=>import('/src/'+p+'/index.ts')));
 l.resetGame(); s.useSettingsStore.setState({gridColumns:12,gridRows:8});
 m.useMapStore.setState({grid:Array.from({length:8},(_,y)=>Array.from({length:12},(_,x)=>({x,y,type:'grass',isWalkable:true})))});
 g.useGameLoopStore.setState({phase:'inProgress',activePlayer:'p1',currentTurn:1,participants:[{id:'p1',controller:'human'},{id:'p2',controller:'human'}]});
 const healer=u.useUnitsStore.getState().spawnUnit('healer',3,3,'p1',true);
 const target=u.useUnitsStore.getState().spawnUnit(${sheltered ? "'worker'" : "'swordsman'"},4,3,'p1',true);
 u.useUnitsStore.getState().damageUnit(target,7);
 u.useUnitsStore.getState().resetUnitsForNewTurn('p1');
 if (${sheltered}) { const mine=b.useBuildingsStore.getState().spawnBuilding('mine',4,3,'p1');u.useUnitsStore.getState().setWorkplace(target,mine); }
 window.healTest={u,b,s,healer,target,texts:[]};
 window.originalFillText ??= CanvasRenderingContext2D.prototype.fillText;
 const original=window.originalFillText;
 CanvasRenderingContext2D.prototype.fillText=function(text,...args){healTest.texts.push({text,color:this.fillStyle,canvas:this.canvas.className});return original.call(this,text,...args)};
})()`);
  const frames = () =>
    evaluate(
      'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))',
    );
  await frames();
  await new Promise(r => setTimeout(r, 800));
  const click = async (x, y) => {
    const point = await evaluate(
      `(()=>{const {camera,cellSize}=healTest.s.useSettingsStore.getState();const r=[...document.querySelectorAll('canvas')].find(c=>c.className.includes('Highlight')).getBoundingClientRect();return {x:r.left+(${x}+.5-camera.x)*cellSize,y:r.top+(${y}+.5-camera.y)*cellSize}})()`,
    );
    for (const type of ['mousePressed', 'mouseReleased'])
      await send('Input.dispatchMouseEvent', {
        type,
        ...point,
        button: 'left',
        clickCount: 1,
      });
    await frames();
  };
  await click(3, 3);
  await evaluate('healTest.texts=[]');
  await click(4, 3);
  const result = await evaluate(
    `({hp:healTest.u.useUnitsStore.getState().units[healTest.target].hp,max:healTest.u.useUnitsStore.getState().units[healTest.target].maxHp,texts:healTest.texts.filter(t=>t.text==='+7')})`,
  );
  console.log(JSON.stringify(result));
  assert.equal(result.hp, result.max);
  assert(
    result.texts.some(
      t => t.canvas.includes('_Unit_') && t.color === '#86efac',
    ),
    'No healing number on Entities canvas',
  );
}
ws.close();
