# Firebase Functions - デイリーランキング自動削除

## 概要
毎日午前0時（日本時間）に、前日以前のランキングデータを自動削除します。

## セットアップ手順

### 1. Firebase CLIのインストール
```bash
npm install -g firebase-tools
```

### 2. Firebaseにログイン
```bash
firebase login
```

### 3. プロジェクトの初期化
```bash
cd firebase-functions
firebase init
```
- 「Functions」を選択
- 既存のプロジェクト「sayuurakka」を選択
- JavaScript を選択
- ESLint は任意
- 依存関係をインストール

### 4. 依存関係のインストール
```bash
cd functions
npm install
```

### 5. デプロイ
```bash
firebase deploy --only functions
```

## 関数の説明

### cleanupOldRankings
- **実行タイミング**: 毎日午前0時（日本時間）
- **処理内容**: 
  - `rankings/normal/`, `rankings/hard/`, `rankings/superhard/` 配下の全日付をチェック
  - 今日の日付以外のデータを削除
  - 今日のデータのみ残す

## ローカルテスト

```bash
cd functions
npm run serve
```

エミュレータが起動したら、別のターミナルで：
```bash
firebase functions:shell
```

関数を手動実行：
```javascript
cleanupOldRankings()
```

## ログの確認

```bash
firebase functions:log
```

## 料金について
- Cloud Scheduler: 月3ジョブまで無料
- Cloud Functions: 月200万回の呼び出しまで無料
- この関数は1日1回のみ実行されるため、無料枠内で運用可能

## トラブルシューティング

### デプロイエラーが出る場合
1. Firebaseプロジェクトの課金設定を確認（Blaze プランが必要）
2. Node.jsのバージョンを確認（18推奨）

### 関数が実行されない場合
1. Firebase Consoleで関数のログを確認
2. Cloud Schedulerが有効になっているか確認
3. タイムゾーン設定を確認

## データ構造

```
rankings/
  normal/
    2026-03-27/
      {scoreId}: {nickname, score, timestamp, date}
    2026-03-28/
      {scoreId}: {nickname, score, timestamp, date}
  hard/
    2026-03-27/
      ...
  superhard/
    2026-03-27/
      ...
```

毎日午前0時に、前日（2026-03-27など）のデータが削除され、当日（2026-03-28）のデータのみ残ります。
