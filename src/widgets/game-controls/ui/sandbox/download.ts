import { collectReport } from '@features/sandbox';

/** Сохраняет итог боя режима тестирования в JSON-файл. */
export const downloadReport = () => {
  const report = collectReport();
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `simplewar-test-${report.seed ?? 'map'}-turn${report.turns}.json`;
  link.click();
  // Сразу после клика загрузка может ещё не начаться (Firefox): освобождаем позже.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
