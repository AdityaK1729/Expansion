export enum Player {
  EMPTY = 0,
  BLUE = 1,
  RED = 2,
}

export type Board = Player[][];

export type GameVariant = 'normal' | 'void-expansion';

export type GameState = 'setup' | 'playing' | 'gameover';

export interface MoveHistoryEntry {
  board: Board;
  player: Player;
  description: string;
  turnIndex: number;
}

export interface ExpansionMoveData {
  expansion: Set<string>;
  origin: [number, number];
}

export interface PlacementMoveData {
  cell: string;
}

export type MoveType = 'expand' | 'place';

export interface PreviewData {
  type: MoveType;
  group?: Set<string>;
  expansion?: Set<string>;
  cell?: string;
}