# AdMob統合手順

## 1. AdMobアカウントの作成

1. https://admob.google.com/ にアクセス
2. Googleアカウントでログイン
3. 「使ってみる」をクリック

## 2. アプリの登録

1. 「アプリ」→「アプリを追加」をクリック
2. プラットフォーム: **iOS** を選択
3. アプリ名: **左右落下**
4. 「アプリを追加」をクリック
5. **App ID**（ca-app-pub-xxxxxxxxxx~xxxxxxxxxx）をメモ

## 3. 広告ユニットの作成

1. 「広告ユニット」→「広告ユニットを作成」をクリック
2. 広告フォーマット: **リワード** を選択
3. 広告ユニット名: **クレジット回復**
4. 「広告ユニットを作成」をクリック
5. **広告ユニットID**（ca-app-pub-xxxxxxxxxx/xxxxxxxxxx）をメモ

## 4. コードの更新

### 4.1 Info.plistの更新

`ios/App/App/Info.plist` の以下の部分を更新：

```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-xxxxxxxxxx~xxxxxxxxxx</string>
```

**YOUR_APP_ID** を手順2でメモしたApp IDに置き換え

### 4.2 capacitor.config.jsonの更新

```json
{
  "plugins": {
    "AdMob": {
      "appId": "ca-app-pub-xxxxxxxxxx~xxxxxxxxxx"
    }
  }
}
```

### 4.3 game.jsの更新

`game.js` の `showRewardedAd` 関数内の以下の部分を更新：

```javascript
await AdMob.prepareRewardVideoAd({
  adId: 'ca-app-pub-xxxxxxxxxx/xxxxxxxxxx', // 本番用ID
  isTesting: false // 本番環境ではfalse
});
```

**YOUR_AD_UNIT_ID** を手順3でメモした広告ユニットIDに置き換え

## 5. テスト用IDについて

開発中は以下のテスト用IDを使用してください：

- **App ID**: ca-app-pub-3940256099942544~1458002511
- **リワード広告ID**: ca-app-pub-3940256099942544/1712485313

これらは現在のコードに設定済みです。

## 6. ビルドとデプロイ

### 6.1 依存関係のインストール（Codemagicで自動実行）

```bash
npm install
npx cap sync ios
cd ios/App
pod install
```

### 6.2 Codemagicでビルド

1. Git push
2. Codemagicが自動でビルド
3. TestFlightで配信

## 7. 本番環境への切り替え

App Store審査通過後：

1. 手順4のコードを本番用IDに更新
2. `isTesting: false` に変更
3. Git push してビルド

## 8. 広告の動作確認

### テスト環境
- クレジットが0になると広告プロンプトが表示される
- 「広告を見る」をタップ
- テスト広告が表示される
- 広告を最後まで視聴
- クレジットが10に回復

### 本番環境
- 実際の広告が表示される
- 広告収益が発生する

## 9. トラブルシューティング

### 広告が表示されない
1. App IDと広告ユニットIDが正しいか確認
2. Info.plistの設定を確認
3. インターネット接続を確認
4. Xcodeのログを確認

### ビルドエラー
1. `pod install` を実行
2. Xcodeでクリーンビルド
3. Capacitorのバージョンを確認

## 10. 料金について

- AdMobは無料で使用可能
- 広告表示ごとに収益が発生
- 支払いは月末締め、翌月21日頃に振込

## 11. 注意事項

- テスト用IDは本番環境で使用しないこと
- 自分で広告をクリックしないこと（アカウント停止の可能性）
- App Storeの審査では広告が表示されることを確認
