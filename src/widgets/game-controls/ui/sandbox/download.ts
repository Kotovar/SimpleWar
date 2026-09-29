import { collectReport } from '@features/sandbox';

/** Сохраняет итог боя режима тестирования в JSON-файл. */
export const downloadReport = () => {
  const report = collectReport();
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `simplewar-test-${report.seed ?? 'map'}-turn${report.turns}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
};
