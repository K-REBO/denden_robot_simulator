# 直接アプローチアルゴリズム

## ステートマシン構成
### ステートマシン内パラメータ
```
    String state = "first"; // 初期状態

    // search状態のパラメータ
    int_search_angle_L = -90; // 左サーボの初期角度
    int_search_angle_R = 90; // 右サーボの初期角
    int_search_angle_step = 4; // サーボ角度のステップ
    int target_angle = 0; // ターゲットの角度

    // calibrated_approach状態のパラメータ
    int approach_speed = 10; // ターゲットに近づく速度
    int target_angle = 0; // ターゲットの角度



    // found
    int distance_threshold = 13; //ターゲットとの発見閾値(これを超えたらターゲットを発見したとみなす)

    // step_forward
    int step_forward_distance = 10; // 前進する距離
    int step_forward_angle = 90; // 前進後の回転角度
    int step_forward_back_distance = 5; // 後退する距離

    //avoid_fall
    int avoid_fall_back_distance = 10; // 落下回避のための後退距離


```

- **状態**: 各状態は、特定の条件や入力に基づいて遷移する。




1. **first**: 初期状態。-90°車体を回転する。
2. **search**: 検索状態。サーボを-90°から90°の範囲で動かし、距離センサーを使用してターゲットを探す。最も近いターゲットの角度を取得し、車体をその角度に向ける。(車体の傾け方は、サーボを動作させながら、車体を傾ける。これにはmillis()関数を使用して、非同期的に処理する。)
3. **calibrated_approach**: 一定のパルス幅で、距離センサーを使用してターゲットに近づく状態。距離センサーの値が13cm以下になるまで、車体を前進させる。(車体の傾け方は、サーボを動作させながら、車体を傾ける。これにはmillis()関数を使用して、非同期的に処理する。)
4. **found**: 条件を満たした状態。ターゲットを発見した場合、found()関数を呼び出す。
5. **step_forward**: 次のステップに進む状態。少し後退し、特定角度に車体を回転させ、少し前進する。
6. **avoid_fall**: 落下回避状態。フォトセンサのみが動作し、黒ラインを検知した場合に車体を回避する。
7. **404**: 検索タイムアウト時の状態。パラメータに基づいて前進・回転動作を実行する。

---

## 詳細仕様書

### ステート遷移図
```
first → search → calibrated_approach → found → step_forward → search
        ↓           ↓ (timeout)                      ↑          ↓
   avoid_fall     404 ─────────────────────────────────┘    avoid_fall
        ↑                                                      ↑
    (photo)                                               (photo)
```

注意: avoid_fall状態への遷移は以下の状態からのみ可能
- first状態
- search状態  
- step_forward状態
- 404状態

calibrated_approach状態およびfound状態からは遷移不可

### 各ステートの詳細仕様

#### 1. first状態
**目的**: 初期化と開始方向の設定
**動作**:
- 車体を-90°回転（一度のみ実行）
- 回転完了後、自動的にsearch状態に移行

#### 2. search状態
**目的**: ターゲットの検索と方向決定
**動作**:
- サーボを-90°〜90°の範囲でスキャン（4°ステップ）
- 車体回転とサーボ回転を同時実行（非同期処理）
- 距離センサーでターゲット検出
- 選択戦略に基づいてターゲット決定
- 車体をターゲット方向に向ける

**遷移条件**:
- ターゲット発見 → calibrated_approach状態
- タイムアウト（15秒） → 404状態

#### 3. calibrated_approach状態
**目的**: ターゲットへの精密接近
**動作**:
- 一定速度（10mm/s）でターゲットに向かって前進
- 距離センサーで距離を継続監視
- サーボ角度微調整（非同期処理）

**遷移条件**:
- 距離≤13cm → found状態

#### 4. found状態
**目的**: ターゲット発見処理
**動作**:
- found()関数呼び出し（モック実装: `console.log("found")`）
- 自動的にstep_forward状態に移行

#### 5. step_forward状態
**目的**: 次の探索位置への移動
**動作**:
1. 後退（5mm）
2. 車体回転（90°、パラメータで変更可能）
3. 前進（10mm）

**遷移条件**:
- 動作完了 → search状態

