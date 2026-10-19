import { AI_ACTION_DELAY_MS, AI_PLAYBACK_RATE } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { getHumanId, useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useMapStore } from '@entities/maps';
import { getParticipantKnowledge } from '@entities/perceptions';
import { useDebugStore, usePreferencesStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { useSandboxStore } from '@features/sandbox';
import { buildScene } from '@widgets/map';

/** Только видимые модели и известные отметки; скрытые изменения не создают пауз. */
export const getAiPresentationSnapshot = () => {
  const debug = useDebugStore.getState();
  const humanId = getHumanId(useGameLoopStore.getState().participants);
  const viewer = (debug.enabled ? debug.viewer : null) ?? humanId;
  const world = !viewer || (debug.enabled && debug.fullView);
  const knowledge = viewer ? getParticipantKnowledge(viewer) : undefined;
  const grid = useMapStore.getState().grid;
  const scene = buildScene(
    {
      grid,
      units: useUnitsStore.getState().units,
      buildings: useBuildingsStore.getState().buildings,
    },
    world
      ? { mode: 'world' }
      : { mode: 'participant', viewer: viewer!, knowledge },
    grid,
  );
  return JSON.stringify([
    [...Object.values(scene.units), ...Object.values(scene.buildings)].map(
      entity => [
        entity.id,
        entity.x,
        entity.y,
        entity.hp,
        'attackPoints' in entity ? entity.attackPoints : null,
      ],
    ),
    knowledge?.strikes,
  ]);
};

/** Визуальное ожидание отменяется сбросом, сменой хода или настройкой скорости. */
export const waitForAiPresentation = (isCancelled: () => boolean) => {
  const sandbox = useSandboxStore.getState();
  const playback = usePreferencesStore.getState().aiPlayback;
  const rate = sandbox.enabled && sandbox.fast ? 0 : AI_PLAYBACK_RATE[playback];
  if (!rate || isCancelled()) return null;
  return new Promise<void>(resolve => {
    const finish = () => {
      clearTimeout(timer);
      offs.forEach(off => off());
      resolve();
    };
    const check = () => {
      const currentSandbox = useSandboxStore.getState();
      if (
        isCancelled() ||
        usePreferencesStore.getState().aiPlayback !== playback ||
        (currentSandbox.enabled && currentSandbox.fast)
      )
        finish();
    };
    const timer = setTimeout(finish, AI_ACTION_DELAY_MS / rate);
    const offs = [
      useGameLoopStore.subscribe(check),
      useJournalStore.subscribe(check),
      usePreferencesStore.subscribe(check),
      useSandboxStore.subscribe(check),
    ];
  });
};
