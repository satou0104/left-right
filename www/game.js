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
        this.consecutiveClear = 0; // 連続クリア回数
        
        // 麻雀牌コレクション
        this.collection = this.loadCollection();
        this.lastRewardMonth = localStorage.getItem('lastRewardMonth') || '';
        this.dailyPlayCount = this.loadDailyPlayCount(); // v2.0.0: 1日のプレイ回数
        this.lastPlayDate = localStorage.getItem('lastPlayDate') || ''; // v2.0.0: 最後にプレイした日付
        
        // 🔧 DEBUG: テスト用に各種類5個ずつ追加（後で削除）
        this.addDebugTiles();
        
        this.init();
        this.initScreenNavigation();
        this.checkSuperHardUnlock();
        this.initRankingName(); // ランキング名の初期化
        this.updateCreditDisplay(); // クレジット表示を更新
        this.checkMonthlyReward(); // 月次報酬チェック
    }
    
    // 🔧 DEBUG: テスト用の麻雀牌追加関数（後で削除）
    addDebugTiles() {
        const testTiles = [
            // 萬子から5個
            '1man', '2man', '3man', '4man', '5man',
            // 筒子から5個
            '1pin', '2pin', '3pin', '4pin', '5pin',
            // 索子から5個
            '1so', '2so', '3so', '4so', '5so',
            // 字牌から5個
            'ton', 'nan', 'sya', 'pei', 'haku'
        ];
        
        this.collection = testTiles;
        this.saveCollection();
    }
    
    // スーパーハードのアンロック状態をチェック
    checkSuperHardUnlock() {
        const superHardBtn = document.getElementById('start-super-hard-btn');
        const superHardTab = document.getElementById('superhard-tab');
        superHardBtn.classList.remove('hidden');
        superHardTab.classList.remove('hidden');
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
        const today = this.getTodayDateFull();
        
        // 日付が変わっていたらクレジットをリセット
        if (lastDate !== today) {
            localStorage.setItem('lastCreditDate', today);
            localStorage.setItem('gameCredits', '6'); // v2.0.0: 10→6に変更
            return 6;
        }
        
        const saved = localStorage.getItem('gameCredits');
        return saved ? parseInt(saved) : 6; // v2.0.0: 10→6に変更
    }
    
    // クレジットを保存
    saveCredits() {
        localStorage.setItem('gameCredits', this.credits.toString());
        // 保存時に日付も更新
        localStorage.setItem('lastCreditDate', this.getTodayDateFull());
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
        this.credits = 6; // v2.0.0: 10→6に変更
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
            ">広告を見る（クレジット6回復）</button>
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
            const level = Math.floor(this.score / 30) + 7; // レベル7から開始
            let newDelay;
            
            if (this.score >= 250) {
                newDelay = 50; // 0.05秒
            } else if (this.score >= 220) {
                newDelay = 70; // 0.07秒
            } else if (this.score >= 190) {
                newDelay = 90; // 0.09秒
            } else if (this.score >= 160) {
                newDelay = 110; // 0.11秒
            } else if (this.score >= 130) {
                newDelay = 130; // 0.13秒
            } else if (this.score >= 100) {
                newDelay = 150; // 0.15秒
            } else if (this.score >= 70) {
                newDelay = 200; // 0.2秒
            } else if (this.score >= 40) {
                newDelay = 250; // 0.25秒
            } else {
                newDelay = 300; // 0.3秒
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
                newDelay = 150; // 0.15秒
            } else if (this.score >= 180) {
                newDelay = 200; // 0.2秒
            } else if (this.score >= 160) {
                newDelay = 250; // 0.25秒
            } else if (this.score >= 140) {
                newDelay = 300; // 0.3秒
            } else if (this.score >= 120) {
                newDelay = 400; // 0.4秒
            } else if (this.score >= 100) {
                newDelay = 500; // 0.5秒
            } else if (this.score >= 80) {
                newDelay = 520; // 0.52秒
            } else if (this.score >= 60) {
                newDelay = 540; // 0.54秒
            } else if (this.score >= 40) {
                newDelay = 560; // 0.56秒
            } else if (this.score >= 20) {
                newDelay = 580; // 0.58秒
            } else {
                newDelay = 600; // 0.6秒
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
            const interval = this.isSuperHardMode ? 30 : 20;
            if (Math.floor(this.score / interval) > Math.floor(previousScore / interval)) {
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
        // タイトル画面のスタートボタン
        const titleStartBtn = document.getElementById('title-start-btn');
        titleStartBtn.addEventListener('click', () => {
            this.showScreen('main-menu');
        });
        titleStartBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('main-menu');
        });
        
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
        
        // v2.0.0: コレクションボタン
        const collectionBtn = document.getElementById('collection-btn');
        collectionBtn.addEventListener('click', () => {
            this.showScreen('collection-screen');
            this.displayCollection();
        });
        collectionBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showScreen('collection-screen');
            this.displayCollection();
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
        
        // v2.0.0: コレクション画面の戻るボタン
        const backFromCollectionBtn = document.getElementById('back-from-collection-btn');
        backFromCollectionBtn.addEventListener('click', () => {
            this.showScreen('main-menu');
        });
        backFromCollectionBtn.addEventListener('touchend', (e) => {
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
        
        // v2.0.0: プレイ回数をカウントしてアプリレビュー依頼
        this.incrementPlayCountAndRequestReview();
    }
    
    // v2.0.0: プレイ回数をカウントしてレビュー依頼
    incrementPlayCountAndRequestReview() {
        // プレイ回数を取得
        let playCount = parseInt(localStorage.getItem('totalPlayCount') || '0');
        playCount++;
        localStorage.setItem('totalPlayCount', playCount.toString());
        
        // レビュー依頼済みフラグを確認
        const hasRequestedReview = localStorage.getItem('hasRequestedReview') === 'true';
        
        // 5回目のプレイかつ未依頼の場合、レビューを依頼
        if (playCount === 5 && !hasRequestedReview) {
            setTimeout(() => {
                this.requestAppReview();
            }, 2000); // ゲームオーバー表示の後に表示
        }
        
        // v2.0.0: 1日10プレイ報酬のチェック
        this.checkDailyPlayReward();
    }
    
    // v2.0.0: 1日のプレイ回数を読み込む
    loadDailyPlayCount() {
        const today = this.getTodayDateFull();
        const lastDate = localStorage.getItem('lastPlayDate') || '';
        
        // 日付が変わっていたらリセット
        if (lastDate !== today) {
            localStorage.setItem('lastPlayDate', today);
            localStorage.setItem('dailyPlayCount', '0');
            return 0;
        }
        
        const saved = localStorage.getItem('dailyPlayCount');
        return saved ? parseInt(saved) : 0;
    }
    
    // v2.0.0: 1日のプレイ回数を保存
    saveDailyPlayCount() {
        localStorage.setItem('dailyPlayCount', this.dailyPlayCount.toString());
        localStorage.setItem('lastPlayDate', this.getTodayDateFull());
    }
    
    // v2.0.0: 1日10プレイ報酬をチェック
    checkDailyPlayReward() {
        // プレイ回数をインクリメント
        this.dailyPlayCount++;
        this.saveDailyPlayCount();
        
        // 10回目のプレイ時
        if (this.dailyPlayCount === 10) {
            // 未獲得の麻雀牌をランダムに1個獲得
            const newTiles = this.getRandomUnownedTiles(1);
            
            if (newTiles.length > 0) {
                this.addTilesToCollection(newTiles);
                
                // 獲得ポップアップを表示（少し遅らせる）
                setTimeout(() => {
                    this.showDailyRewardPopup(newTiles);
                }, 3500); // ゲームオーバー表示の後
            } else {
                // 全種コンプリート済みの場合
                setTimeout(() => {
                    this.showToast('本日の10プレイ達成！（全種コンプリート済み）', 'info');
                }, 3500);
            }
        }
    }
    
    // v2.0.0: 1日10プレイ報酬ポップアップを表示
    showDailyRewardPopup(tiles) {
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
            max-width: 400px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        `;
        
        // 獲得した牌の画像HTML
        let tilesHTML = tiles.map(tile => {
            const folder = this.getTileFolder(tile);
            return `<img src="${folder}/${tile}.png" style="width: 60px; height: 80px; margin: 5px; border: 2px solid #00ffff; border-radius: 4px;">`;
        }).join('');
        
        // 全種コンプリートチェック
        const allTiles = this.getAllTiles();
        const totalTiles = allTiles.manzu.length + allTiles.pinzu.length + allTiles.sozu.length + allTiles.zihai.length;
        const isComplete = this.collection.length === totalTiles;
        
        popup.innerHTML = `
            <h2 style="color: #00ffff; font-size: 24px; margin-bottom: 20px; text-shadow: 0 0 10px #00ffff;">本日10プレイ達成！</h2>
            <p style="color: #ffffff; font-size: 18px; margin-bottom: 20px;">以下の麻雀牌を手に入れました！</p>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; margin-bottom: 20px;">
                ${tilesHTML}
            </div>
            ${isComplete ? '<p style="color: #ffd700; font-size: 20px; font-weight: 700; margin-bottom: 20px;">全種コンプリートおめでとう！</p>' : ''}
            <button id="close-daily-reward-btn" style="
                width: 100%;
                padding: 15px;
                font-size: 18px;
                font-weight: 700;
                background: #00ffff;
                color: #000;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            ">OK</button>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        document.getElementById('close-daily-reward-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }
    
    // v2.0.0: アプリレビュー依頼
    async requestAppReview() {
        try {
            // Capacitorプラグインが利用可能かチェック
            if (typeof window.Capacitor !== 'undefined' && window.Capacitor.Plugins) {
                const { App } = window.Capacitor.Plugins;
                
                // iOS/Androidでネイティブレビューを試みる
                if (App && App.requestReview) {
                    // Capacitor 6.0以降のネイティブレビュー機能
                    await App.requestReview();
                    localStorage.setItem('hasRequestedReview', 'true');
                    // レビュー表示時に広告回数をリセット
                    this.restoreCredits();
                    return;
                } else if (window.Capacitor.Plugins.RateApp) {
                    // 代替: capacitor-rate-appプラグインを使用
                    await window.Capacitor.Plugins.RateApp.requestReview();
                    localStorage.setItem('hasRequestedReview', 'true');
                    this.restoreCredits();
                    return;
                }
            }
            
            // プラグインが利用できない場合はカスタムダイアログを表示
            this.showCustomReviewDialog();
            
        } catch (error) {
            console.error('レビュー依頼エラー:', error);
            // エラー時もカスタムダイアログを表示
            this.showCustomReviewDialog();
        }
    }
    
    // v2.0.0: カスタムレビューダイアログを表示
    showCustomReviewDialog() {
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
            animation: fadeIn 0.3s ease-out;
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
            animation: slideUp 0.3s ease-out;
        `;
        
        popup.innerHTML = `
            <h2 style="color: #00ffff; font-size: 24px; margin-bottom: 20px; text-shadow: 0 0 10px #00ffff;">App Storeで<br>レビューをお願いします。</h2>
            <button id="review-yes-btn" style="
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
            ">レビューを書く</button>
            <button id="review-later-btn" style="
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
            ">後で</button>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        // レビューを書くボタン
        document.getElementById('review-yes-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            localStorage.setItem('hasRequestedReview', 'true');
            this.restoreCredits(); // 広告回数をリセット
            
            // App Storeのレビューページを開く
            // 実際のアプリIDに置き換えてください
            const appId = 'YOUR_APP_ID'; // App Store Connect で確認できるID
            const reviewUrl = `https://apps.apple.com/app/id${appId}?action=write-review`;
            
            if (window.Capacitor && window.Capacitor.Plugins.Browser) {
                // Capacitorのブラウザプラグインで開く
                window.Capacitor.Plugins.Browser.open({ url: reviewUrl });
            } else {
                // 通常のブラウザで開く
                window.open(reviewUrl, '_blank');
            }
        });
        
        // 後でボタン
        document.getElementById('review-later-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            // 後でを選んだ場合は、次回また依頼できるようにフラグは立てない
        });
    }
    
    // 🔧 DEBUG: 1位報酬ポップアップのテスト関数（後で削除）
    testFirstPlaceReward() {
        const testTiles = this.getRandomUnownedTiles(5);
        this.showTileRewardPopup(testTiles, 1);
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
    // 今月の年月を取得（YYYY-MM形式）ランキング用
    getTodayDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    
    // 今日の日付を取得（YYYY-MM-DD形式）クレジット用
    getTodayDateFull() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // 日付を表示用にフォーマット（YYYY年MM月形式）
    formatDateForDisplay(dateStr) {
        const parts = dateStr.split('-');
        return `${parts[0]}年${parts[1]}月`;
    }
    
    // ランキングタイトルを更新
    updateRankingTitle() {
        const today = this.getTodayDate();
        const displayDate = this.formatDateForDisplay(today);
        document.getElementById('ranking-title').innerHTML = `ランキング<br>（${displayDate}）`;
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
    
    // v2.0.0: 麻雀牌コレクション関連
    
    // 麻雀牌の定義（全34種類）
    getAllTiles() {
        return {
            manzu: ['1man', '2man', '3man', '4man', '5man', '6man', '7man', '8man', '9man'],
            pinzu: ['1pin', '2pin', '3pin', '4pin', '5pin', '6pin', '7pin', '8pin', '9pin'],
            sozu: ['1so', '2so', '3so', '4so', '5so', '6so', '7so', '8so', '9so'],
            zihai: ['ton', 'nan', 'sya', 'pei', 'haku', 'hatu', 'tyun']
        };
    }
    
    // 麻雀牌の説明データ
    getTileDescription(tile) {
        const descriptions = {
            '1man': { name: '一萬', text: '「どうせ最初に捨てるんでしょ？」\n「……え、まだ持っててくれるの？」' },
            '2man': { name: '二萬', text: '「一萬ほど地味じゃないし、三萬ほど人気でもない。」\n「なんか、ずっと二番手なんだよね。」' },
            '3man': { name: '三萬', text: '「最近ちょっと調子いいんだよね。」\n「根拠？ ないけど。」' },
            '4man': { name: '四萬', text: '「まあ、なんとかなるっしょ。」\n「その考えでここまで来ました。」' },
            '5man': { name: '五萬', text: '「今日は赤くないけど、気持ちは赤ドラ。」\n「自信だけは満点です。」' },
            '6man': { name: '六萬', text: '「気づいたらいい位置にいる。」\n「そういう人、クラスに一人はいるよね。」' },
            '7man': { name: '七萬', text: '「ラッキーセブンって呼んでもいいよ。」\n「呼ぶだけなら無料だからさ。」' },
            '8man': { name: '八萬', text: '「末広がりって、いい言葉だよね。」\n「僕の将来も末広がりだといいな。」' },
            '9man': { name: '九萬', text: '「もうすぐゴールだと思ってた。」\n「でも麻雀にゴールなんてなかった。」' },
            
            '1pin': { name: '一筒', text: '「丸いものを見ると落ち着くんだよね。」\n「たぶん前世はお団子。」' },
            '2pin': { name: '二筒', text: '「友達はいるけど、親友はいない。」\n「一筒と三筒、どっちとも仲いいからね。」' },
            '3pin': { name: '三筒', text: '「今日こそ主役になってやる。」\n「とりあえず、隣の牌から誘ってみよう。」' },
            '4pin': { name: '四筒', text: '「丸が四つ。なんか縁起が悪い？」\n「いやいや、考えすぎだって！」' },
            '5pin': { name: '五筒', text: '「赤いやつばっかりチヤホヤされてさ。」\n「通常版にも愛をください。」' },
            '6pin': { name: '六筒', text: '「そろそろ出番かな？」\n「って思い続けて、もう半荘終わった。」' },
            '7pin': { name: '七筒', text: '「七ってなんか特別感あるよね。」\n「僕が言うと説得力ない？」' },
            '8pin': { name: '八筒', text: '「丸がいっぱいでしょ？」\n「数えるのはやめとこう。眠くなるから。」' },
            '9pin': { name: '九筒', text: '「僕を見てると目がチカチカする？」\n「それは恋かもしれません。」' },
            
            '1so': { name: '一索', text: '「鳥みたいってよく言われる。」\n「でも飛べないんだよね、僕。」' },
            '2so': { name: '二索', text: '「竹って涼しそうでいいよね。」\n「夏場は僕を見て涼んでください。」' },
            '3so': { name: '三索', text: '「そろそろ本気出すか。」\n「そのセリフ、今月で三回目です。」' },
            '4so': { name: '四索', text: '「四ってちょっと不吉？」\n「麻雀では普通に使ってもらえるからセーフ。」' },
            '5so': { name: '五索', text: '「赤くなったら人気者になれるかな。」\n「まずは自分を磨くところからだね。」' },
            '6so': { name: '六索', text: '「毎日コツコツ頑張ってます。」\n「誰も気づいてくれないけど。」' },
            '7so': { name: '七索', text: '「ラッキーセブン、再び。」\n「七萬とはライバル関係です。」' },
            '8so': { name: '八索', text: '「竹みたいに、しなやかに生きたい。」\n「でもリーチには弱いです。」' },
            '9so': { name: '九索', text: '「ここまで来たら、もうベテラン。」\n「でも新人の一索には負けたくない。」' },
            
            'ton': { name: '東', text: '「今日は僕が親だ！」\n「とりあえず、みんなお茶でも飲んで落ち着こう。」' },
            'nan': { name: '南', text: '「南国っていいよね、暖かそうで。」\n「僕も一度くらいバカンスに行きたい。」' },
            'sya': { name: '西', text: '「読み方はシャーです。」\n「初対面で正しく読んでもらえると、ちょっとうれしい。」' },
            'pei': { name: '北', text: '「寒いって言わないで。」\n「名前だけで判断するの、よくないと思う。」' },
            'haku': { name: '白', text: '「何も書いてないけど、ちゃんと存在してます。」\n「無地にも個性ってあるんだよ。」' },
            'hatu': { name: '發', text: '「財運なら任せてください。」\n「給料日前の人、ぜひ僕を集めてください。」' },
            'tyun': { name: '中', text: '「僕が来たら、ちょっと期待していいよ。」\n「ただし、三枚そろうかどうかは別の話。」' }
        };
        
        return descriptions[tile] || { name: '不明', text: '' };
    }
    
    // コレクションを読み込む
    loadCollection() {
        const saved = localStorage.getItem('mahjongCollection');
        return saved ? JSON.parse(saved) : [];
    }
    
    // コレクションを保存
    saveCollection() {
        localStorage.setItem('mahjongCollection', JSON.stringify(this.collection));
    }
    
    // 麻雀牌を追加
    addTilesToCollection(tiles) {
        const newTiles = [];
        tiles.forEach(tile => {
            if (!this.collection.includes(tile)) {
                this.collection.push(tile);
                newTiles.push(tile);
            }
        });
        
        if (newTiles.length > 0) {
            this.saveCollection();
        }
        
        return newTiles;
    }
    
    // ランダムに未獲得の麻雀牌を取得
    getRandomUnownedTiles(count) {
        const allTiles = this.getAllTiles();
        const allTilesList = [
            ...allTiles.manzu,
            ...allTiles.pinzu,
            ...allTiles.sozu,
            ...allTiles.zihai
        ];
        
        // 未獲得の牌をフィルタ
        const unownedTiles = allTilesList.filter(tile => !this.collection.includes(tile));
        
        if (unownedTiles.length === 0) {
            return []; // 全て獲得済み
        }
        
        // ランダムに選択（重複なし）
        const result = [];
        const available = [...unownedTiles];
        const selectCount = Math.min(count, available.length);
        
        for (let i = 0; i < selectCount; i++) {
            const randomIndex = Math.floor(Math.random() * available.length);
            result.push(available[randomIndex]);
            available.splice(randomIndex, 1);
        }
        
        return result;
    }
    
    // 月次報酬をチェック
    async checkMonthlyReward() {
        const currentMonth = this.getTodayDate(); // YYYY-MM形式
        
        // 既に今月の報酬を受け取っている場合はスキップ
        if (this.lastRewardMonth === currentMonth) {
            return;
        }
        
        // 前月のランキングデータを取得
        const lastMonth = this.getPreviousMonth(currentMonth);
        
        try {
            // スーパーハードのランキングのみチェック
            const dbRef = window.firebaseRef(window.firebaseDB, `rankings/superhard/${lastMonth}`);
            const rankingQuery = window.firebaseQuery(
                dbRef,
                window.firebaseOrderByChild('score'),
                window.firebaseLimitToLast(100)
            );
            
            const snapshot = await window.firebaseGet(rankingQuery);
            
            if (!snapshot.exists()) {
                return; // ランキングデータなし
            }
            
            // ランキングデータを配列に変換
            const rankings = [];
            snapshot.forEach((childSnapshot) => {
                rankings.push({
                    ...childSnapshot.val(),
                    id: childSnapshot.key
                });
            });
            
            // スコアで降順ソート
            rankings.sort((a, b) => b.score - a.score);
            
            // 自分のニックネームと照合
            const myNickname = this.getRankingName();
            const myRank = rankings.findIndex(r => r.nickname === myNickname);
            
            if (myRank === -1) {
                return; // ランキングに参加していない
            }
            
            // 順位に応じて報酬を決定
            let rewardCount = 0;
            if (myRank === 0) {
                rewardCount = 5; // 1位
            } else if (myRank === 1) {
                rewardCount = 4; // 2位
            } else if (myRank === 2) {
                rewardCount = 3; // 3位
            } else {
                rewardCount = 1; // 参加賞
            }
            
            // 未獲得の麻雀牌をランダムに選択
            const newTiles = this.getRandomUnownedTiles(rewardCount);
            
            if (newTiles.length > 0) {
                // 獲得処理
                this.addTilesToCollection(newTiles);
                
                // 報酬受け取り済みフラグを更新
                this.lastRewardMonth = currentMonth;
                localStorage.setItem('lastRewardMonth', currentMonth);
                
                // 獲得ポップアップを表示
                this.showTileRewardPopup(newTiles, myRank + 1);
            }
            
        } catch (error) {
            console.error('月次報酬チェックエラー:', error);
        }
    }
    
    // 前月の年月を取得（YYYY-MM形式）
    getPreviousMonth(currentMonth) {
        const [year, month] = currentMonth.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        date.setMonth(date.getMonth() - 1);
        const prevYear = date.getFullYear();
        const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
        return `${prevYear}-${prevMonth}`;
    }
    
    // 獲得ポップアップを表示
    showTileRewardPopup(tiles, rank) {
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
            border: 2px solid #ffd700;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        `;
        
        let rankText = '';
        if (rank === 1) {
            rankText = '1位おめでとうございます！';
        } else if (rank === 2) {
            rankText = '2位おめでとうございます！';
        } else if (rank === 3) {
            rankText = '3位おめでとうございます！';
        } else {
            rankText = '参加ありがとうございます！';
        }
        
        // 獲得した牌の画像HTML
        let tilesHTML = tiles.map(tile => {
            const folder = this.getTileFolder(tile);
            return `<img src="${folder}/${tile}.png" style="width: 60px; height: 80px; margin: 5px; border: 2px solid #ffd700; border-radius: 4px;">`;
        }).join('');
        
        // 全種コンプリートチェック
        const allTiles = this.getAllTiles();
        const totalTiles = allTiles.manzu.length + allTiles.pinzu.length + allTiles.sozu.length + allTiles.zihai.length;
        const isComplete = this.collection.length === totalTiles;
        
        popup.innerHTML = `
            <h2 style="color: #ffd700; font-size: 24px; margin-bottom: 20px; text-shadow: 0 0 10px #ffd700;">${rankText}</h2>
            <p style="color: #ffffff; font-size: 18px; margin-bottom: 20px;">以下の麻雀牌を手に入れました！</p>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; margin-bottom: 20px;">
                ${tilesHTML}
            </div>
            ${isComplete ? '<p style="color: #ffd700; font-size: 20px; font-weight: 700; margin-bottom: 20px;">全種コンプリートおめでとう！</p>' : ''}
            <button id="close-reward-btn" style="
                width: 100%;
                padding: 15px;
                font-size: 18px;
                font-weight: 700;
                background: #ffd700;
                color: #000;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            ">OK</button>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        document.getElementById('close-reward-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }
    
    // 麻雀牌のフォルダパスを取得
    getTileFolder(tile) {
        if (tile.includes('man')) return 'manzu';
        if (tile.includes('pin')) return 'pinzu';
        if (tile.includes('so')) return 'so-zu';
        return 'zihai';
    }
    
    // コレクション画面を表示
    displayCollection() {
        const allTiles = this.getAllTiles();
        
        // 萬子
        this.renderTileGrid('manzu-collection', allTiles.manzu, 'manzu');
        
        // 筒子
        this.renderTileGrid('pinzu-collection', allTiles.pinzu, 'pinzu');
        
        // 索子
        this.renderTileGrid('sozu-collection', allTiles.sozu, 'so-zu');
        
        // 字牌
        this.renderTileGrid('zihai-collection', allTiles.zihai, 'zihai');
        
        // 獲得数を更新
        document.getElementById('collection-count').textContent = this.collection.length;
    }
    
    // 麻雀牌グリッドをレンダリング
    renderTileGrid(containerId, tiles, folder) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        tiles.forEach(tile => {
            const tileDiv = document.createElement('div');
            tileDiv.className = 'tile-item';
            
            if (this.collection.includes(tile)) {
                // 獲得済み
                tileDiv.innerHTML = `<img src="${folder}/${tile}.png" alt="${tile}">`;
                // クリックイベントを追加
                tileDiv.style.cursor = 'pointer';
                tileDiv.addEventListener('click', () => this.showTileDetail(tile, folder));
                tileDiv.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.showTileDetail(tile, folder);
                });
            } else {
                // 未獲得（？で表示）
                tileDiv.innerHTML = '<div class="tile-unknown">？</div>';
                tileDiv.classList.add('unknown');
            }
            
            container.appendChild(tileDiv);
        });
    }
    
    // 麻雀牌詳細を表示
    showTileDetail(tile, folder) {
        const description = this.getTileDescription(tile);
        
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
            max-width: 500px;
            width: 90%;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        `;
        
        popup.innerHTML = `
            <div style="display: flex; gap: 20px; align-items: center;">
                <div style="flex-shrink: 0;">
                    <img src="${folder}/${tile}.png" style="width: 100px; height: 133px; border: 2px solid #00ffff; border-radius: 4px;">
                </div>
                <div style="flex: 1; color: #ffffff;">
                    <h3 style="color: #00ffff; font-size: 24px; margin-bottom: 15px; text-shadow: 0 0 10px #00ffff;">${description.name}</h3>
                    <p style="font-size: 16px; line-height: 1.8; white-space: pre-line;">${description.text}</p>
                </div>
            </div>
            <button id="close-tile-detail-btn" style="
                width: 100%;
                padding: 15px;
                font-size: 18px;
                font-weight: 700;
                background: #00ffff;
                color: #000;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 20px;
                transition: all 0.3s;
            ">閉じる</button>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        // オーバーレイをクリックしても閉じる
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
        
        document.getElementById('close-tile-detail-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    new FallingGame();
});