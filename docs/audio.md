# Звук: файлы и источники

Модуль воспроизведения — `src/shared/lib/audio`, правила — в
[механиках](mechanics.md#оформление-и-звук). Здесь — откуда взяты файлы.

## Расположение

Для MVP используются только MP3. Переход на ogg/opus с резервным MP3
может рассматриваться после MVP и не требуется для его приёмки.

- Музыка: `public/audio/music/{menu,peace,battle,victory,defeat}.mp3`.
- Эффекты: `public/audio/sfx/<имя>.mp3` (одна вариация) или
  `<имя>1.mp3` … `<имя>N.mp3`. Число вариаций — `SFX_VARIANTS` в
  `src/shared/config/audio.ts`; тест `audio.test.ts` сверяет его с папкой.
- Новая вариация: положить файл со следующим номером и увеличить число в
  `SFX_VARIANTS`.
- Расчистка леса: `public/audio/sfx/clearForest1.mp3` … `clearForest3.mp3`.
  При каждом событии выбирается случайный вариант; до загрузки звучит синтез.
  Для генерации — короткий эффект около 0,7 с без зацикливания.
  Промпт: `Short isolated medieval strategy game sound effect: two quick axe
chops into wood, followed by a small tree cracking and falling with a soft
leafy rustle. Dry close-up foley, compact and gentle, 0.7 seconds total,
immediate start, short natural decay. No voices, no music, no ambience,
no reverb, no loop.`
- Ход катапульты `siegeMove1..2` и всадника `riderMove1..2` (~1,2–1,5 с,
  затухание 0,2 с). Промпт катапульты: `Medieval wooden siege catapult on
wooden wheels rolling slowly over dirt: heavy creaking wooden axle, rumbling
wheels, rattling ropes and timber. Dry close-up game foley…`; всадника:
  `Single horse trotting a few steps on dirt road: clear hoof clops, slight
harness jingle…`. Тема меню (2 мин): `Medieval fantasy strategy game main
menu theme, warm and inviting, lute, harp, soft strings, wooden flute and
gentle frame drum, heroic but calm, 90 BPM, D major, seamless loopable
instrumental.`
- Магия лекаря `heal3..5` (1,2 с): `Fantasy healer casting a healing spell:
soft rising magical shimmer, gentle bell chimes and warm sparkling glow,
holy and soothing…`; `heal1..2` — прежние короткие.
- Начало хода `turnStart` (1 с, частый — тише, −24 дБ): `Soft gentle
notification chime for the start of a turn in a medieval strategy game: two
quiet warm wooden marimba notes rising, soft attack, calm and unobtrusive…`.
- Музыкальные темы перекрываются плавным затиханием и нарастанием по 5 с;
  старая тема звучит до загрузки новой.
- Громкость файлов выравнивается при загрузке, сами файлы не меняются:
  звучащая часть (без тишины) приводится к `SFX_LOUDNESS_DB` (−20 дБ RMS),
  интерфейс и частые звуки тише — `SFX_LOUDNESS_OVERRIDE`. Пик не выходит
  за 0 дБ, тихий файл усиливается не больше чем в 8 раз.

## Бюджет

Музыка ~17 МБ (5 треков по 2–2,7 мин, ~187 kbps mp3), эффекты ~0,8 МБ.
Музыка грузится лениво по теме, эффекты — один раз после первого действия.
При необходимости ужать музыку до ~96 kbps.

## Источники и лицензии

| Файлы                                                                                                 | Источник                                    | Тариф | Дата          | Лицензия                       |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----- | ------------- | ------------------------------ |
| `music/*.mp3`                                                                                         | Suno, промпты из обсуждения S18             | Free  | 01.10.2026    | Некоммерческое использование   |
| `sfx/*.mp3`                                                                                           | ElevenLabs Sound Effects                    | Free  | 01–02.10.2026 | Некоммерческое использование   |
| `music/menu.mp3`, `sfx/siegeMove*.mp3`, `sfx/riderMove*.mp3`, `sfx/heal3..5.mp3`, `sfx/turnStart.mp3` | AI Studio, Stable Audio 3 Medium (локально) | —     | 18.10.2026    | Stability AI Community License |
| Запасной синтез                                                                                       | Код проекта (`SFX_TONES`)                   | —     | —             | Лицензия проекта               |
