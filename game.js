class FallingGame {
    constructor() {
        this.gameArea = document.getElementById('game-area');
        this.scoreElement = document.getElementById('score-value');
        this.startBtn = document.getElementById('start-btn');
        
        this.score = 0;
        this.gameRunning = false;
        this.fallingChars = [];
        this.gameSpeed = 2;
        this.spawnInterval = null; // setIntervalのID
        this.spawnDelay = 1000; // 初期生成間隔（1秒）
        this.lastSpawnColumn = null;
        this.lastSpawnTime = 0;
        
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
        this.gameSpeed = 2;
        this.spawnDelay = 1000; // 初期生成間隔にリセット
        this.lastSpawnColumn = null;
        this.lastSpawnTime = 0;
        this.updateScore();
        this.startBtn.textContent = 'ゲーム中...';
        this.startBtn.disabled = true;
        
        // 定期的な文字生成を開始
        this.startSpawning();
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        // 文字を移動
        this.updateChars();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    startSpawning() {
        // 既存のインターバルをクリア
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
        }
        
        // 新しいインターバルを設定
        this.spawnInterval = setInterval(() => {
            if (this.gameRunning) {
                // Math.randomで左右を決定
                if (Math.random() < 0.5) {
                    // 左列に落とす
                    this.spawnCharInColumn(0);
                } else {
                    // 右列に落とす
                    this.spawnCharInColumn(1);
                }
            }
        }, this.spawnDelay);
    }
    
    updateSpawnRate() {
        // 20点ごとにスピードアップ
        const level = Math.floor(this.score / 20);
        const newDelay = Math.max(1000 - (level * 100), 300); // 最低0.3秒まで
        
        if (newDelay !== this.spawnDelay) {
            this.spawnDelay = newDelay;
            this.startSpawning(); // インターバルを再設定
        }
        
        // 落下速度も上げる
        this.gameSpeed = Math.min(2 + (level * 0.5), 6);
    }
    
    spawnCharInColumn(columnIndex) {
        const chars = ['左', '右'];
        const colors = ['#000000', '#ff4757']; // 黒と赤
        const char = chars[Math.floor(Math.random() * chars.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // ゲームエリアの幅に応じて列の位置を計算
        const gameAreaWidth = this.gameArea.offsetWidth;
        const leftColumn = gameAreaWidth * 0.25; // 左列を右にずらす（20% → 25%）
        const rightColumn = gameAreaWidth * 0.80;
        const columns = [leftColumn, rightColumn];
        
        const x = columns[columnIndex];
        
        const charElement = document.createElement('div');
        charElement.className = 'falling-char';
        charElement.textContent = char;
        charElement.style.left = (x - 70) + 'px'; // 文字が大きくなったので調整
        charElement.style.top = '0px';
        charElement.style.color = color;
        charElement.dataset.char = char;
        
        this.gameArea.appendChild(charElement);
        this.fallingChars.push({
            element: charElement,
            char: char,
            x: x,
            y: 0,
            matched: false
        });
    }
    
    spawnCharInColumn(columnIndex) {
            const chars = ['左', '右'];
            const colors = ['#000000', '#ff4757']; // 黒と赤
            const char = chars[Math.floor(Math.random() * chars.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];

            // ゲームエリアの幅に応じて列の位置を計算
            const gameAreaWidth = this.gameArea.offsetWidth;
            const leftColumn = gameAreaWidth * 0.20;
            const rightColumn = gameAreaWidth * 0.80;
            const columns = [leftColumn, rightColumn];

            // 指定された列に文字があるかチェック
            const column = columns[columnIndex];
            let hasCharInTop = false;
            for (const charObj of this.fallingChars) {
                if (Math.abs(charObj.x - column) < 30 && charObj.y < 200) {
                    hasCharInTop = true;
                    break;
                }
            }

            // 文字がある場合は生成しない
            if (hasCharInTop) {
                return;
            }

            const x = column;

            const charElement = document.createElement('div');
            charElement.className = 'falling-char';
            charElement.textContent = char;
            charElement.style.left = (x - 50) + 'px';
            charElement.style.top = '0px';
            charElement.style.color = color;
            charElement.dataset.char = char;

            this.gameArea.appendChild(charElement);
            this.fallingChars.push({
                element: charElement,
                char: char,
                x: x,
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
            // 赤文字：位置で判断（左列=25%、右列=80%）
            const gameAreaWidth = this.gameArea.offsetWidth;
            const leftColumn = gameAreaWidth * 0.25;
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
            
            // 正解時の光るエフェクトを追加
            this.showFlashEffect(direction);
            
            // 押されたキーの方向にはけるアニメーション
            const moveDirection = direction === 'left' ? -200 : 200;
            charElement.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            charElement.style.transform = `translateX(${moveDirection}px)`;
            charElement.style.opacity = '0';
            
            this.score++;
            this.updateScore();
            this.updateSpawnRate(); // スコア更新時にスピードチェック
        } else {
            // 間違いの場合：ゲームオーバー
            this.gameOver();
        }
    }
    
    showFlashEffect(direction) {
        // 光るエフェクト要素を作成
        const flashElement = document.createElement('div');
        flashElement.className = direction === 'left' ? 'flash-left' : 'flash-right';
        
        this.gameArea.appendChild(flashElement);
        
        // アニメーション終了後に要素を削除
        setTimeout(() => {
            if (this.gameArea.contains(flashElement)) {
                this.gameArea.removeChild(flashElement);
            }
        }, 300);
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
        
        // インターバルをクリア
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        
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