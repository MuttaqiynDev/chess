// Chess game implementation
class ChessGame {
    constructor() {
        this.board = this.createInitialBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameMode = 'bot'; // 'bot' or 'hotseat'
        this.isFlipped = false;
        this.thinkTime = 3;
        this.gameStatus = 'active';
        this.lastMove = null;
        this.isThinking = false;
        
        this.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        this.ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
        
        this.pieceValues = {
            'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000
        };
        
        this.setupEventListeners();
        this.renderBoard();
        this.updateUI();
    }
    
    createInitialBoard() {
        const board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Place pawns
        for (let i = 0; i < 8; i++) {
            board[1][i] = { type: 'p', color: 'black' };
            board[6][i] = { type: 'p', color: 'white' };
        }
        
        // Place other pieces
        const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        for (let i = 0; i < 8; i++) {
            board[0][i] = { type: backRank[i], color: 'black' };
            board[7][i] = { type: backRank[i], color: 'white' };
        }
        
        return board;
    }
    
    setupEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoMove());
        document.getElementById('flipBtn').addEventListener('click', () => this.flipBoard());
        document.getElementById('playBotBtn').addEventListener('click', () => this.setGameMode('bot'));
        document.getElementById('hotseatBtn').addEventListener('click', () => this.setGameMode('hotseat'));
        
        document.getElementById('thinkTime').addEventListener('change', (e) => {
            this.thinkTime = Math.max(1, Math.min(30, parseInt(e.target.value)));
        });
        
        // Promotion modal
        document.querySelectorAll('.promotion-piece').forEach(piece => {
            piece.addEventListener('click', (e) => {
                this.handlePromotion(e.target.dataset.piece);
            });
        });
    }
    
    renderBoard() {
      const boardElement = document.getElementById('board');
      boardElement.innerHTML = '';
      
      for (let rank = 0; rank < 8; rank++) {
          for (let file = 0; file < 8; file++) {
              const square = document.createElement('div');
              square.className = 'square';
              
              const displayRank = this.isFlipped ? 7 - rank : rank;
              const displayFile = this.isFlipped ? 7 - file : file;
              
              const isLight = (rank + file) % 2 === 0;
              square.style.backgroundColor = isLight ? 'var(--white-square)' : 'var(--black-square)';
              
              square.dataset.rank = displayRank;
              square.dataset.file = displayFile;
              
              const piece = this.board[displayRank][displayFile];
              if (piece) {
                  const img = document.createElement('img');
                  img.src = this.getPieceSymbol(piece);
                  img.style.width = '80%';
                  img.style.height = '80%';
                  img.style.objectFit = 'contain';
                  img.style.pointerEvents = 'none';
                  square.appendChild(img);
              } else {
                  square.innerHTML = '';
              }
              
              square.addEventListener('click', () => this.handleSquareClick(displayRank, displayFile));
              boardElement.appendChild(square);
          }
      }
  }
    
  

    
    getPieceSymbol(piece) {
        const pieceImages = {
            'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
            'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
            'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
            'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
            'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
            'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
            'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
            'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
            'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
            'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
            'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
            'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
        };
        
        const key = piece.color === 'white' ? piece.type.toUpperCase() : piece.type.toLowerCase();
        return pieceImages[key];
    }
    
    handleSquareClick(rank, file) {
        if (this.gameStatus !== 'active' || this.isThinking) return;
        
        const piece = this.board[rank][file];
        
        if (!this.selectedSquare) {
            // Select a piece
            if (piece && piece.color === this.currentPlayer) {
                this.selectedSquare = { rank, file };
                this.renderBoard();
                this.showPossibleMoves(rank, file);
            }
        } else {
            // Make a move or change selection
            if (this.selectedSquare.rank === rank && this.selectedSquare.file === file) {
                // Deselect
                this.selectedSquare = null;
                this.renderBoard();
            } else if (piece && piece.color === this.currentPlayer) {
                // Select different piece
                this.selectedSquare = { rank, file };
                this.renderBoard();
                this.showPossibleMoves(rank, file);
            } else {
                // Try to make a move
                this.attemptMove(this.selectedSquare.rank, this.selectedSquare.file, rank, file);
            }
        }
    }
    
    showPossibleMoves(rank, file) {
        const moves = this.getLegalMoves(rank, file);
        moves.forEach(move => {
            const square = this.getSquareElement(move.toRank, move.toFile);
            if (square) square.classList.add('possible-move');
        });
    }
    
    getSquareElement(rank, file) {
        return document.querySelector(`[data-rank="${rank}"][data-file="${file}"]`);
    }
    
    attemptMove(fromRank, fromFile, toRank, toFile) {
        const piece = this.board[fromRank][fromFile];
        if (!piece || piece.color !== this.currentPlayer) return false;
        
        // Check if move is legal
        const legalMoves = this.getLegalMoves(fromRank, fromFile);
        const move = legalMoves.find(m => m.toRank === toRank && m.toFile === toFile);
        
        if (!move) return false;
        
        // Check for promotion
        if (piece.type === 'p' && 
            ((piece.color === 'white' && toRank === 0) || 
             (piece.color === 'black' && toRank === 7))) {
            this.pendingPromotion = { fromRank, fromFile, toRank, toFile };
            document.getElementById('promotionModal').style.display = 'flex';
            return true;
        }
        
        this.makeMove(fromRank, fromFile, toRank, toFile);
        return true;
    }
    
    handlePromotion(pieceType) {
        document.getElementById('promotionModal').style.display = 'none';
        if (this.pendingPromotion) {
            const { fromRank, fromFile, toRank, toFile } = this.pendingPromotion;
            this.makeMove(fromRank, fromFile, toRank, toFile, pieceType);
            this.pendingPromotion = null;
        }
    }
    
    makeMove(fromRank, fromFile, toRank, toFile, promotion = null) {
        const piece = this.board[fromRank][fromFile];
        const capturedPiece = this.board[toRank][toFile];
        
        // Store move in history
        const moveData = {
            fromRank, fromFile, toRank, toFile,
            piece: { ...piece },
            capturedPiece: capturedPiece ? { ...capturedPiece } : null,
            promotion
        };
        
        this.moveHistory.push(moveData);
        
        // Make the move
        this.board[fromRank][fromFile] = null;
        
        if (promotion) {
            this.board[toRank][toFile] = { type: promotion, color: piece.color };
        } else {
            this.board[toRank][toFile] = piece;
        }
        
        // Handle castling
        if (piece.type === 'k' && Math.abs(toFile - fromFile) === 2) {
            const rookFromFile = toFile > fromFile ? 7 : 0;
            const rookToFile = toFile > fromFile ? 5 : 3;
            
            this.board[toRank][rookToFile] = this.board[fromRank][rookFromFile];
            this.board[fromRank][rookFromFile] = null;
        }
        
        // Handle en passant
        if (piece.type === 'p' && !capturedPiece && fromFile !== toFile) {
            this.board[fromRank][toFile] = null;
        }
        
        this.lastMove = { fromRank, fromFile, toRank, toFile };
        this.selectedSquare = null;
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        this.updateGameStatus();
        this.renderBoard();
        this.updateUI();
        
        // Bot move if in bot mode and it's black's turn
        if (this.gameMode === 'bot' && this.currentPlayer === 'black' && this.gameStatus === 'active') {
            setTimeout(() => this.makeBotMove(), 300);
        }
    }
    
    async makeBotMove() {
        if (this.isThinking || this.gameStatus !== 'active') return;
        
        this.isThinking = true;
        document.getElementById('thinkingIndicator').classList.add('active');
        
        try {
            const startTime = Date.now();
            const bestMove = await this.findBestMove(this.thinkTime * 1000);
            
            // Ensure minimum thinking time for UX
            const elapsed = Date.now() - startTime;
            const minThinkTime = 800;
            
            if (elapsed < minThinkTime) {
                await new Promise(resolve => setTimeout(resolve, minThinkTime - elapsed));
            }
            
            if (bestMove && this.gameStatus === 'active') {
                if (bestMove.promotion) {
                    this.makeMove(bestMove.fromRank, bestMove.fromFile, 
                                bestMove.toRank, bestMove.toFile, bestMove.promotion);
                } else {
                    this.makeMove(bestMove.fromRank, bestMove.fromFile, 
                                bestMove.toRank, bestMove.toFile);
                }
            }
        } catch (error) {
            console.error('Bot move error:', error);
        } finally {
            this.isThinking = false;
            document.getElementById('thinkingIndicator').classList.remove('active');
        }
    }
    
    async findBestMove(timeLimit) {
        const startTime = Date.now();
        let bestMove = null;
        let bestEval = -Infinity;
        
        // Get all legal moves for current player
        const allMoves = [];
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = this.board[rank][file];
                if (piece && piece.color === this.currentPlayer) {
                    const moves = this.getLegalMoves(rank, file);
                    allMoves.push(...moves);
                }
            }
        }
        
        if (allMoves.length === 0) return null;
        
        // Simple evaluation with some randomness for variety
        for (const move of allMoves) {
            const evaluation = this.evaluateMove(move) + (Math.random() - 0.5) * 0.1;
            if (evaluation > bestEval) {
                bestEval = evaluation;
                bestMove = move;
            }
            
            // Check time limit
            if (Date.now() - startTime > timeLimit * 0.8) break;
        }
        
        return bestMove;
    }
    
    evaluateMove(move) {
        // Simple move evaluation
        let score = 0;
        
        // Capture value
        const capturedPiece = this.board[move.toRank][move.toFile];
        if (capturedPiece) {
            score += this.pieceValues[capturedPiece.type];
        }
        
        // Center control
        const centerDistance = Math.abs(move.toRank - 3.5) + Math.abs(move.toFile - 3.5);
        score += (7 - centerDistance) * 10;
        
        // Piece development
        if (move.fromRank === 0 || move.fromRank === 7) {
            score += 20;
        }
        
        return score;
    }
    
    getLegalMoves(rank, file) {
        const piece = this.board[rank][file];
        if (!piece) return [];
        
        let moves = [];
        
        switch (piece.type) {
            case 'p': moves = this.getPawnMoves(rank, file, piece.color); break;
            case 'r': moves = this.getRookMoves(rank, file, piece.color); break;
            case 'n': moves = this.getKnightMoves(rank, file, piece.color); break;
            case 'b': moves = this.getBishopMoves(rank, file, piece.color); break;
            case 'q': moves = this.getQueenMoves(rank, file, piece.color); break;
            case 'k': moves = this.getKingMoves(rank, file, piece.color); break;
        }
        
        // Filter out moves that would put own king in check
        return moves.filter(move => !this.wouldBeInCheck(rank, file, move.toRank, move.toFile, piece.color));
    }
    
    getPawnMoves(rank, file, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRank = color === 'white' ? 6 : 1;
        
        // Forward move
        const newRank = rank + direction;
        if (newRank >= 0 && newRank < 8 && !this.board[newRank][file]) {
            moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: file });
            
            // Double move from starting position
            if (rank === startRank && !this.board[newRank + direction][file]) {
                moves.push({ fromRank: rank, fromFile: file, toRank: newRank + direction, toFile: file });
            }
        }
        
        // Captures
        for (const fileOffset of [-1, 1]) {
            const newFile = file + fileOffset;
            if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
                const target = this.board[newRank][newFile];
                if (target && target.color !== color) {
                    moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: newFile });
                }
            }
        }
        
        return moves;
      }
    
    getRookMoves(rank, file, color) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        
        for (const [rankDir, fileDir] of directions) {
            let newRank = rank + rankDir;
            let newFile = file + fileDir;
            
            while (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
                const target = this.board[newRank][newFile];
                
                if (!target) {
                    moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: newFile });
                } else {
                    if (target.color !== color) {
                        moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: newFile });
                    }
                    break;
                }
                
                newRank += rankDir;
                newFile += fileDir;
            }
        }
        
        return moves;
    }
    
    getKnightMoves(rank, file, color) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [rankOffset, fileOffset] of knightMoves) {
            const newRank = rank + rankOffset;
            const newFile = file + fileOffset;
            
            if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
                const target = this.board[newRank][newFile];
                if (!target || target.color !== color) {
                    moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: newFile });
                }
            }
        }
        
        return moves;
    }
    
    getBishopMoves(rank, file, color) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (const [rankDir, fileDir] of directions) {
            let newRank = rank + rankDir;
            let newFile = file + fileDir;
            
            while (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
                const target = this.board[newRank][newFile];
                
                if (!target) {
                    moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: newFile });
                } else {
                    if (target.color !== color) {
                        moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: newFile });
                    }
                    break;
                }
                
                newRank += rankDir;
                newFile += fileDir;
            }
        }
        
        return moves;
    }
    
    getQueenMoves(rank, file, color) {
        return [...this.getRookMoves(rank, file, color), ...this.getBishopMoves(rank, file, color)];
    }
    
    getKingMoves(rank, file, color) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [rankOffset, fileOffset] of directions) {
            const newRank = rank + rankOffset;
            const newFile = file + fileOffset;
            
            if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
                const target = this.board[newRank][newFile];
                if (!target || target.color !== color) {
                    moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: newFile });
                }
            }
        }
        
        // Castling
        if (!this.hasKingMoved(color) && !this.isInCheck(color)) {
            // Kingside castling
            if (!this.hasRookMoved(color, 'kingside') && 
                !this.board[rank][5] && !this.board[rank][6] &&
                !this.wouldBeInCheck(rank, file, rank, 5, color) &&
                !this.wouldBeInCheck(rank, file, rank, 6, color)) {
                moves.push({ fromRank: rank, fromFile: file, toRank: rank, toFile: 6 });
            }
            
            // Queenside castling
            if (!this.hasRookMoved(color, 'queenside') && 
                !this.board[rank][1] && !this.board[rank][2] && !this.board[rank][3] &&
                !this.wouldBeInCheck(rank, file, rank, 2, color) &&
                !this.wouldBeInCheck(rank, file, rank, 3, color)) {
                moves.push({ fromRank: rank, fromFile: file, toRank: rank, toFile: 2 });
            }
        }
        
        return moves;
    }
    
    hasKingMoved(color) {
        return this.moveHistory.some(move => 
            move.piece.type === 'k' && move.piece.color === color
        );
    }
    
    hasRookMoved(color, side) {
        const rank = color === 'white' ? 7 : 0;
        const file = side === 'kingside' ? 7 : 0;
        
        return this.moveHistory.some(move => 
            move.piece.type === 'r' && move.piece.color === color &&
            move.fromRank === rank && move.fromFile === file
        );
    }
    
    wouldBeInCheck(fromRank, fromFile, toRank, toFile, color) {
        // Make temporary move
        const originalPiece = this.board[fromRank][fromFile];
        const capturedPiece = this.board[toRank][toFile];
        
        this.board[fromRank][fromFile] = null;
        this.board[toRank][toFile] = originalPiece;
        
        const inCheck = this.isInCheck(color);
        
        // Restore board
        this.board[fromRank][fromFile] = originalPiece;
        this.board[toRank][toFile] = capturedPiece;
        
        return inCheck;
    }
    
    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        
        // Check if any enemy piece can attack the king
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = this.board[rank][file];
                if (piece && piece.color !== color) {
                    const moves = this.getPseudoLegalMoves(rank, file, piece);
                    if (moves.some(move => move.toRank === kingPos.rank && move.toFile === kingPos.file)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    getPseudoLegalMoves(rank, file, piece) {
        // Get moves without checking for checks (to avoid infinite recursion)
        switch (piece.type) {
            case 'p': return this.getPawnAttacks(rank, file, piece.color);
            case 'r': return this.getRookMoves(rank, file, piece.color);
            case 'n': return this.getKnightMoves(rank, file, piece.color);
            case 'b': return this.getBishopMoves(rank, file, piece.color);
            case 'q': return this.getQueenMoves(rank, file, piece.color);
            case 'k': return this.getBasicKingMoves(rank, file, piece.color);
            default: return [];
        }
    }
    
    getPawnAttacks(rank, file, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const newRank = rank + direction;
        
        if (newRank >= 0 && newRank < 8) {
            for (const fileOffset of [-1, 1]) {
                const newFile = file + fileOffset;
                if (newFile >= 0 && newFile < 8) {
                    moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: newFile });
                }
            }
        }
        
        return moves;
    }
    
    getBasicKingMoves(rank, file, color) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [rankOffset, fileOffset] of directions) {
            const newRank = rank + rankOffset;
            const newFile = file + fileOffset;
            
            if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
                moves.push({ fromRank: rank, fromFile: file, toRank: newRank, toFile: newFile });
            }
        }
        
        return moves;
    }
    
    findKing(color) {
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = this.board[rank][file];
                if (piece && piece.type === 'k' && piece.color === color) {
                    return { rank, file };
                }
            }
        }
        return null;
    }
    
    updateGameStatus() {
        // Check for checkmate or stalemate
        const hasLegalMoves = this.hasLegalMoves(this.currentPlayer);
        const inCheck = this.isInCheck(this.currentPlayer);
        
        if (!hasLegalMoves) {
            if (inCheck) {
                this.gameStatus = this.currentPlayer === 'white' ? 'black_wins' : 'white_wins';
            } else {
                this.gameStatus = 'stalemate';
            }
        } else {
            this.gameStatus = 'active';
        }
    }
    
    hasLegalMoves(color) {
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = this.board[rank][file];
                if (piece && piece.color === color) {
                    const moves = this.getLegalMoves(rank, file);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }
    
    undoMove() {
        if (this.moveHistory.length === 0 || this.isThinking) return;
        
        const lastMove = this.moveHistory.pop();
        
        // Restore the piece
        this.board[lastMove.fromRank][lastMove.fromFile] = lastMove.piece;
        this.board[lastMove.toRank][lastMove.toFile] = lastMove.capturedPiece;
        
        // Handle castling undo
        if (lastMove.piece.type === 'k' && Math.abs(lastMove.toFile - lastMove.fromFile) === 2) {
            const rookToFile = lastMove.toFile > lastMove.fromFile ? 7 : 0;
            const rookFromFile = lastMove.toFile > lastMove.fromFile ? 5 : 3;
            
            this.board[lastMove.fromRank][rookToFile] = this.board[lastMove.toRank][rookFromFile];
            this.board[lastMove.toRank][rookFromFile] = null;
        }
        
        // Handle en passant undo
        if (lastMove.piece.type === 'p' && !lastMove.capturedPiece && 
            lastMove.fromFile !== lastMove.toFile) {
            const capturedPawnRank = lastMove.piece.color === 'white' ? lastMove.toRank + 1 : lastMove.toRank - 1;
            this.board[capturedPawnRank][lastMove.toFile] = {
                type: 'p',
                color: lastMove.piece.color === 'white' ? 'black' : 'white'
            };
        }
        
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null;
        this.selectedSquare = null;
        
        // In bot mode, undo bot's move too
        if (this.gameMode === 'bot' && this.currentPlayer === 'black' && this.moveHistory.length > 0) {
            setTimeout(() => this.undoMove(), 100);
        }
        
        this.updateGameStatus();
        this.renderBoard();
        this.updateUI();
    }
    
    flipBoard() {
        this.isFlipped = !this.isFlipped;
        this.renderBoard();
    }
    
    setGameMode(mode) {
        this.gameMode = mode;
        this.newGame();
    }
    
    newGame() {
        this.board = this.createInitialBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameStatus = 'active';
        this.lastMove = null;
        this.isThinking = false;
        
        document.getElementById('thinkingIndicator').classList.remove('active');
        
        this.renderBoard();
        this.updateUI();
    }
    
    updateUI() {
        // Update mode indicator
        document.getElementById('modeIndicator').textContent = 
            this.gameMode === 'bot' ? 'vs Bot' : 'Local 2P';
        
        // Update game status
        let statusText = '';
        let turnText = '';
        
        switch (this.gameStatus) {
            case 'active':
                statusText = 'Game in progress';
                turnText = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} to move`;
                break;
            case 'white_wins':
                statusText = 'White wins by checkmate!';
                turnText = 'Game over';
                break;
            case 'black_wins':
                statusText = 'Black wins by checkmate!';
                turnText = 'Game over';
                break;
            case 'stalemate':
                statusText = 'Game drawn by stalemate';
                turnText = 'Game over';
                break;
        }
        
        document.getElementById('gameStatus').textContent = statusText;
        document.getElementById('turnIndicator').textContent = turnText;
        
        // Update moves list
        this.updateMovesList();
        
        // Update evaluation bar (simple implementation)
        this.updateEvaluationBar();
    }
    
    updateMovesList() {
        const movesListElement = document.getElementById('movesList');
        
        if (this.moveHistory.length === 0) {
            movesListElement.innerHTML = '<div class="info-text">No moves yet</div>';
            return;
        }
        
        let movesHTML = '';
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.moveHistory[i];
            const blackMove = this.moveHistory[i + 1];
            
            const whiteMoveStr = this.moveToString(whiteMove);
            const blackMoveStr = blackMove ? this.moveToString(blackMove) : '';
            
            movesHTML += `
                <div class="move-pair">
                    <span class="move-number">${moveNumber}.</span> 
                    ${whiteMoveStr} ${blackMoveStr}
                </div>
            `;
        }
        
        movesListElement.innerHTML = movesHTML;
        movesListElement.scrollTop = movesListElement.scrollHeight;
    }
    
    moveToString(move) {
        if (!move) return '';
        
        const fromSquare = this.files[move.fromFile] + this.ranks[7 - move.fromRank];
        const toSquare = this.files[move.toFile] + this.ranks[7 - move.toRank];
        
        let moveStr = '';
        
        if (move.piece.type === 'k' && Math.abs(move.toFile - move.fromFile) === 2) {
            // Castling
            moveStr = move.toFile > move.fromFile ? 'O-O' : 'O-O-O';
        } else {
            // Regular move
            if (move.piece.type !== 'p') {
                moveStr += move.piece.type.toUpperCase();
            }
            
            if (move.capturedPiece) {
                if (move.piece.type === 'p') {
                    moveStr += this.files[move.fromFile];
                }
                moveStr += 'x';
            }
            
            moveStr += toSquare;
            
            if (move.promotion) {
                moveStr += '=' + move.promotion.toUpperCase();
            }
        }
        
        return moveStr;
    }
    
    updateEvaluationBar() {
        // Simple material evaluation
        let whiteValue = 0;
        let blackValue = 0;
        
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = this.board[rank][file];
                if (piece) {
                    const value = this.pieceValues[piece.type];
                    if (piece.color === 'white') {
                        whiteValue += value;
                    } else {
                        blackValue += value;
                    }
                }
            }
        }
        
        const totalValue = whiteValue + blackValue;
        const whiteAdvantage = whiteValue - blackValue;
        const normalizedEval = whiteAdvantage / 1000; // Normalize to reasonable range
        
        // Convert to percentage for display
        const percentage = Math.max(0, Math.min(100, 50 + (normalizedEval * 10)));
        
        document.getElementById('evalFill').style.height = `${percentage}%`;
        document.getElementById('evalText').textContent = 
            normalizedEval > 0 ? `+${normalizedEval.toFixed(1)}` : normalizedEval.toFixed(1);
    }
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    window.chessGame = new ChessGame();
});