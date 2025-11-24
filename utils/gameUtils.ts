import { Board, Player, GameVariant } from '../types';

export const createBoard = (rows: number, cols: number): Board => 
  Array(rows).fill(null).map(() => Array(cols).fill(Player.EMPTY));

export const getCellKey = (r: number, c: number): string => `${r},${c}`;

export const parseCellKey = (key: string): [number, number] => 
  key.split(',').map(Number) as [number, number];

export const getConnectedGroup = (board: Board, r: number, c: number, rows: number, cols: number): Set<string> => {
  const color = board[r][c];
  if (color === Player.EMPTY) return new Set();

  const group = new Set<string>();
  const visited = new Set<string>();
  const queue: [number, number][] = [[r, c]];
  visited.add(getCellKey(r, c));

  while (queue.length > 0) {
    const [currR, currC] = queue.shift()!;
    group.add(getCellKey(currR, currC));

    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of directions) {
      const nr = currR + dr;
      const nc = currC + dc;

      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const key = getCellKey(nr, nc);
        if (!visited.has(key) && board[nr][nc] === color) {
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }
  }
  return group;
};

export const getExpansionCells = (board: Board, groupSet: Set<string>, rows: number, cols: number): Set<string> => {
  const expansion = new Set<string>();
  
  groupSet.forEach(key => {
    const [r, c] = parseCellKey(key);
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        if (board[nr][nc] === Player.EMPTY) {
          expansion.add(getCellKey(nr, nc));
        }
      }
    }
  });
  
  return expansion;
};

// For Void Expansion variant: Get empty cells not adjacent to ANY group of the current color
export const getIsolatedSquares = (board: Board, color: Player, rows: number, cols: number): string[] => {
  const adjacentToFriends = new Set<string>();
  
  // Find all cells adjacent to existing friendly groups
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === color) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            adjacentToFriends.add(getCellKey(nr, nc));
          }
        }
      }
    }
  }

  const isolated: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === Player.EMPTY && !adjacentToFriends.has(getCellKey(r, c))) {
        isolated.push(getCellKey(r, c));
      }
    }
  }
  return isolated;
};

export const hasAnyMoves = (board: Board, color: Player, variant: GameVariant, rows: number, cols: number): boolean => {
  // Check expansion moves
  const visited = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = getCellKey(r, c);
      if (board[r][c] === color && !visited.has(key)) {
        const group = getConnectedGroup(board, r, c, rows, cols);
        group.forEach(k => visited.add(k));
        
        const expansion = getExpansionCells(board, group, rows, cols);
        if (expansion.size > 0) return true;
      }
    }
  }

  // Check placement moves (Void Expansion only)
  if (variant === 'void-expansion') {
    const isolated = getIsolatedSquares(board, color, rows, cols);
    if (isolated.length > 0) return true;
  }

  return false;
};