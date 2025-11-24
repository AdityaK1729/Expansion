import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, RotateCcw, Play, Settings, History as HistoryIcon, Info } from 'lucide-react';
import { Player, Board, GameVariant, GameState, MoveHistoryEntry, PreviewData } from '../types';
import { COLORS } from '../constants';
import { 
  createBoard, 
  getCellKey, 
  parseCellKey, 
  getConnectedGroup, 
  getExpansionCells, 
  getIsolatedSquares, 
  hasAnyMoves 
} from '../utils/gameUtils';

export default function ExpandConquerGame() {
  // Game Configuration State
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(6);
  const [variant, setVariant] = useState<GameVariant>('normal');
  const [initialPlayer, setInitialPlayer] = useState<Player>(Player.BLUE);

  // Game Play State
  const [gameState, setGameState] = useState<GameState>('setup');
  const [board, setBoard] = useState<Board>(createBoard(6, 6));
  const [currentPlayer, setCurrentPlayer] = useState<Player>(Player.BLUE);
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  
  // UI Interaction State
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);

  // Update board when dimensions change in setup
  useEffect(() => {
    if (gameState === 'setup') {
      setBoard(createBoard(rows, cols));
    }
  }, [rows, cols, gameState]);

  // --- Actions ---

  const handleSetupClick = (r: number, c: number) => {
    if (gameState !== 'setup') return;
    const newBoard = board.map(row => [...row]);
    // Cycle: Empty -> Blue -> Red -> Empty
    const current = newBoard[r][c];
    newBoard[r][c] = current === Player.EMPTY ? Player.BLUE : (current === Player.BLUE ? Player.RED : Player.EMPTY);
    setBoard(newBoard);
  };

  const startGame = () => {
    setGameState('playing');
    setCurrentPlayer(initialPlayer);
    setHistory([]);
    setWinner(null);
    
    // Check if first player immediately has no moves (rare edge case)
    if (!hasAnyMoves(board, initialPlayer, variant, rows, cols)) {
      setGameState('gameover');
      setWinner(initialPlayer === Player.BLUE ? Player.RED : Player.BLUE);
    }
  };

  const resetGame = () => {
    setGameState('setup');
    setWinner(null);
  };

  const undoMove = () => {
    if (history.length === 0 || gameState === 'setup') return;
    
    const lastState = history[history.length - 1];
    setBoard(lastState.board);
    setCurrentPlayer(lastState.player);
    setHistory(prev => prev.slice(0, -1));
    setGameState('playing');
    setWinner(null);
  };

  const executeMove = (moveType: 'expand' | 'place', data: any) => {
    const newBoard = board.map(row => [...row]);
    let moveDesc = "";

    if (moveType === 'expand') {
      const { expansion, origin } = data;
      expansion.forEach((key: string) => {
        const [r, c] = parseCellKey(key);
        newBoard[r][c] = currentPlayer;
      });
      // Coordinates are 1-based for the user
      const r = origin[0] + 1;
      const c = origin[1] + 1;
      moveDesc = `Expanded at (${r}, ${c}) (+${expansion.size})`;
    } else if (moveType === 'place') {
      const [r, c] = parseCellKey(data.cell);
      newBoard[r][c] = currentPlayer;
      moveDesc = `Placed at (${r + 1}, ${c + 1})`;
    }

    // Save history
    setHistory([...history, {
      board: board, // save previous board
      player: currentPlayer,
      description: moveDesc,
      turnIndex: history.length + 1
    }]);

    setBoard(newBoard);

    // Switch turn
    const nextPlayer = currentPlayer === Player.BLUE ? Player.RED : Player.BLUE;
    
    // Check if next player has moves
    if (!hasAnyMoves(newBoard, nextPlayer, variant, rows, cols)) {
      setGameState('gameover');
      setWinner(currentPlayer); // Current player wins because next player has no moves
      setCurrentPlayer(nextPlayer); // Set visually to loser to show it's their turn but they can't move
    } else {
      setCurrentPlayer(nextPlayer);
    }
  };

  // --- Interaction Logic ---

  // Calculate potential moves for the hovered cell to show preview
  const previewData = useMemo<PreviewData | null>(() => {
    if (gameState !== 'playing' || !hoveredCell) return null;
    const [r, c] = hoveredCell;
    const cellColor = board[r][c];

    // Case 1: Hovering over own piece -> Check expansion
    if (cellColor === currentPlayer) {
      const group = getConnectedGroup(board, r, c, rows, cols);
      const expansion = getExpansionCells(board, group, rows, cols);
      if (expansion.size > 0) {
        return { type: 'expand', group, expansion };
      }
    }
    
    // Case 2: Hovering over empty cell -> Check placement (Void Expansion only)
    if (variant === 'void-expansion' && cellColor === Player.EMPTY) {
      const isolated = getIsolatedSquares(board, currentPlayer, rows, cols);
      const key = getCellKey(r, c);
      if (isolated.includes(key)) {
        return { type: 'place', cell: key };
      }
    }

    return null;
  }, [gameState, hoveredCell, board, currentPlayer, variant, rows, cols]);

  const handleCellClick = (r: number, c: number) => {
    if (gameState === 'setup') {
      handleSetupClick(r, c);
      return;
    }

    if (gameState !== 'playing') return;

    // Use the logic calculated in previewData to determine if click is valid
    // We recalculate here briefly to ensure we don't rely solely on hover state for logic
    const cellColor = board[r][c];
    
    if (cellColor === currentPlayer) {
      const group = getConnectedGroup(board, r, c, rows, cols);
      const expansion = getExpansionCells(board, group, rows, cols);
      if (expansion.size > 0) {
        executeMove('expand', { expansion, origin: [r, c] });
      }
    } else if (variant === 'void-expansion' && cellColor === Player.EMPTY) {
      const isolated = getIsolatedSquares(board, currentPlayer, rows, cols);
      const key = getCellKey(r, c);
      if (isolated.includes(key)) {
        executeMove('place', { cell: key });
      }
    }
  };

  // --- Rendering ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header (Mobile only) */}
        <div className="lg:col-span-12 lg:hidden mb-4">
           <h1 className="text-3xl font-bold text-slate-900 mb-2">Expansion</h1>
        </div>

        {/* Left Sidebar: Controls */}
        <div className="lg:col-span-3 space-y-6">
          <div className="hidden lg:block">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Expansion</h1>
            <p className="text-sm text-slate-500 mb-6">A combinatorial game of territory.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Game Setup
            </h2>

            {gameState === 'setup' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Variant</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setVariant('normal')}
                      className={`flex-1 py-1.5 text-sm rounded-md transition-all ${variant === 'normal' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                      Normal
                    </button>
                    <button 
                      onClick={() => setVariant('void-expansion')}
                      className={`flex-1 py-1.5 text-sm rounded-md transition-all ${variant === 'void-expansion' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                      Void Expansion
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {variant === 'normal' ? 'Expand existing groups only.' : 'Expand groups OR place isolated pieces.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rows</label>
                    <input 
                      type="number" min="1" max="10" 
                      value={rows} onChange={(e) => setRows(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cols</label>
                    <input 
                      type="number" min="1" max="10" 
                      value={cols} onChange={(e) => setCols(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Starting Player</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input type="radio" checked={initialPlayer === Player.BLUE} onChange={() => setInitialPlayer(Player.BLUE)} className="mr-2 text-blue-600 focus:ring-blue-500" />
                      <span className="text-blue-600 font-medium">Blue</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" checked={initialPlayer === Player.RED} onChange={() => setInitialPlayer(Player.RED)} className="mr-2 text-red-600 focus:ring-red-500" />
                      <span className="text-red-600 font-medium">Red</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded mb-3">
                    Tip: Click grid cells to customize the initial board state.
                  </p>
                  <button 
                    onClick={startGame}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-200"
                  >
                    <Play className="w-4 h-4" /> Start Game
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-sm text-slate-500">Playing</div>
                    <div className="font-semibold">{variant === 'normal' ? 'Normal' : 'Void Expansion'} Variant</div>
                    <div className="text-sm text-slate-500 mt-1">{rows} x {cols} Grid</div>
                 </div>
                 
                 <button 
                    onClick={resetGame}
                    className="w-full flex items-center justify-center gap-2 border border-slate-300 text-slate-700 bg-white py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" /> New Game
                  </button>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
               <Info className="w-5 h-5" /> Rules
             </h2>
             <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                <li><span className="font-medium text-slate-900">Goal:</span> Last player to move wins.</li>
                <li><span className="font-medium text-slate-900">Expand:</span> Click your connected group to fill all empty neighbors.</li>
                {variant === 'void-expansion' && (
                  <li><span className="font-medium text-slate-900">Place:</span> Click an isolated empty square to place a new piece.</li>
                )}
             </ul>
          </div>
        </div>

        {/* Center: Game Board */}
        <div className="lg:col-span-6 flex flex-col items-center">
          
          {/* Status Bar */}
          <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
            {gameState === 'playing' || gameState === 'gameover' ? (
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Turn</div>
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold transition-colors ${
                  currentPlayer === Player.BLUE ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${currentPlayer === Player.BLUE ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                  {currentPlayer === Player.BLUE ? 'BLUE' : 'RED'}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 font-medium">Setup Mode</div>
            )}

            {gameState !== 'setup' && (
              <button 
                onClick={undoMove}
                disabled={history.length === 0}
                className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                title="Undo last move"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Winner Banner */}
          {gameState === 'gameover' && (
             <div className="w-full max-w-md mb-6 animate-bounce">
                <div className={`text-center p-4 rounded-xl shadow-lg border-2 ${
                  winner === Player.BLUE ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <h3 className="text-2xl font-bold">🎉 {winner === Player.BLUE ? 'Blue' : 'Red'} Wins!</h3>
                  <p className="text-sm opacity-80 mt-1">No moves left for the opponent.</p>
                </div>
             </div>
          )}

          {/* The Board */}
          <div 
            className="bg-white p-4 rounded-xl shadow-lg border-4 border-slate-300 relative select-none touch-none"
            style={{ 
               display: 'grid', 
               // Grid cols: Header label column + N board columns
               gridTemplateColumns: `30px repeat(${cols}, minmax(0, 1fr))`,
               gap: '4px',
               width: '100%',
               maxWidth: '550px',
            }}
            onMouseLeave={() => setHoveredCell(null)}
          >
            {/* Header Row: Corner + Column Labels */}
            <div className="text-transparent">0</div>
            {Array.from({length: cols}).map((_, i) => (
               <div key={`col-${i}`} className="flex items-end justify-center pb-1 text-xs font-mono font-bold text-slate-400 select-none">
                 {i + 1}
               </div>
            ))}

            {/* Board Rows */}
            {board.map((row, r) => (
              <React.Fragment key={`row-${r}`}>
                {/* Row Label */}
                <div className="flex items-center justify-end pr-2 text-xs font-mono font-bold text-slate-400 select-none">
                  {r + 1}
                </div>
                
                {/* Cells */}
                {row.map((cellState, c) => {
                  const cellKey = getCellKey(r, c);
                  
                  // Visual Logic
                  const isHovered = hoveredCell && hoveredCell[0] === r && hoveredCell[1] === c;
                  
                  // Determine preview state
                  let isPreviewExpand = false;
                  let isPreviewPlace = false;
                  let isGroupHighlight = false;

                  if (previewData) {
                    if (previewData.type === 'expand') {
                      if (previewData.expansion?.has(cellKey)) isPreviewExpand = true;
                      if (previewData.group?.has(cellKey)) isGroupHighlight = true;
                    } else if (previewData.type === 'place') {
                      if (previewData.cell === cellKey) isPreviewPlace = true;
                    }
                  }

                  // Interactive Cursor
                  let cursorClass = 'cursor-default';
                  if (gameState === 'setup') cursorClass = 'cursor-pointer hover:brightness-95';
                  if (gameState === 'playing' && !winner) {
                     if (cellState === currentPlayer && previewData?.type === 'expand') cursorClass = 'cursor-pointer';
                     if (cellState === Player.EMPTY && variant === 'void-expansion' && previewData?.type === 'place') cursorClass = 'cursor-pointer';
                  }

                  return (
                    <div
                      key={cellKey}
                      onMouseEnter={() => setHoveredCell([r, c])}
                      onClick={() => handleCellClick(r, c)}
                      className={`
                        aspect-square
                        relative rounded-md transition-all duration-150 flex items-center justify-center
                        ${cursorClass}
                        ${isGroupHighlight ? 'brightness-110 ring-2 ring-offset-1 ring-slate-400 z-10' : ''}
                        ${cellState === Player.EMPTY ? 'bg-slate-100' : ''}
                      `}
                    >
                      {/* The Piece */}
                      {cellState !== Player.EMPTY && (
                        <div className={`
                          w-[70%] h-[70%] rounded-full shadow-inner border-b-4 
                          transition-transform duration-200
                          ${COLORS[cellState]}
                          ${isGroupHighlight ? 'scale-110' : 'scale-100'}
                        `} />
                      )}

                      {/* Preview Indicators (Ghosts) */}
                      {isPreviewExpand && (
                        <div className={`absolute inset-0 m-auto w-[60%] h-[60%] rounded-full opacity-40 animate-pulse ${currentPlayer === Player.BLUE ? 'bg-blue-400' : 'bg-red-400'}`} />
                      )}
                      {isPreviewPlace && (
                        <div className={`absolute inset-0 m-auto w-[40%] h-[40%] rounded-full opacity-60 border-2 border-dashed ${currentPlayer === Player.BLUE ? 'border-blue-500 bg-blue-100' : 'border-red-500 bg-red-100'}`} />
                      )}

                      {/* Setup Mode Plus Icon for Empty */}
                      {gameState === 'setup' && cellState === Player.EMPTY && isHovered && (
                        <div className="text-slate-300 font-bold text-xl opacity-50">+</div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          
          {gameState === 'playing' && (
             <div className="mt-4 text-center text-sm text-slate-400 min-h-[1.25rem]">
                {previewData?.type === 'expand' ? (
                   <span>Click to expand group (+{previewData.expansion?.size || 0} cells)</span>
                ) : previewData?.type === 'place' ? (
                   <span>Click to place isolated piece</span>
                ) : (
                   <span>&nbsp;</span>
                )}
             </div>
          )}

        </div>

        {/* Right Sidebar: History */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <HistoryIcon className="w-5 h-5" /> Move History
              </h2>
              <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                Turn {history.length + 1}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center text-slate-400 py-10 text-sm italic">
                  No moves yet.<br/>Game start!
                </div>
              ) : (
                history.map((entry, i) => (
                  <div key={i} className="flex gap-3 text-sm animate-in slide-in-from-left-2 fade-in duration-200">
                    <span className="text-slate-400 font-mono w-6">{i+1}.</span>
                    <div className="flex-1">
                      <span className={`font-bold ${entry.player === Player.BLUE ? 'text-blue-600' : 'text-red-600'}`}>
                        {entry.player === Player.BLUE ? 'Blue' : 'Red'}
                      </span>
                      <span className="text-slate-600"> {entry.description}</span>
                    </div>
                  </div>
                ))
              )}
              {/* Dummy element to scroll to */}
              <div id="history-end" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}