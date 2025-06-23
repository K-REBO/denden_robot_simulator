# リファクタリング TODO

このドキュメントでは、Denden Robot Simulatorのコードベースで実行すべきリファクタリング項目をまとめています。

## 1. DOM要素の重複取得の解消 ⭐ 高優先度

**問題**: 同じDOM要素を何度も取得している
```javascript
// 例：simulator.js内で繰り返し
document.getElementById('leftMotorSlider')
document.getElementById('rightMotorSlider')
```

**改善案**: 
- 初期化時にDOM要素を取得してプロパティに保存
- UIコンポーネントクラスの作成を検討

**影響ファイル**: `simulator.js`

---

## 2. マジックナンバーの削減 ⭐ 高優先度

**問題**: ハードコードされた数値が散在
```javascript
// 例：exploration_programs.js内
this.addMove(-80, 80, 400);  // 80, 400の意味が不明
if (distance <= 130) {       // 130の根拠が不明
```

**改善案**:
- 定数ファイルまたは設定オブジェクトの作成
- 意味のある名前での定数定義

**影響ファイル**: `exploration_programs.js`, `sensors.js`, `field.js`

---

## 3. 設定値計算の一元管理

**問題**: センサー位置などの計算が複数箇所に分散
```javascript
// sensors.js、simulator.js両方で同じ計算
const sensorOffsetX = distConfig.position?.x || 150;
```

**改善案**:
- 設定値計算を一箇所に集約
- ConfigManagerクラスの作成

**影響ファイル**: `sensors.js`, `simulator.js`, `config_loader.js`

---

## 4. メソッドの責任分散 ⭐ 高優先度

**問題**: `simulator.js`の`initializeRemoteControl()`が長すぎる（100行超）

**改善案**:
- 機能ごとにメソッド分割
  - `initializeMotorControls()`
  - `initializeServoControls()`
  - `initializeDirectionButtons()`

**影響ファイル**: `simulator.js`

---

## 5. エラーハンドリングの追加

**問題**: YAML読み込み失敗時などの処理が不十分
```javascript
// config_loader.js
const response = await fetch(filename);
// エラー時の詳細処理が少ない
```

**改善案**:
- try-catch文の追加
- ユーザーフレンドリーなエラーメッセージ
- フォールバック処理の強化

**影響ファイル**: `config_loader.js`, `simulator.js`

---

## 6. 型安全性の向上

**問題**: 文字列による設定アクセスが多い
```javascript
this.config.sensors?.distance_sensor?.position?.x
```

**改善案**:
- 設定スキーマの定義
- TypeScript導入の検討
- 設定値の検証関数追加

**影響ファイル**: 全体

---

## 7. 重複コードの統合

**問題**: 似たような安全チェックが各探索アルゴリズムに重複

**改善案**:
- 共通の安全チェック関数を作成
- BaseExplorationProgramの機能拡張

**影響ファイル**: `exploration_programs.js`

---

## 8. ファイル構成の改善

**問題**: 単一のHTMLファイルにCSS/JSが混在

**改善案**:
- CSSの外部ファイル化
- モジュール化の検討

**影響ファイル**: `index.html`

---

## 実装優先度

1. **高優先度** ⭐
   - DOM要素の重複取得の解消
   - マジックナンバーの削減
   - メソッドの責任分散

2. **中優先度**
   - 設定値計算の一元管理
   - エラーハンドリングの追加

3. **低優先度**
   - 型安全性の向上
   - 重複コードの統合
   - ファイル構成の改善

---

## 完了チェックリスト

- [x] DOM要素の重複取得の解消
- [x] マジックナンバーの削減
- [x] 設定値計算の一元管理
- [x] メソッドの責任分散
- [ ] エラーハンドリングの追加
- [ ] 型安全性の向上
- [ ] 重複コードの統合
- [x] ファイル構成の改善