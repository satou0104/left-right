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
        this.spawnDelay = 1000; // 初期生成間隔（1秒）
        this.lastSpawnColumn = null;
        this.lastSpawnTime = 0;
        this.isHardMode = false; // ハードモードフラグ
        this.isSuperHardMode = false; // スーパーハードモードフラグ
        this.currentTab = 'normal'; // ハイスコア画面のタブ
        this.currentRankingTab = 'local'; // ランキングタブ（local/global）
        this.audioContext = null; // Web Audio API用
        this.credits = this.loadCredits(); // クレジット数
        this.bgmAudio = null; // BGM用のAudioオブジェクト
        this.bgmEnabled = true; // BGMの有効/無効
        
        this.init();
        this.initScreenNavigation();
        this.checkSuperHardUnlock();
        this.initRankingName(); // ランキング名の初期化
        this.updateCreditDisplay(); // クレジット表示を更新
        this.initBGM(); // BGMの初期化
    }
    
    // スーパーハードのアンロック状態をチェック
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
    
    // Web Audio APIの初期化
    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    // 正解音（左右で音を変える）
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
    
    // ミス音（軽いポッ）
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
    
    // レベルアップ音（ピロリロリーン）
    playLevelUpSound() {
        if (!this.getSoundEnabled()) return;
        
        this.initAudio();
        const frequencies = [523, 659, 784, 1047]; // C, E, G, C (高)
        
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
    
    // 音のON/OFF設定を取得
    getSoundEnabled() {
        const enabled = localStorage.getItem('soundEnabled');
        return enabled === null ? true : enabled === 'true';
    }
    
    // 音のON/OFF設定を保存
    setSoundEnabled(enabled) {
        localStorage.setItem('soundEnabled', enabled);
    }
    
    // 設定画面を読み込む
    loadSettings() {
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.checked = this.getSoundEnabled();
        
        const bgmToggle = document.getElementById('bgm-toggle');
        bgmToggle.checked = this.getBGMEnabled();
    }
    
    // BGMの初期化
    initBGM() {
        this.bgmAudio = new Audio('bgm.mp3');
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.3; // 音量を30%に設定
        
        // localStorageからBGM設定を読み込む
        const savedBGM = localStorage.getItem('bgmEnabled');
        this.bgmEnabled = savedBGM === null ? true : savedBGM === 'true';
        
        // BGMトグルのイベントリスナー
        const bgmToggle = document.getElementById('bgm-toggle');
        if (bgmToggle) {
            bgmToggle.addEventListener('change', (e) => {
                this.setBGMEnabled(e.target.checked);
            });
        }
        
        // ユーザーの最初のクリックでAudioContextを有効化
        const enableAudio = () => {
            if (this.bgmAudio && this.bgmAudio.paused) {
                // 一度再生を試みる（自動再生ポリシー対策）
                this.bgmAudio.play().then(() => {
                    this.bgmAudio.pause();
                    this.bgmAudio.currentTime = 0;
                }).catch(err => {
                    console.log('BGM初期化:', err);
                });
            }
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchend', enableAudio);
        };
        
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchend', enableAudio, { once: true });
    }
    
    // BGMの有効/無効を取得
    getBGMEnabled() {
        return this.bgmEnabled;
    }
    
    // BGMの有効/無効を設定
    setBGMEnabled(enabled) {
        this.bgmEnabled = enabled;
        localStorage.setItem('bgmEnabled', enabled);
        
        if (enabled && this.gameRunning) {
            this.playBGM();
        } else {
            this.stopBGM();
        }
    }
    
    // BGMを再生
    playBGM() {
        if (this.bgmEnabled && this.bgmAudio) {
            const playPromise = this.bgmAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('BGM再生開始');
                }).catch(err => {
                    console.log('BGM再生エラー:', err);
                    // 自動再生がブロックされた場合、次のユーザー操作で再試行
                    const retryPlay = () => {
                        this.playBGM();
                        document.removeEventListener('click', retryPlay);
                        document.removeEventListener('touchend', retryPlay);
                    };
                    document.addEventListener('click', retryPlay, { once: true });
                    document.addEventListener('touchend', retryPlay, { once: true });
                });
            }
        }
    }
    
    // BGMを停止
    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
        }
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
    
    // ランキング名の初期化（イベントリスナーのみ設定）
    initRankingName() {
        const rankingNameInput = document.getElementById('ranking-name-input');
        const saveNameBtn = document.getElementById('save-name-btn');
        
        // 保存ボタンクリック時
        saveNameBtn.addEventListener('click', () => {
            const name = rankingNameInput.value.trim() || 'aaa';
            localStorage.setItem('rankingName', name);
            this.showToast('保存しました', 'info');
        });
        
        // タッチイベントも追加（iOS対応）
        saveNameBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            const name = rankingNameInput.value.trim() || 'aaa';
            localStorage.setItem('rankingName', name);
            this.showToast('保存しました', 'info');
        });
    }
    
    // ランキング名を読み込む（設定画面を開くたびに呼ばれる）
    loadRankingName() {
        const rankingNameInput = document.getElementById('ranking-name-input');
        const savedName = localStorage.getItem('rankingName') || 'aaa';
        rankingNameInput.value = savedName;
    }
    
    // ランキング名を取得
    getRankingName() {
        return localStorage.getItem('rankingName') || 'aaa';
    }
    
    // クレジットを読み込む
    loadCredits() {
        // 最後にクレジットを保存した日付を取得
        const lastDate = localStorage.getItem('lastCreditDate');
        const today = this.getTodayDate();
        
        // 日付が変わっていたらクレジットをリセット
        if (lastDate !== today) {
            localStorage.setItem('lastCreditDate', today);
            localStorage.setItem('gameCredits', '10');
            return 10;
        }
        
        const saved = localStorage.getItem('gameCredits');
        return saved ? parseInt(saved) : 10;
    }
    
    // クレジットを保存
    saveCredits() {
        localStorage.setItem('gameCredits', this.credits.toString());
        // 保存時に日付も更新
        localStorage.setItem('lastCreditDate', this.getTodayDate());
    }
    
    // クレジット表示を更新
    updateCreditDisplay() {
        document.getElementById('credit-value').textContent = this.credits;
    }
    
    // クレジットを消費
    useCredit() {
        if (this.credits > 0) {
            this.credits--;
            this.saveCredits();
            this.updateCreditDisplay();
            return true;
        }
        return false;
    }
    
    // クレジットを回復（広告視聴後）
    restoreCredits() {
        this.credits = 10;
        this.saveCredits();
        this.updateCreditDisplay();
    }
    
    // クレジットが0かチェック
    hasCredits() {
        return this.credits > 0;
    }
    
    // 広告視聴プロンプトを表示
    showAdPrompt() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
        `;
        
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #00ffff;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            max-width: 350px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        `;
        
        popup.innerHTML = `
            <h2 style="color: #00ffff; font-size: 24px; margin-bottom: 20px; text-shadow: 0 0 10px #00ffff;">クレジット不足</h2>
            <p style="color: #ffffff; font-size: 16px; margin-bottom: 25px;">広告を視聴してクレジットを回復しますか？</p>
            <button id="watch-ad-btn" style="
                width: 100%;
                padding: 15px;
                font-size: 18px;
                font-weight: 700;
                background: #00ffff;
                color: #000;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                margin-bottom: 10px;
                transition: all 0.3s;
            ">広告を見る（クレジット10回復）</button>
            <button id="cancel-ad-btn" style="
                width: 100%;
                padding: 15px;
                font-size: 16px;
                font-weight: 700;
                background: transparent;
                color: #ffffff;
                border: 2px solid #666;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            ">キャンセル</button>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        // 広告を見るボタン
        document.getElementById('watch-ad-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.showRewardedAd();
        });
        
        // キャンセルボタン
        document.getElementById('cancel-ad-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }
    
    // リワード広告を表示（AdMobと連携）
    async showRewardedAd() {
        try {
            // Capacitorプラグインが利用可能かチェック
            if (typeof window.Capacitor === 'undefined' || !window.Capacitor.Plugins.AdMob) {
                console.log('AdMob plugin not available, using test mode');
                this.showToast('クレジットを回復しました', 'info');
                this.restoreCredits();
                return;
            }
            
            const { AdMob } = window.Capacitor.Plugins;
            
            // AdMobを初期化
            await AdMob.initialize();
            
            // リワード広告を準備
            await AdMob.prepareRewardVideoAd({
                adId: 'ca-app-pub-8707369701475326/7758538922'
            });
            
            // 広告を表示
            await AdMob.showRewardVideoAd();
            
            // 広告視聴完了
            this.showToast('クレジットを回復しました', 'info');
            this.restoreCredits();
            
        } catch (error) {
            console.error('AdMob error:', error);
            // エラー時もクレジット回復（ユーザー体験を優先）
            this.showToast('クレジットを回復しました', 'info');
            this.restoreCredits();
        }
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
        
        // クレジットチェック
        if (!this.hasCredits()) {
            this.showAdPrompt();
            return;
        }
        
        // クレジットを消費
        this.useCredit();
        
        this.gameRunning = true;
        this.score = 0;
        this.fallingChars = [];
        
        // game-areaをクリア
        this.gameArea.innerHTML = '';
        
        // モードに応じて初期速度を設定
        if (this.isSuperHardMode) {
            this.gameSpeed = 7; // スーパーハードは速めにスタート
        } else {
            this.gameSpeed = 3; // ノーマル・ハードは3
        }
        
        // モードに応じて初期生成間隔を設定
        if (this.isSuperHardMode) {
            this.spawnDelay = 300; // スーパーハード: 0.3秒から
        } else if (this.isHardMode) {
            this.spawnDelay = 500; // ハード: 0.5秒から
        } else {
            this.spawnDelay = 1000; // ノーマル: 1秒から
        }
        
        this.lastSpawnColumn = null;
        this.lastSpawnTime = 0;
        this.updateScore();
        this.updateHighScore();
        this.startBtn.textContent = 'ゲーム中...';
        this.startBtn.disabled = true;
        
        // ハードモードの場合は外枠の背景色を変更
        const gameContainer = document.getElementById('game-container');
        if (this.isSuperHardMode) {
            gameContainer.style.background = 'rgba(60, 0, 20, 0.8)'; // スーパーハードは濃い赤
        } else if (this.isHardMode) {
            gameContainer.style.background = 'rgba(40, 0, 0, 0.8)';
        } else {
            gameContainer.style.background = 'rgba(0, 0, 0, 0.8)';
        }
        
        // 定期的な文字生成を開始
        this.startSpawning();
        this.gameLoop();
        
        // BGMを再生
        this.playBGM();
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
        if (this.isSuperHardMode) {
            // スーパーハードモード: レベル7スタート
            const level = Math.floor(this.score / 20) + 7; // レベル7から開始
            let newDelay;
            
            if (this.score >= 180) {
                newDelay = 50; // レベル15: 0.05秒
            } else if (this.score >= 160) {
                newDelay = 70; // レベル14: 0.07秒
            } else if (this.score >= 140) {
                newDelay = 90; // レベル13: 0.09秒
            } else if (this.score >= 120) {
                newDelay = 110; // レベル12: 0.11秒
            } else if (this.score >= 100) {
                newDelay = 130; // レベル11: 0.13秒
            } else if (this.score >= 80) {
                newDelay = 150; // レベル10: 0.15秒
            } else if (this.score >= 60) {
                newDelay = 200; // レベル9: 0.2秒
            } else if (this.score >= 40) {
                newDelay = 250; // レベル8: 0.25秒
            } else {
                newDelay = 300; // レベル7: 0.3秒
            }
            
            if (newDelay !== this.spawnDelay) {
                this.spawnDelay = newDelay;
                this.startSpawning();
            }
            
            // 落下速度も上げる
            this.gameSpeed = Math.min(3 + (level * 0.7), 12);
        } else if (this.isHardMode) {
            // ハードモード: より細かいレベル設定
            const level = Math.floor(this.score / 20);
            let newDelay;
            
            if (this.score >= 200) {
                newDelay = 150; // レベル10: 0.15秒
            } else if (this.score >= 180) {
                newDelay = 200; // レベル9: 0.2秒
            } else if (this.score >= 160) {
                newDelay = 250; // レベル8: 0.25秒
            } else if (this.score >= 140) {
                newDelay = 300; // レベル7: 0.3秒
            } else if (this.score >= 120) {
                newDelay = 400; // レベル6: 0.4秒
            } else if (this.score >= 100) {
                newDelay = 500; // レベル5: 0.5秒
            } else {
                newDelay = Math.max(500 - (level * 50), 500); // 0-99点は0.5秒固定
            }
            
            if (newDelay !== this.spawnDelay) {
                this.spawnDelay = newDelay;
                this.startSpawning();
            }
            
            // 落下速度も上げる（初期3 + レベルごとに0.6、最大10）
            this.gameSpeed = Math.min(3 + (level * 0.6), 10);
        } else {
            // ノーマルモード: 20点ごとにスピードアップ
            const level = Math.floor(this.score / 20);
            const newDelay = Math.max(1000 - (level * 100), 300); // 最低0.3秒まで
            
            if (newDelay !== this.spawnDelay) {
                this.spawnDelay = newDelay;
                this.startSpawning(); // インターバルを再設定
            }
            
            // 落下速度も上げる（初期3 + レベルごとに0.5、最大8）
            this.gameSpeed = Math.min(3 + (level * 0.5), 8);
        }
    }
    
    spawnCharInColumn(columnIndex) {
        const chars = ['左', '右'];
        const colors = ['#000000', '#ff4757']; // 黒と赤
        const char = chars[Math.floor(Math.random() * chars.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // ゲームエリアの幅に応じて列の位置を計算
        // 真ん中の線（50%）を基準に、左列は25%、右列は75%
        const gameAreaWidth = this.gameArea.offsetWidth;
        const leftColumn = gameAreaWidth * 0.25;  // 左列の中心
        const rightColumn = gameAreaWidth * 0.75; // 右列の中心
        const columns = [leftColumn, rightColumn];

        const x = columns[columnIndex];
        
        // 同じ列の上部（200px以内）に文字があるかチェック
        const hasCharInTop = this.fallingChars.some(charObj => {
            return Math.abs(charObj.x - x) < 50 && charObj.y < 200;
        });
        
        // 上部に文字がある場合は生成しない
        if (hasCharInTop) {
            return;
        }

        const charElement = document.createElement('div');
        charElement.className = 'falling-char';
        charElement.textContent = char;
        charElement.style.left = x + 'px'; // 列の中心位置
        charElement.style.top = '0px';
        charElement.style.color = color;
        charElement.dataset.char = char;
        charElement.style.transform = 'translateX(-50%)'; // 文字自体を中央揃え

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
            // 赤文字：位置で判断（左列=25%、右列=75%）
            const gameAreaWidth = this.gameArea.offsetWidth;
            const leftColumn = gameAreaWidth * 0.25;
            const rightColumn = gameAreaWidth * 0.75;
            
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
            
            // 正解音を再生
            this.playCorrectSound();
            
            // 正解時の光るエフェクトを追加
            this.showFlashEffect(direction);
            
            // 押されたキーの方向にはけるアニメーション
            const moveDirection = direction === 'left' ? -200 : 200;
            charElement.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            charElement.style.transform = `translateX(calc(-50% + ${moveDirection}px))`;
            charElement.style.opacity = '0';
            
            const previousScore = this.score;
            this.score++;
            this.updateScore();
            
            // レベルアップ時の音
            if (Math.floor(this.score / 20) > Math.floor(previousScore / 20)) {
                this.playLevelUpSound();
            }
            
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
    
    initScreenNavigation() {
        // メニューボタンのイベントリスナー
        const startMenuBtn = document.getElementById('start-menu-btn');
        const startHardBtn = document.getElementById('start-hard-btn');
        const highscoreBtn = document.getElementById('highscore-btn');
        const instructionsBtn = document.getElementById('instructions-btn');
        const settingsBtn = document.getElementById('settings-btn');
        
        // クリックイベント（タッチデバイスでも動作）
        startMenuBtn.addEventListener('click', () => {
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
            this.updateRankingTitle();
            this.displayHighScores();
        });
        highscoreBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('highscore-screen');
            this.updateRankingTitle();
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
            this.loadRankingName();
        });
        settingsBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('settings-screen');
            this.loadSettings();
            this.loadRankingName();
        });
        
        // 設定のトグルスイッチ
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.addEventListener('change', (e) => {
            this.setSoundEnabled(e.target.checked);
        });
        
        // ハイスコアタブのイベントリスナー
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
        
        // 戻るボタンのイベントリスナー
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
        
        // ランキングタブのイベントリスナー
        const localRankingTab = document.getElementById('local-ranking-tab');
        const globalRankingTab = document.getElementById('global-ranking-tab');
        
        localRankingTab.addEventListener('click', () => {
            this.currentRankingTab = 'local';
            localRankingTab.classList.add('active');
            globalRankingTab.classList.remove('active');
            this.displayHighScores();
        });
        
        globalRankingTab.addEventListener('click', () => {
            this.currentRankingTab = 'global';
            globalRankingTab.classList.add('active');
            localRankingTab.classList.remove('active');
            this.displayHighScores();
        });
    }
    
    showScreen(screenId) {
        // すべての画面を非表示
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.add('hidden'));
        
        // 指定された画面を表示
        document.getElementById(screenId).classList.remove('hidden');
    }
    
    resetGame() {
        // ゲームをリセット
        this.gameRunning = false;
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        this.score = 0;
        this.fallingChars = [];
        
        // BGMを停止
        this.stopBGM();
        
        // game-areaをクリア
        this.gameArea.innerHTML = '';
        
        // 背景色をノーマルに戻す
        this.gameArea.style.background = 'linear-gradient(180deg, #f0f8ff 0%, #e6f3ff 50%, #d9ecff 100%)';
        
        this.updateScore();
        this.startBtn.textContent = 'ゲーム開始';
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
        
        // ミス音を再生
        this.playErrorSound();
        
        // BGMを停止
        this.stopBGM();
        
        // インターバルをクリア
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        
        this.startBtn.textContent = 'リトライ';
        this.startBtn.disabled = false;
        
        // ゲームオーバー表示
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
            <div style="font-size: 28px; font-weight: 700; color: #00ffff; text-shadow: 0 0 10px #00ffff; margin-bottom: 15px; white-space: nowrap;">ゲームオーバー</div>
            <div style="font-size: 20px; margin-top: 10px;">最終スコア: ${this.score}</div>
        `;
        
        this.gameArea.appendChild(gameOverDiv);
        
        // 3秒後にゲームオーバー表示を削除
        setTimeout(() => {
            if (this.gameArea.contains(gameOverDiv)) {
                this.gameArea.removeChild(gameOverDiv);
            }
        }, 3000);
        
        // ローカルハイスコアを保存
        this.saveHighScore(this.score);
        
        // Firebaseに自動送信
        const nickname = this.getRankingName();
        this.submitScoreToFirebase(nickname, this.score);
    }
    
    saveHighScore(score) {
        const mode = this.isSuperHardMode ? 'superhard' : (this.isHardMode ? 'hard' : 'normal');
        const key = `highscores_${mode}`;
        
        // 既存のハイスコアを取得
        let highscores = JSON.parse(localStorage.getItem(key) || '[]');
        
        // 新しいスコアを追加
        highscores.push({
            score: score,
            date: new Date().toISOString()
        });
        
        // スコアでソート（降順）
        highscores.sort((a, b) => b.score - a.score);
        
        // トップ10のみ保持
        highscores = highscores.slice(0, 10);
        
        // 保存
        localStorage.setItem(key, JSON.stringify(highscores));
        
        // スーパーハードのアンロック状態を更新
        this.checkSuperHardUnlock();
    }
    
    getHighScores(mode) {
        const key = `highscores_${mode}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    }
    
    displayHighScores() {
        const highscoreList = document.getElementById('highscore-list');
        
        if (this.currentRankingTab === 'local') {
            // ローカルランキング
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
        } else {
            // グローバルランキング
            this.displayGlobalRanking();
        }
    }
    
    // グローバルランキングを表示（今日の日付のみ）
    async displayGlobalRanking() {
        const highscoreList = document.getElementById('highscore-list');
        highscoreList.innerHTML = '<p class="loading-message">読み込み中...</p>';
        
        try {
            const mode = this.currentTab;
            const today = this.getTodayDate();
            const dbRef = window.firebaseRef(window.firebaseDB, `rankings/${mode}/${today}`);
            const rankingQuery = window.firebaseQuery(
                dbRef,
                window.firebaseOrderByChild('score'),
                window.firebaseLimitToLast(100)
            );
            
            const snapshot = await window.firebaseGet(rankingQuery);
            
            if (!snapshot.exists()) {
                highscoreList.innerHTML = '<p class="no-scores">まだスコアがありません</p>';
                return;
            }
            
            // データを配列に変換してソート
            const rankings = [];
            snapshot.forEach((childSnapshot) => {
                rankings.push({
                    ...childSnapshot.val(),
                    id: childSnapshot.key
                });
            });
            
            // スコアで降順ソート
            rankings.sort((a, b) => b.score - a.score);
            
            // トップ100を表示
            let html = '<ol class="score-list">';
            rankings.slice(0, 100).forEach((item, index) => {
                html += `
                    <li class="score-item">
                        <span class="rank">${index + 1}</span>
                        <span class="score-value">${item.score}点</span>
                        <span class="nickname">${this.escapeHtml(item.nickname)}</span>
                    </li>
                `;
            });
            html += '</ol>';
            
            highscoreList.innerHTML = html;
        } catch (error) {
            console.error('ランキング取得エラー:', error);
            highscoreList.innerHTML = '<div class="no-scores">ランキングの読み込みに失敗しました</div>';
        }
    }
    
    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // トースト通知を表示
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // アニメーション
        setTimeout(() => toast.classList.add('show'), 10);
        
        // 3秒後に削除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
    
    // スコアをFirebaseに送信
    // 今日の日付を取得（YYYY-MM-DD形式）
    getTodayDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // 日付を表示用にフォーマット（YYYY/MM/DD形式）
    formatDateForDisplay(dateStr) {
        return dateStr.replace(/-/g, '/');
    }
    
    // ランキングタイトルを更新
    updateRankingTitle() {
        const today = this.getTodayDate();
        const displayDate = this.formatDateForDisplay(today);
        document.getElementById('ranking-title').textContent = `ランキング（${displayDate}）`;
    }
    
    async submitScoreToFirebase(nickname, score) {
        try {
            const mode = this.isSuperHardMode ? 'superhard' : (this.isHardMode ? 'hard' : 'normal');
            const today = this.getTodayDate();
            const dbRef = window.firebaseRef(window.firebaseDB, `rankings/${mode}/${today}`);
            const newScoreRef = window.firebasePush(dbRef);
            
            await window.firebaseSet(newScoreRef, {
                nickname: nickname,
                score: score,
                timestamp: Date.now(),
                date: today
            });
            
            return true;
        } catch (error) {
            console.error('スコア送信エラー:', error);
            return false;
        }
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    new FallingGame();
});