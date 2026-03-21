class FallingGame {
    constructor() {
        this.gameArea = document.getElementById('game-area');
        this.scoreElement = document.getElementById('score-value');
        this.highscoreElement = document.getElementById('highscore-value');
        this.startBtn = document.getElementById('start-btn');
        
        this.score = 0;
        this.gameRunning = false;
        this.fallingChars = [];
        this.gameSpeed = 2;
        this.spawnInterval = null; // setIntervalのID
        this.spawnDelay = 1000; // 初期生�E間隔�E�E秒！E
        this.lastSpawnColumn = null;
        this.lastSpawnTime = 0;
        this.isHardMode = false; // ハ�Eドモードフラグ
        this.isSuperHardMode = false; // スーパ�Eハ�Eドモードフラグ
        this.currentTab = 'normal'; // ハイスコア画面のタチE
        this.audioContext = null; // Web Audio API用
        
        this.init();
        this.initScreenNavigation();
        this.checkSuperHardUnlock();
    }
    
    // スーパ�Eハ�Eド�EアンロチE��状態をチェチE��
    checkSuperHardUnlock() {
        const hardScores = this.getHighScores('hard');
        const hasUnlocked = hardScores.some(score => score.score >= 140);
        
        const superHardBtn = document.getElementById('start-super-hard-btn');
        const superHardTab = document.getElementById('superhard-tab');
        
        if (hasUnlocked) {
            superHardBtn.classList.remove('hidden');
            superHardTab.classList.remove('hidden');
        } else {
            superHardBtn.classList.add('hidden');
            superHardTab.classList.add('hidden');
        }
    }
    
    // Web Audio APIの初期匁E
    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    // 正解音�E�左右で音を変える！E
    playCorrectSound(direction) {
        if (!this.getSoundEnabled()) return;
        
        this.initAudio();
        
        // 左は低め、右は高め
        const frequency = direction === 'left' ? 400 : 600;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.12);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.12);
    }
    
    // ミス音�E�軽ぁE�EチE��E
    playErrorSound() {
        if (!this.getSoundEnabled()) return;
        
        this.initAudio();
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 400;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    // レベルアチE�E音�E�ピロリロリーン�E�E
    playLevelUpSound() {
        if (!this.getSoundEnabled()) return;
        
        this.initAudio();
        const frequencies = [523, 659, 784, 1047]; // C, E, G, C (髁E
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const startTime = this.audioContext.currentTime + (index * 0.1);
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.15);
        });
    }
    
    // 音のON/OFF設定を取征E
    getSoundEnabled() {
        const enabled = localStorage.getItem('soundEnabled');
        return enabled === null ? true : enabled === 'true';
    }
    
    // 音のON/OFF設定を保孁E
    setSoundEnabled(enabled) {
        localStorage.setItem('soundEnabled', enabled);
    }
    
    // 設定画面を読み込む
    loadSettings() {
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.checked = this.getSoundEnabled();
    }
    
    init() {
        this.startBtn.addEventListener('click', () => this.startGame());
        // iOSでのタチE��イベントも追加
        this.startBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.startGame();
        });
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // タチE��イベント�E追加
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
            
            // 左半�EをタチE��した場合�E左、右半�EをタチE��した場合�E右
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
        
        // モードに応じて初期速度を設宁E
        if (this.isSuperHardMode) {
            this.gameSpeed = 7; // スーパ�Eハ�Eド�E速めにスターチE
        } else {
            this.gameSpeed = 3; // ノ�Eマル・ハ�Eド�E3
        }
        
        // モードに応じて初期生�E間隔を設宁E
        if (this.isSuperHardMode) {
            this.spawnDelay = 300; // スーパ�Eハ�EチE 0.3秒かめE
        } else if (this.isHardMode) {
            this.spawnDelay = 500; // ハ�EチE 0.5秒かめE
        } else {
            this.spawnDelay = 1000; // ノ�Eマル: 1秒かめE
        }
        
        this.lastSpawnColumn = null;
        this.lastSpawnTime = 0;
        this.updateScore();
        this.updateHighScore();
        this.startBtn.textContent = 'ゲーム中...';
        this.startBtn.disabled = true;
        
        // ハ�Eドモード�E場合�E外枠の背景色を変更
        const gameContainer = document.getElementById('game-container');
        if (this.isSuperHardMode) {
            gameContainer.style.background = 'rgba(60, 0, 20, 0.8)'; // スーパ�Eハ�Eド�E濁E��赤
        } else if (this.isHardMode) {
            gameContainer.style.background = 'rgba(40, 0, 0, 0.8)';
        } else {
            gameContainer.style.background = 'rgba(0, 0, 0, 0.8)';
        }
        
        // 定期皁E��斁E��生成を開姁E
        this.startSpawning();
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        // 斁E��を移勁E
        this.updateChars();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    startSpawning() {
        // 既存�Eインターバルをクリア
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
        }
        
        // 新しいインターバルを設宁E
        this.spawnInterval = setInterval(() => {
            if (this.gameRunning) {
                // Math.randomで左右を決宁E
                if (Math.random() < 0.5) {
                    // 左列に落とぁE
                    this.spawnCharInColumn(0);
                } else {
                    // 右列に落とぁE
                    this.spawnCharInColumn(1);
                }
            }
        }, this.spawnDelay);
    }
    
    updateSpawnRate() {
        if (this.isSuperHardMode) {
            // スーパ�Eハ�EドモーチE レベル7スターチE
            const level = Math.floor(this.score / 20) + 7; // レベル7から開姁E
            let newDelay;
            
            if (this.score >= 180) {
                newDelay = 50; // レベル15: 0.05私E
            } else if (this.score >= 160) {
                newDelay = 70; // レベル14: 0.07私E
            } else if (this.score >= 140) {
                newDelay = 90; // レベル13: 0.09私E
            } else if (this.score >= 120) {
                newDelay = 110; // レベル12: 0.11私E
            } else if (this.score >= 100) {
                newDelay = 130; // レベル11: 0.13私E
            } else if (this.score >= 80) {
                newDelay = 150; // レベル10: 0.15私E
            } else if (this.score >= 60) {
                newDelay = 200; // レベル9: 0.2私E
            } else if (this.score >= 40) {
                newDelay = 250; // レベル8: 0.25私E
            } else {
                newDelay = 300; // レベル7: 0.3私E
            }
            
            if (newDelay !== this.spawnDelay) {
                this.spawnDelay = newDelay;
                this.startSpawning();
            }
            
            // 落下速度も上げめE
            this.gameSpeed = Math.min(3 + (level * 0.7), 12);
        } else if (this.isHardMode) {
            // ハ�EドモーチE より細かいレベル設宁E
            const level = Math.floor(this.score / 20);
            let newDelay;
            
            if (this.score >= 200) {
                newDelay = 150; // レベル10: 0.15私E
            } else if (this.score >= 180) {
                newDelay = 200; // レベル9: 0.2私E
            } else if (this.score >= 160) {
                newDelay = 250; // レベル8: 0.25私E
            } else if (this.score >= 140) {
                newDelay = 300; // レベル7: 0.3私E
            } else if (this.score >= 120) {
                newDelay = 400; // レベル6: 0.4私E
            } else if (this.score >= 100) {
                newDelay = 500; // レベル5: 0.5私E
            } else {
                newDelay = Math.max(500 - (level * 50), 500); // 0-99点は0.5秒固宁E
            }
            
            if (newDelay !== this.spawnDelay) {
                this.spawnDelay = newDelay;
                this.startSpawning();
            }
            
            // 落下速度も上げる（�E朁E + レベルごとに0.6、最大10�E�E
            this.gameSpeed = Math.min(3 + (level * 0.6), 10);
        } else {
            // ノ�EマルモーチE 20点ごとにスピ�EドアチE�E
            const level = Math.floor(this.score / 20);
            const newDelay = Math.max(1000 - (level * 100), 300); // 最佁E.3秒まで
            
            if (newDelay !== this.spawnDelay) {
                this.spawnDelay = newDelay;
                this.startSpawning(); // インターバルを�E設宁E
            }
            
            // 落下速度も上げる（�E朁E + レベルごとに0.5、最大8�E�E
            this.gameSpeed = Math.min(3 + (level * 0.5), 8);
        }
    }
    
    spawnCharInColumn(columnIndex) {
        const chars = ['左', '右'];
        const colors = ['#000000', '#ff4757']; // 黒と赤
        const char = chars[Math.floor(Math.random() * chars.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // ゲームエリアの幁E��応じて列�E位置を計箁E
        // 真ん中の線！E0%�E�を基準に、左列�E25%、右列�E75%
        const gameAreaWidth = this.gameArea.offsetWidth;
        const leftColumn = gameAreaWidth * 0.25;  // 左列�E中忁E
        const rightColumn = gameAreaWidth * 0.75; // 右列�E中忁E
        const columns = [leftColumn, rightColumn];

        const x = columns[columnIndex];
        
        // 同じ列�E上部�E�E00px以冁E��に斁E��があるかチェチE��
        const hasCharInTop = this.fallingChars.some(charObj => {
            return Math.abs(charObj.x - x) < 50 && charObj.y < 200;
        });
        
        // 上部に斁E��がある場合�E生�EしなぁE
        if (hasCharInTop) {
            return;
        }

        const charElement = document.createElement('div');
        charElement.className = 'falling-char';
        charElement.textContent = char;
        charElement.style.left = x + 'px'; // 列�E中忁E��置
        charElement.style.top = '0px';
        charElement.style.color = color;
        charElement.dataset.char = char;
        charElement.style.transform = 'translateX(-50%)'; // 斁E���E体を中央揁E��

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
            
            // 画面下に到達した場吁E
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
        // 画面冁E�E全ての斁E��から一番下�E斁E��を見つける
        let bottomMostChar = null;
        let bottomMostY = -1;
        
        for (let i = 0; i < this.fallingChars.length; i++) {
            const charObj = this.fallingChars[i];
            if (charObj.matched || charObj.y >= this.gameArea.offsetHeight) continue;
            
            // 画面冁E��一番下�E斁E��を探ぁE
            if (charObj.y > bottomMostY) {
                bottomMostChar = charObj;
                bottomMostY = charObj.y;
            }
        }
        
        // 一番下�E斁E��が見つからなぁE��合�E何もしなぁE
        if (!bottomMostChar) return;
        
        // 一番下�E斁E��が押されたキーに対応するかチェチE��
        let isCorrectKey = false;
        const isBlack = bottomMostChar.element.style.color === 'rgb(0, 0, 0)' || bottomMostChar.element.style.color === '#000000';
        
        if (isBlack) {
            // 黒文字：文字通り
            if ((bottomMostChar.char === '左' && direction === 'left') || 
                (bottomMostChar.char === '右' && direction === 'right')) {
                isCorrectKey = true;
            }
        } else {
            // 赤斁E��：位置で判断�E�左刁E25%、右刁E75%�E�E
            const gameAreaWidth = this.gameArea.offsetWidth;
            const leftColumn = gameAreaWidth * 0.25;
            const rightColumn = gameAreaWidth * 0.75;
            
            if ((Math.abs(bottomMostChar.x - leftColumn) < 50 && direction === 'left') || 
                (Math.abs(bottomMostChar.x - rightColumn) < 50 && direction === 'right')) {
                isCorrectKey = true;
            }
        }
        
        if (isCorrectKey) {
            // 正解の場吁E
            bottomMostChar.matched = true;
            const charElement = bottomMostChar.element;
            charElement.style.color = '#2ed573';
            
            // 正解音を�E甁E
            this.playCorrectSound();
            
            // 正解時�E光るエフェクトを追加
            this.showFlashEffect(direction);
            
            // 押されたキーの方向にはけるアニメーション
            const moveDirection = direction === 'left' ? -200 : 200;
            charElement.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            charElement.style.transform = `translateX(calc(-50% + ${moveDirection}px))`;
            charElement.style.opacity = '0';
            
            const previousScore = this.score;
            this.score++;
            this.updateScore();
            
            // レベルアチE�E時�E音
            if (Math.floor(this.score / 20) > Math.floor(previousScore / 20)) {
                this.playLevelUpSound();
            }
            
            this.updateSpawnRate(); // スコア更新時にスピ�EドチェチE��
        } else {
            // 間違ぁE�E場合：ゲームオーバ�E
            this.gameOver();
        }
    }
    
    showFlashEffect(direction) {
        // 光るエフェクト要素を作�E
        const flashElement = document.createElement('div');
        flashElement.className = direction === 'left' ? 'flash-left' : 'flash-right';
        
        this.gameArea.appendChild(flashElement);
        
        // アニメーション終亁E��に要素を削除
        setTimeout(() => {
            if (this.gameArea.contains(flashElement)) {
                this.gameArea.removeChild(flashElement);
            }
        }, 300);
    }
    
    initScreenNavigation() {
        // メニューボタンのイベントリスナ�E
        const startMenuBtn = document.getElementById('start-menu-btn');
        const startHardBtn = document.getElementById('start-hard-btn');
        const highscoreBtn = document.getElementById('highscore-btn');
        const instructionsBtn = document.getElementById('instructions-btn');
        const settingsBtn = document.getElementById('settings-btn');
        
        // クリチE��とタチE��イベント�E両方を追加
        startMenuBtn.addEventListener('click', () => {
            this.isHardMode = false;
            this.isSuperHardMode = false;
            this.showScreen('game-screen');
            this.updateHighScore();
        });
        startMenuBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isHardMode = false;
            this.isSuperHardMode = false;
            this.showScreen('game-screen');
            this.updateHighScore();
        });
        
        startHardBtn.addEventListener('click', () => {
            this.isHardMode = true;
            this.isSuperHardMode = false;
            this.showScreen('game-screen');
            this.updateHighScore();
        });
        startHardBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isHardMode = true;
            this.isSuperHardMode = false;
            this.showScreen('game-screen');
            this.updateHighScore();
        });
        
        const startSuperHardBtn = document.getElementById('start-super-hard-btn');
        startSuperHardBtn.addEventListener('click', () => {
            this.isHardMode = false;
            this.isSuperHardMode = true;
            this.showScreen('game-screen');
            this.updateHighScore();
        });
        startSuperHardBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isHardMode = false;
            this.isSuperHardMode = true;
            this.showScreen('game-screen');
            this.updateHighScore();
        });
        
        highscoreBtn.addEventListener('click', () => {
            this.showScreen('highscore-screen');
            this.displayHighScores();
        });
        highscoreBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('highscore-screen');
            this.displayHighScores();
        });
        
        instructionsBtn.addEventListener('click', () => {
            this.showScreen('instructions-screen');
        });
        instructionsBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('instructions-screen');
        });
        
        settingsBtn.addEventListener('click', () => {
            this.showScreen('settings-screen');
        });
        settingsBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('settings-screen');
            this.loadSettings();
        });
        
        // 設定�EトグルスイチE��
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.addEventListener('change', (e) => {
            this.setSoundEnabled(e.target.checked);
        });
        
        // ハイスコアタブ�Eイベントリスナ�E
        const normalTab = document.getElementById('normal-tab');
        const hardTab = document.getElementById('hard-tab');
        
        normalTab.addEventListener('click', () => {
            this.currentTab = 'normal';
            normalTab.classList.add('active');
            hardTab.classList.remove('active');
            document.getElementById('superhard-tab').classList.remove('active');
            this.displayHighScores();
        });
        normalTab.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.currentTab = 'normal';
            normalTab.classList.add('active');
            hardTab.classList.remove('active');
            document.getElementById('superhard-tab').classList.remove('active');
            this.displayHighScores();
        });
        
        hardTab.addEventListener('click', () => {
            this.currentTab = 'hard';
            hardTab.classList.add('active');
            normalTab.classList.remove('active');
            document.getElementById('superhard-tab').classList.remove('active');
            this.displayHighScores();
        });
        hardTab.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.currentTab = 'hard';
            hardTab.classList.add('active');
            normalTab.classList.remove('active');
            document.getElementById('superhard-tab').classList.remove('active');
            this.displayHighScores();
        });
        
        const superHardTab = document.getElementById('superhard-tab');
        superHardTab.addEventListener('click', () => {
            this.currentTab = 'superhard';
            superHardTab.classList.add('active');
            normalTab.classList.remove('active');
            hardTab.classList.remove('active');
            this.displayHighScores();
        });
        superHardTab.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.currentTab = 'superhard';
            superHardTab.classList.add('active');
            normalTab.classList.remove('active');
            hardTab.classList.remove('active');
            this.displayHighScores();
        });
        
        // 戻る�Eタンのイベントリスナ�E
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        const backFromInstructionsBtn = document.getElementById('back-from-instructions-btn');
        const backFromSettingsBtn = document.getElementById('back-from-settings-btn');
        const backFromHighscoreBtn = document.getElementById('back-from-highscore-btn');
        
        backToMenuBtn.addEventListener('click', () => {
            this.showScreen('main-menu');
            this.resetGame();
        });
        backToMenuBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('main-menu');
            this.resetGame();
        });
        
        backFromInstructionsBtn.addEventListener('click', () => {
            this.showScreen('main-menu');
        });
        backFromInstructionsBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('main-menu');
        });
        
        backFromSettingsBtn.addEventListener('click', () => {
            this.showScreen('main-menu');
        });
        backFromSettingsBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('main-menu');
        });
        
        backFromHighscoreBtn.addEventListener('click', () => {
            this.showScreen('main-menu');
        });
        backFromHighscoreBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('main-menu');
        });
    }
    
    showScreen(screenId) {
        // すべての画面を非表示
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.add('hidden'));
        
        // 持E��された画面を表示
        document.getElementById(screenId).classList.remove('hidden');
    }
    
    resetGame() {
        // ゲームをリセチE��
        this.gameRunning = false;
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        this.score = 0;
        this.fallingChars = [];
        this.gameArea.innerHTML = '';
        
        // 背景色をノーマルに戻ぁE
        this.gameArea.style.background = 'linear-gradient(180deg, #f0f8ff 0%, #e6f3ff 50%, #d9ecff 100%)';
        
        this.updateScore();
        this.startBtn.textContent = 'ゲーム開姁E;
        this.startBtn.disabled = false;
    }
    
    removeChar(index) {
        const charObj = this.fallingChars[index];
        this.gameArea.removeChild(charObj.element);
        this.fallingChars.splice(index, 1);
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
    }
    
    updateHighScore() {
        const mode = this.isSuperHardMode ? 'superhard' : (this.isHardMode ? 'hard' : 'normal');
        const scores = this.getHighScores(mode);
        const topScore = scores.length > 0 ? scores[0].score : 0;
        this.highscoreElement.textContent = topScore;
    }
    
    gameOver() {
        this.gameRunning = false;
        
        // ミス音を�E甁E
        this.playErrorSound();
        
        // インターバルをクリア
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        
        // ハイスコアを保孁E
        this.saveHighScore(this.score);
        
        this.startBtn.textContent = 'リトライ';
        this.startBtn.disabled = false;
        
        // ゲームオーバ�E表示
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 30px 40px;
            border-radius: 10px;
            text-align: center;
            z-index: 10;
            border: 2px solid #00ffff;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        `;
        gameOverDiv.innerHTML = `
            <div style="font-size: 28px; font-weight: 700; color: #00ffff; text-shadow: 0 0 10px #00ffff; margin-bottom: 15px; white-space: nowrap;">ゲームオーバ�E</div>
            <div style="font-size: 20px; margin-top: 10px;">最終スコア: ${this.score}</div>
        `;
        
        this.gameArea.appendChild(gameOverDiv);
        
        // 3秒後にゲームオーバ�E表示を削除
        setTimeout(() => {
            if (this.gameArea.contains(gameOverDiv)) {
                this.gameArea.removeChild(gameOverDiv);
            }
        }, 3000);
    }
    
    saveHighScore(score) {
        const mode = this.isSuperHardMode ? 'superhard' : (this.isHardMode ? 'hard' : 'normal');
        const key = `highscores_${mode}`;
        
        // 既存�Eハイスコアを取征E
        let highscores = JSON.parse(localStorage.getItem(key) || '[]');
        
        // 新しいスコアを追加
        highscores.push({
            score: score,
            date: new Date().toISOString()
        });
        
        // スコアでソート（降頁E��E
        highscores.sort((a, b) => b.score - a.score);
        
        // トッチE0のみ保持
        highscores = highscores.slice(0, 10);
        
        // 保孁E
        localStorage.setItem(key, JSON.stringify(highscores));
        
        // スーパ�Eハ�Eド�EアンロチE��状態を更新
        this.checkSuperHardUnlock();
    }
    
    getHighScores(mode) {
        const key = `highscores_${mode}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    }
    
    displayHighScores() {
        const highscoreList = document.getElementById('highscore-list');
        const scores = this.getHighScores(this.currentTab);
        
        if (scores.length === 0) {
            highscoreList.innerHTML = '<p class="no-scores">まだスコアがありません</p>';
            return;
        }
        
        let html = '<ol class="score-list">';
        scores.forEach((item, index) => {
            html += `
                <li class="score-item">
                    <span class="rank">${index + 1}</span>
                    <span class="score-value">${item.score}点</span>
                </li>
            `;
        });
        html += '</ol>';
        
        highscoreList.innerHTML = html;
    }
}

// ゲーム開姁E
window.addEventListener('DOMContentLoaded', () => {
    new FallingGame();
});