#### 6. avoid_fall状態
**目的**: 境界線検知時のターゲット確認と回避
**動作**:
1. **スキャンフェーズ**: サーボを-90°〜90°で回転し距離センサーでスキャン
2. **判定フェーズ**: 
   - ターゲット発見（距離≤distance_threshold）: found()関数実行
   - ターゲット未発見: avoid_fall_back_distance分後退
**遷移条件**:
- スキャン・判定完了 → 前の状態に復帰

#### 7. 404状態
**目的**: 検索失敗時のリカバリー動作
**動作**:
1. 前進（デフォルト10cm、パラメータ設定可能）
2. 車体回転（デフォルト30°、パラメータ設定可能）

**遷移条件**:
- 動作完了 → search状態

### パラメータ一覧

#### 検索パラメータ
```javascript
search_angle_L: -90,           // 左サーボ初期角度 (degrees)
search_angle_R: 90,            // 右サーボ最終角度 (degrees)  
search_angle_step: 4,          // サーボ角度ステップ (degrees)
search_timeout: 15000,         // 検索タイムアウト時間 (ms)
target_selection_strategy: 'nearest' // ターゲット選択戦略
```

#### 接近パラメータ
```javascript
approach_speed: 10,            // 接近速度 (mm/s)
distance_threshold: 13,        // ターゲット発見閾値 (cm)
```

#### ステップ移動パラメータ
```javascript
step_forward_distance: 10,     // 前進距離 (mm)
step_forward_angle: 90,        // 回転角度 (degrees)
step_back_distance: 5,         // 後退距離 (mm)
```

#### 落下回避パラメータ
```javascript
avoid_fall_back_distance: 10,  // 落下回避後退距離 (mm)
avoid_fall_enabled: true,      // avoid_fall機能の有効/無効切り替え
```

#### 404状態パラメータ
```javascript
recovery_forward_distance: 100, // リカバリー前進距離 (mm)
recovery_rotation_angle: 30,    // リカバリー回転角度 (degrees)
```

#### 非同期処理パラメータ
```javascript
photo_sensor_frequency: 50,    // フォトセンサー監視頻度 (Hz)
motor_control_frequency: 200,  // モーター制御頻度 (Hz)
servo_control_frequency: 50,   // サーボ制御頻度 (Hz)
```

#### 回転調整パラメータ（目視調整用）
```javascript
first_rotation_time: 1500,     // first状態での-90°回転時間 (ms)
step_rotation_time: 1600,      // step_forward状態での回転時間 (ms)
recovery_rotation_time: 333,   // 404状態での回転時間 (ms)
```

### ターゲット選択戦略

#### 利用可能な戦略
- `'nearest'`: 最も近い距離のターゲット（デフォルト）
- `'leftmost'`: 最も左側のターゲット
- `'rightmost'`: 最も右側のターゲット
- `'center_closest'`: 最も0°に近いターゲット

### 非同期処理実装

millis()を使用した擬似非同期処理：
```javascript
unsigned long tMotor, tSensor, tPhoto;

execute(robot) {
    const now = robot.millis();
    
    // モーター制御（200Hz = 5ms間隔）
    if (now - this.tMotor >= 5) {
        this.controlMotor(robot);
        this.tMotor = now;
    }
    
    // センサー読み取り（50Hz = 20ms間隔）
    if (now - this.tSensor >= 20) {
        this.readSensors(robot);
        this.tSensor = now;
    }
    
    // フォトセンサー監視（50Hz = 20ms間隔）
    // 注意: calibrated_approach状態とfound状態では監視しない
    if (this.state !== 'calibrated_approach' && this.state !== 'found') {
        if (now - this.tPhoto >= 20) {
            this.checkPhotoSensors(robot);
            this.tPhoto = now;
        }
    }
    
    // メインステート処理
    this.executeCurrentState(robot);
}
```

### ターゲット発見条件
全ての状態において以下の条件を満たした場合にターゲット発見とする：
- フォトセンサー（左または右）が黒を検知 AND
- 距離センサー値 ≤ distance_threshold（デフォルト13cm）

### 探索終了条件
- 明示的な終了条件は設定しない（無限探索モード）
- 外部からの停止指令によってのみ終了
