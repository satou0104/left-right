class FallingGame {
    constructor() {
        this.gameArea = document.getElementById('game-area');
        this.scoreElement = document.getElementById('score-value');
        this.startBtn = document.getElementById('start-btn');
        
        this.score = 0;
        this.gameRunning = false;
        this.fallingChars = [];
        this.gameSpeed = 2;
        this.spawnRate = 0.035;
        this.lastSpawnColumn = null; // 最後に生成した列を記録
        this.columnCooldown = 0; // 列のクールダウン時間
        this.lastSpawnTime = 0; // 最後に文字を生成した時間
        
        this.init();
    }
    
    init() {
        this.startBtn.addEventListener('click', () => this.startGame());
        // iOSでのタッチイベントも追加
        this.startBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.startGame();
        });
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // タッチイベントの追加
        this.setupTouchEvents();
    }
    
    setupTouchEvents() {
        this.gameArea.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.gameRunning) return;
            
            const touch = e.changedTouches[0];
            const rect = this.gameArea.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const gameAreaWidth = this.gameArea.offsetWidth;
            
            // 左半分をタッチした場合は左、右半分をタッチした場合は右
            if (touchX < gameAreaWidth / 2) {
                this.handleTouch('left');
            } else {
                this.handleTouch('right');
            }
        }, { passive: false });
    }
    
    startGame() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.score = 0;
        this.fallingChars = [];
        this.gameArea.innerHTML = '';
        this.gameSpeed = 2; // 初期スピードにリセット
        this.spawnRate = 0.035; // 初期生成率を上げる（テンポアップ）
        this.lastSpawnColumn = null; // リセット
        this.columnCooldown = 0; // リセット
        this.lastSpawnTime = 0; // リセット
        this.updateScore();
        this.startBtn.textContent = 'ゲーム中...';
        this.startBtn.disabled = true;
        
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        // クールダウンを減らす
        if (this.columnCooldown > 0) {
            this.columnCooldown--;
        }
        
        // 新しい文字を生成
        if (Math.random() < this.spawnRate) {
            this.spawnChar();
        }
        
        // 文字を移動
        this.updateChars();
        
        // ゲーム速度を徐々に上げる
        if (this.score > 0 && this.score % 20 === 0) {
            this.gameSpeed = Math.min(this.gameSpeed + 0.05, 5);
            this.spawnRate = Math.min(this.spawnRate + 0.002, 0.05);
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    spawnChar() {
            const currentTime = Date.now();

            // 最後の生成から0.2秒（200ms）経過していない場合は生成しない
            if (currentTime - this.lastSpawnTime < 200) {
                return;
            }

            const chars = ['左', '右'];
            const colors = ['#000000', '#ff4757']; // 黒と赤
            const char = chars[Math.floor(Math.random() * chars.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];

            // ゲームエリアの幅に応じて列の位置を計算（中央線からもう少し離す）
            const gameAreaWidth = this.gameArea.offsetWidth;
            const leftColumn = gameAreaWidth * 0.20; // 左列をもう少し左に（20%）
            const rightColumn = gameAreaWidth * 0.80; // 右列をもう少し右に（80%）
            const columns = [leftColumn, rightColumn];
            const availableColumns = [];

            // 各列の上部で文字の重複をチェック（縦の間隔をもっと空ける）
            for (let i = 0; i < columns.length; i++) {
                const column = columns[i];
                let hasCharInTop = false;
                for (const charObj of this.fallingChars) {
                    // 文字サイズ2個分程度（約200px）の間隔をつける
                    if (Math.abs(charObj.x - column) < 30 && charObj.y < 200) {
                        hasCharInTop = true;
                        break;
                    }
                }
                if (!hasCharInTop) {
                    availableColumns.push({column: column, index: i});
                }
            }

            // 利用可能な列がない場合は生成しない
            if (availableColumns.length === 0) {
                return;
            }

            // 前回と同じ列から生成する場合は、追加の時間制限を設ける
            let selectedColumn;
            if (this.lastSpawnColumn !== null) {
                const timeSinceLastSpawn = currentTime - this.lastSpawnTime;

                // 前回と違う列が利用可能な場合は、そちらを優先
                const otherColumns = availableColumns.filter(col => col.index !== this.lastSpawnColumn);
                if (otherColumns.length > 0) {
                    // 違う列から選択
                    const selectedIndex = Math.floor(Math.random() * otherColumns.length);
                    selectedColumn = otherColumns[selectedIndex];
                } else {
                    // 同じ列しかない場合は、0.5秒以上経過していれば許可
                    if (timeSinceLastSpawn < 500) {
                        return;
                    }
                    selectedColumn = availableColumns[0];
                }
            } else {
                // 初回はランダム選択
                const selectedIndex = Math.floor(Math.random() * availableColumns.length);
                selectedColumn = availableColumns[selectedIndex];
            }

            const x = selectedColumn.column;
            this.lastSpawnColumn = selectedColumn.index;
            this.lastSpawnTime = currentTime; // 生成時間を記録

            const charElement = document.createElement('div');
            charElement.className = 'falling-char';
            charElement.textContent = char;
            // 文字の中央が指定位置になるように調整（iPhone用に位置を修正）
            charElement.style.left = (x - 50) + 'px'; // より大きく左にオフセット
            charElement.style.top = '0px';
            charElement.style.color = color;
            charElement.dataset.char = char;

            this.gameArea.appendChild(charElement);
            this.fallingChars.push({
                element: charElement,
                char: char,
                x: x, // 実際の中央位置を保存
                y: 0,
                matched: false
            });
        }

    
    updateChars() {
        for (let i = this.fallingChars.length - 1; i >= 0; i--) {
            const charObj = this.fallingChars[i];
            charObj.y += this.gameSpeed;
            charObj.element.style.top = charObj.y + 'px';
            
            // 画面下に到達した場合
            if (charObj.y > this.gameArea.offsetHeight) {
                if (!charObj.matched) {
                    this.gameOver();
                    return;
                }
                this.removeChar(i);
            }
        }
    }
    
    handleKeyPress(e) {
        if (!this.gameRunning) return;
        
        let pressedKey = '';
        if (e.key === 'ArrowLeft') {
            pressedKey = 'left';
        } else if (e.key === 'ArrowRight') {
            pressedKey = 'right';
        } else {
            return;
        }
        
        this.processInput(pressedKey);
    }
    
    handleTouch(direction) {
        if (!this.gameRunning) return;
        this.processInput(direction);
    }
    
    processInput(direction) {
        // 画面内の全ての文字から一番下の文字を見つける
        let bottomMostChar = null;
        let bottomMostY = -1;
        
        for (let i = 0; i < this.fallingChars.length; i++) {
            const charObj = this.fallingChars[i];
            if (charObj.matched || charObj.y >= this.gameArea.offsetHeight) continue;
            
            // 画面内で一番下の文字を探す
            if (charObj.y > bottomMostY) {
                bottomMostChar = charObj;
                bottomMostY = charObj.y;
            }
        }
        
        // 一番下の文字が見つからない場合は何もしない
        if (!bottomMostChar) return;
        
        // 一番下の文字が押されたキーに対応するかチェック
        let isCorrectKey = false;
        const isBlack = bottomMostChar.element.style.color === 'rgb(0, 0, 0)' || bottomMostChar.element.style.color === '#000000';
        
        if (isBlack) {
            // 黒文字：文字通り
            if ((bottomMostChar.char === '左' && direction === 'left') || 
                (bottomMostChar.char === '右' && direction === 'right')) {
                isCorrectKey = true;
            }
        } else {
            // 赤文字：位置で判断（左列=20%、右列=80%）
            const gameAreaWidth = this.gameArea.offsetWidth;
            const leftColumn = gameAreaWidth * 0.20;
            const rightColumn = gameAreaWidth * 0.80;
            
            if ((Math.abs(bottomMostChar.x - leftColumn) < 50 && direction === 'left') || 
                (Math.abs(bottomMostChar.x - rightColumn) < 50 && direction === 'right')) {
                isCorrectKey = true;
            }
        }
        
        if (isCorrectKey) {
            // 正解の場合
            bottomMostChar.matched = true;
            const charElement = bottomMostChar.element;
            charElement.style.color = '#2ed573';
            
            // 押されたキーの方向にはけるアニメーション
            const moveDirection = direction === 'left' ? -200 : 200;
            charElement.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            charElement.style.transform = `translateX(${moveDirection}px)`;
            charElement.style.opacity = '0';
            
            this.score++;
            this.updateScore();
        } else {
            // 間違いの場合：ゲームオーバー
            this.gameOver();
        }
    }
    
    removeChar(index) {
        const charObj = this.fallingChars[index];
        this.gameArea.removeChild(charObj.element);
        this.fallingChars.splice(index, 1);
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
    }
    
    gameOver() {
        this.gameRunning = false;
        this.startBtn.textContent = 'もう一度プレイ';
        this.startBtn.disabled = false;
        
        // ゲームオーバー表示
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            font-size: 24px;
            z-index: 10;
        `;
        gameOverDiv.innerHTML = `
            <div>ゲームオーバー!</div>
            <div style="font-size: 18px; margin-top: 10px;">最終スコア: ${this.score}</div>
        `;
        
        this.gameArea.appendChild(gameOverDiv);
        
        // 3秒後にゲームオーバー表示を削除
        setTimeout(() => {
            if (this.gameArea.contains(gameOverDiv)) {
                this.gameArea.removeChild(gameOverDiv);
            }
        }, 3000);
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    new FallingGame();
});