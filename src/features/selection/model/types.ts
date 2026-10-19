export type Selection =
  | { kind: 'cell'; x: number; y: number }
  | { kind: 'unit'; id: string }
  | { kind: 'building'; id: string }
  | null;
