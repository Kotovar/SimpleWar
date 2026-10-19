import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import { useEconomyStore } from './economyStore';
import { useEconomySelectors } from './useEconomySelectors';

it('возвращает действие удаления ресурсов из хранилища', () => {
  let selectedAction: unknown;

  const HookHarness = () => {
    selectedAction = useEconomySelectors().removeResources;
    return null;
  };

  renderToStaticMarkup(createElement(HookHarness));

  expect(selectedAction).toBe(useEconomyStore.getState().removeResources);
});
