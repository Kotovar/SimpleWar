import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const mode = 's21';
const url = process.env.ACCEPTANCE_URL ?? 'http://127.0.0.1:5175/';
const report = {
  url,
  warmupCycles: 10,
  cycles: [],
  warmup: [],
  exceptions: [],
};
const pages = await (await fetch('http://127.0.0.1:9231/json/list')).json();
const frameResults = [];
const page = pages.find(p => p.type === 'page');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(resolve =>
  socket.addEventListener('open', resolve, { once: true }),
);
let serial = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown')
    exceptions.push(message.params.exceptionDetails.text);
  if (
    message.method === 'Runtime.consoleAPICalled' &&
    message.params.type === 'error'
  )
    exceptions.push(
      message.params.args.map(arg => arg.value ?? arg.description).join(' '),
    );
  if (
    message.method === 'Log.entryAdded' &&
    message.params.entry.level === 'error'
  )
    exceptions.push(message.params.entry.text);
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
  else callback.resolve(message.result);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
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
const wait = async expression => {
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 75));
  }
  throw new Error('Timeout: ' + expression);
};
const frames = () =>
  evaluate(
    'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
  );
const click = async (text, slot = null) => {
  if (slot !== null && !Number.isInteger(slot))
    throw new Error('Slot must be an integer');
  const source =
    slot === null
      ? `document.querySelectorAll('dialog[open], [role="dialog"]').length ? [...document.querySelectorAll('dialog[open], [role="dialog"]')].at(-1) : document`
      : `document.querySelector('dialog[open] ul').children[${Number(slot)}]`;
  const selector = `(() => { const root = ${source}; return [...root.querySelectorAll('button,summary')].find(e => e.textContent.trim() === ${JSON.stringify(text)}); })()`;
  await evaluate(`(${selector})?.scrollIntoView({block:'center'})`);
  await frames();
  const pos = await evaluate(
    `(() => {const e = ${selector}; if (!e || e.disabled) throw new Error('Missing/disabled button: ' + ${JSON.stringify(text)}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
  );
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    clickCount: 1,
    ...pos,
  });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    clickCount: 1,
    ...pos,
  });
  await frames();
};
const screen = async name => {
  const r = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  await writeFile(
    `/tmp/simplewar-save-layout-${mode}-${name}.png`,
    Buffer.from(r.data, 'base64'),
  );
};

// Только подготовка нагрузки обходит обычный старт; загрузка и ввод — через UI.
const stressFrames = async () => {
  for (const count of [2, 3]) {
    const snapshot = JSON.parse(
      await readFile(`/tmp/simplewar-s21-stress-${count}.json`, 'utf8'),
    );
    snapshot.loop.participants = snapshot.loop.participants.map(p => ({
      ...p,
      controller: 'human',
    }));
    const record = {
      id: `stress-${count}`,
      name: `Нагрузка ${count}`,
      savedAt: new Date().toISOString(),
      snapshot,
    };
    await evaluate(
      `localStorage.setItem('simplewar:saves:manual:0',${JSON.stringify(JSON.stringify(record))})`,
    );
    await click('Сохранения');
    await click('Загрузить', 0);
    await click('Загрузить');
    await wait(
      '!!document.querySelector("canvas") && !document.querySelector("dialog[open]")',
    );
    for (const dpr of [1, 2]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 720,
        deviceScaleFactor: dpr,
        mobile: false,
      });
      await click('Вся карта');
      await frames();
      const point = await evaluate(
        `(() => {const r=document.querySelector('[role="region"][aria-label^="Карта"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
      );
      await evaluate(
        `(() => {window.acceptanceFrames=[];window.acceptanceCollecting=true;let previous;function sample(now){if(previous)acceptanceFrames.push(now-previous);previous=now;if(acceptanceCollecting)requestAnimationFrame(sample)}requestAnimationFrame(sample)})()`,
      );
      for (let gesture = 0; gesture < 4; gesture++) {
        await send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          ...point,
          button: 'middle',
          buttons: 4,
          clickCount: 1,
        });
        for (let step = 1; step <= 24; step++) {
          await send('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: point.x + step * (gesture % 2 ? 4 : -4),
            y: point.y + step * (gesture % 2 ? 2 : -2),
            buttons: 4,
          });
          await evaluate('new Promise(requestAnimationFrame)');
        }
        await send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          ...point,
          button: 'middle',
          clickCount: 1,
        });
        await send('Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          ...point,
          deltaX: 0,
          deltaY: gesture % 2 ? 80 : -80,
        });
        await frames();
      }
      const values = await evaluate(
        'acceptanceCollecting=false;acceptanceFrames',
      );
      const sorted = values.toSorted((a, b) => a - b);
      frameResults.push({
        participants: count,
        units: count * 30,
        buildings: count * 50,
        viewport: '1280×720',
        dpr,
        samples: sorted.length,
        p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
        maxMs: Math.max(...sorted),
      });
      await screen(`stress-${count}-dpr-${dpr}`);
    }
    await click('Меню');
    await click('Сбросить игру');
    await click('Да, сбросить');
    await wait('!!document.querySelector("h1")');
  }
};

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  });
  report.browser = (await send('Browser.getVersion')).product;
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source:
      'window.acceptanceDevtoolsCalls=0;window.__REDUX_DEVTOOLS_EXTENSION__={connect(){window.acceptanceDevtoolsCalls++;return {init(){},send(){},subscribe(){return ()=>{}},unsubscribe(){}}}}',
  });
  await send('Page.navigate', { url });
  await wait('!!document.querySelector("h1")');
  await evaluate('localStorage.clear()');
  await send('Page.reload', { ignoreCache: true });
  await wait('!!document.querySelector("h1")');
  report.reduxDevtools = await evaluate(
    'typeof window.__REDUX_DEVTOOLS_EXTENSION__',
  );
  for (let cycle = 0; cycle < report.warmupCycles + 10; cycle++) {
    const small = await evaluate(
      `[...document.querySelectorAll('button')].find(e=>e.textContent.includes('15 × 15'))?.textContent.trim()`,
    );
    if (small) await click(small);
    await click('Начать игру');
    await wait('!!document.querySelector("canvas")');
    await click('Меню');
    await click('Сохранения');
    await wait('!!document.querySelector("dialog[open] ul")');
    await click('Сохранить', 0);
    if (cycle > 0) {
      await wait('document.querySelectorAll("dialog[open]").length===2');
      await click('Подтвердить');
    }
    await wait(`!!localStorage.getItem('simplewar:saves:manual:0')`);
    const saved = await evaluate(
      `JSON.parse(localStorage.getItem('simplewar:saves:manual:0')).snapshot`,
    );
    assert.equal(saved.loop.currentTurn, 1);
    assert.equal(saved.debug.usedInGame, false);
    assert.equal(Object.keys(saved.units).length, 2);
    assert.equal(Object.keys(saved.buildings).length, 2);
    await click('Загрузить', 0);
    await click('Загрузить');
    await wait('!document.querySelector("dialog[open]")');
    await click('Меню');
    await click('Сбросить игру');
    await click('Да, сбросить');
    await wait(
      '!!document.querySelector("h1") && !document.querySelector("canvas")',
    );
    await frames();
    await send('HeapProfiler.collectGarbage');
    const heap = await send('Runtime.getHeapUsage');
    const dom = await send('Memory.getDOMCounters');
    const destination =
      cycle < report.warmupCycles ? report.warmup : report.cycles;
    destination.push({ cycle: cycle + 1, heapBytes: heap.usedSize, ...dom });
  }
  report.devtoolsConnections = await evaluate('window.acceptanceDevtoolsCalls');
  assert.equal(
    report.devtoolsConnections,
    0,
    'Production connects to Redux DevTools',
  );
  const tail = report.cycles;
  if (process.env.ACCEPTANCE_STRESS) await stressFrames();
  report.frames = frameResults;
  assert.deepEqual(exceptions, []);
  await screen('production-menu');
  report.functionalStatus = 'passed';
  for (const result of frameResults)
    assert.ok(
      result.p95Ms <= 33,
      `Frame p95 exceeds 33ms: ${JSON.stringify(result)}`,
    );
  assert.ok(
    !tail.every((v, i) => i === 0 || v.heapBytes > tail[i - 1].heapBytes),
    'Heap grows monotonically after warmup',
  );
  assert.ok(
    Math.max(...tail.map(v => v.jsEventListeners)) -
      Math.min(...tail.map(v => v.jsEventListeners)) <=
      5,
    'Listener growth',
  );
  assert.deepEqual(exceptions, []);
  await screen('production-menu');
  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed';
  report.error = String(error);
  throw error;
} finally {
  report.exceptions = exceptions;
  await writeFile(
    '/tmp/simplewar-s21-browser.json',
    JSON.stringify(report, null, 2),
  );
  socket.close();
}
