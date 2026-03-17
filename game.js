class FallingGame {
    constructor() {
        this.gameArea = document.getElementById('game-area');
        this.scoreElement = document.getElementById('score-value');
        this.startBtn = document.getElementById('start-btn');
        
        this.score = 0;
        this.gameRunning = false;
        this.fallingChars = [];
        this.gameSpeed = 2;
        this.spawnRate = 0.02;
        
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
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.gameArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }, { passive: false });
        
        this.gameArea.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.gameRunning) return;
            
            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // 最小スワイプ距離
            const minSwipeDistance = 50;
            
            // 横方向のスワイプが縦方向より大きい場合のみ処理
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // 右スワイプ
                    this.handleSwipe('right');
                } else {
                    // 左スワイプ
                    this.handleSwipe('left');
                }
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
        this.spawnRate = 0.02; // 初期生成率にリセット
        this.updateScore();
        this.startBtn.textContent = 'ゲーム中...';
        this.startBtn.disabled = true;
        
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
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
        const chars = ['左', '右'];
        const colors = ['#000000', '#ff4757']; // 黒と赤
        const char = chars[Math.floor(Math.random() * chars.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // 2列に配置：左列（x=100）と右列（x=250）
        const columns = [100, 250];
        const availableColumns = [];
        
        // 各列の上部（y < 100）に文字があるかチェック
        for (const column of columns) {
            let hasCharInTop = false;
            for (const charObj of this.fallingChars) {
                if (charObj.x === column && charObj.y < 100) {
                    hasCharInTop = true;
                    break;
                }
            }
            if (!hasCharInTop) {
                availableColumns.push(column);
            }
        }
        
        // 利用可能な列がない場合は生成しない
        if (availableColumns.length === 0) {
            return;
        }
        
        const x = availableColumns[Math.floor(Math.random() * availableColumns.length)];
        
        const charElement = document.createElement('div');
        charElement.className = 'falling-char';
        charElement.textContent = char;
        charElement.style.left = x + 'px';
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
    
    handleSwipe(direction) {
        if (!this.gameRunning) return;
        this.processInput(direction);
    }
    
    processInput(direction) {
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
            // 赤文字：位置で判断（左列=100px、右列=250px）
            if ((bottomMostChar.x === 100 && direction === 'left') || 
                (bottomMostChar.x === 250 && direction === 'right')) {
                isCorrectKey = true;
            }
        }
        
        if (isCorrectKey) {
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
        }
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