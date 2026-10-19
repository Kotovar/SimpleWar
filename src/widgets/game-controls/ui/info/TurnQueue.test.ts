import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import type { Participant } from '@shared/config';
import { TurnQueueList } from './TurnQueue';

const participants: Participant[] = [
  { id: 'p1', controller: 'human', palette: 'blue' },
  { id: 'p2', controller: 'ai', palette: 'red' },
  { id: 'p3', controller: 'ai', palette: 'yellow' },
  { id: 'p4', controller: 'ai', palette: 'pink' },
];

describe('очередь ходов (M4)', () => {
  it('все стороны по порядку: текущая отмечена, выбывшие зачёркнуты', () => {
    const html = renderToStaticMarkup(
      createElement(TurnQueueList, {
        participants,
        activePlayer: 'p3',
        eliminated: ['p2'],
        humanId: 'p1',
      }),
    );

    expect(html.match(/<li/g)).toHaveLength(4);
    expect(html).toContain('aria-label="Синие (вы)"');
    expect(html).toContain('aria-label="Красные — выбыли"');
    expect(html).toMatch(/data-active="true"[^>]*aria-label="Жёлтые"/);
    expect(html).toContain('aria-label="Розовые"');
  });

  it('на двоих не показывается', () => {
    const html = renderToStaticMarkup(
      createElement(TurnQueueList, {
        participants: participants.slice(0, 2),
        activePlayer: 'p1',
        eliminated: [],
        humanId: 'p1',
      }),
    );

    expect(html).toBe('');
  });
});
