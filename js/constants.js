// Denden Robot Simulator - 定数定義
// すべてのマジックナンバーを意味のある定数として定義

// === スコアリング関連 ===
const SCORING = {
    TARGET_DETECTION_DISTANCE: 130,    // ターゲット検出距離 (mm) = 13cm
    NEW_TARGET_POINTS: 10,              // 未発見ターゲット到達時のポイント
    REVISIT_TARGET_POINTS: 2            // 発見済みターゲット再訪時のポイント
};

// === ロボット制御関連 ===
const ROBOT_CONTROL = {
    STOP_SPEED: 0,                      // モーター停止速度
    DEFAULT_TURN_SPEED: 100,            // デフォルト旋回速度
    DEFAULT_FORWARD_SPEED: 150,         // デフォルト前進速度
    REVERSE_SPEED: -150,                // 後退速度
    SERVO_CENTER_ANGLE: 0,              // サーボ中央角度
    SERVO_LEFT_ANGLE: -90,              // サーボ左端角度
    SERVO_RIGHT_ANGLE: 90               // サーボ右端角度
};

// === 探索アルゴリズム関連 ===
const EXPLORATION = {
    // 壁沿い探索
    WALL_AVOIDANCE_DISTANCE: 150,      // 壁回避距離 (mm)
    WALL_TURN_SPEED_LEFT: -100,        // 壁回避時左モーター速度
    WALL_TURN_SPEED_RIGHT: 100,        // 壁回避時右モーター速度
    WALL_TURN_DURATION: 500,           // 壁回避ターン時間 (ms)
    
    // ターゲット衝突回避
    TARGET_COLLISION_DISTANCE: 50,     // ターゲット衝突回避距離 (mm) - スコアリング妨げない距離
    TARGET_COLLISION_TURN_SPEED: 80,   // ターゲット衝突回避旋回速度
    TARGET_COLLISION_TURN_DURATION: 300, // ターゲット衝突回避ターン時間 (ms)
    
    // 移動時間
    FORWARD_MOVE_DURATION: 400,        // 前進移動時間 (ms)
    EXPLORATION_MOVE_DURATION: 200,    // 探索移動時間 (ms)
    WALL_SCAN_TURN_DURATION: 300,     // 壁スキャン時のターン時間 (ms)
    
    // センサー角度とスキャン
    SCAN_LEFT_ANGLE: -45,              // 左スキャン角度
    SCAN_RIGHT_ANGLE: 45,              // 右スキャン角度
    SCAN_DISTANCE_THRESHOLD: 200,      // スキャン距離判定閾値 (mm)
    SENSOR_DELAY: 100,                 // センサー応答待機時間 (ms)
    
    // スパイラル探索
    SPIRAL_INITIAL_RADIUS: 100,        // スパイラル初期半径 (mm)
    SPIRAL_RADIUS_INCREMENT: 50,       // スパイラル半径増分
    SPIRAL_MAX_RADIUS: 500,            // スパイラル最大半径 (mm)
    SPIRAL_AVOIDANCE_TURN_SPEED: 100,  // スパイラル回避ターン速度
    SPIRAL_AVOIDANCE_TURN_DURATION: 400, // スパイラル回避ターン時間 (ms)
    SPIRAL_COLLISION_AVOIDANCE_DURATION: 350, // スパイラル衝突回避時間 (ms)
    SPIRAL_TURN_BASE_TIME: 200,        // スパイラル基本ターン時間 (ms)
    
    // ランダム探索
    RANDOM_MIN_MOVE_TIME: 200,         // ランダム移動最小時間 (ms)
    RANDOM_MAX_MOVE_TIME: 800,         // ランダム移動最大時間 (ms)
    RANDOM_MIN_SPEED: 80,              // ランダム移動最小速度
    RANDOM_MAX_SPEED: 160,             // ランダム移動最大速度
    RANDOM_AVOIDANCE_BASE_TIME: 300,   // ランダム回避基本時間 (ms)
    RANDOM_AVOIDANCE_EXTRA_TIME: 400,  // ランダム回避追加時間 (ms)
    RANDOM_COLLISION_AVOIDANCE_TIME: 250, // ランダム衝突回避時間 (ms)
    RANDOM_TURN_PROBABILITY: 0.7,      // ランダムターン発生確率
    RANDOM_TURN_MIN_TIME: 100,         // ランダムターン最小時間 (ms)
    RANDOM_TURN_MAX_TIME: 400,         // ランダムターン最大時間 (ms)
    
    // 格子探索
    GRID_CELL_SIZE: 300,               // 格子セルサイズ (mm)
    GRID_TURN_DURATION: 450,           // 格子ターン時間 (ms)
    GRID_AVOIDANCE_TURN_DURATION: 450, // 格子回避ターン時間 (ms)
    GRID_COLLISION_AVOIDANCE_DURATION: 300, // 格子衝突回避時間 (ms)
    GRID_STEPS_PER_TURN: 3,            // ターンまでのステップ数
    
    // ターゲット追跡
    TARGET_SEEKING_COLLISION_DISTANCE: 130, // ターゲット追跡時衝突回避距離 (mm)
    TARGET_SEEKING_AVOIDANCE_SPEED: 60,     // ターゲット追跡回避速度
    TARGET_SEEKING_AVOIDANCE_DURATION: 300, // ターゲット追跡回避時間 (ms)
    TARGET_SEEKING_BORDER_AVOIDANCE_DURATION: 400, // 境界回避時間 (ms)
    TARGET_APPROACH_MOVE_DURATION: 500,     // ターゲット接近移動時間 (ms)
    SCAN_ANGLE_STEP: 5,                // スキャン角度ステップ
    SCAN_DELAY: 25                     // スキャン待機時間 (ms)
};

// === フィールド関連 ===
const FIELD = {
    WIDTH: 1600,                       // フィールド幅 (mm)
    HEIGHT: 800,                       // フィールド高さ (mm)
    BORDER_WIDTH: 50,                  // 境界線幅 (mm)
    TARGET_RADIUS: 66,                 // ターゲット半径 (mm)
    TARGET_BLACK_RING_WIDTH: 74,       // ターゲット黒リング幅 (mm)
    TARGET_SPACING: 400                // ターゲット間隔 (mm)
};

// === UI関連 ===
const UI = {
    MANUAL_CONTROL_SPEEDS: {
        FORWARD: 150,
        REVERSE: -150,
        TURN_LEFT: -100,
        TURN_RIGHT: 100,
        TURN_OPPOSITE: 100
    },
    SERVO_PRESET_ANGLES: {
        LEFT: -90,
        CENTER: 0,
        RIGHT: 90
    }
};

// === 時間関連 ===
const TIMING = {
    SIMULATION_TIME_STEP: 16,          // シミュレーション時間刻み (ms) = 60FPS
    SERVO_RESPONSE_TIME: 50,           // サーボ応答時間 (ms)
    SENSOR_SCAN_DELAY: 25,             // センサースキャン遅延 (ms)
    MOVE_COMMAND_DELAY: 100            // 移動コマンド遅延 (ms)
};

// グローバルスコープに定数を公開
if (typeof window !== 'undefined') {
    window.CONST = {
        SCORING,
        ROBOT_CONTROL,
        EXPLORATION,
        FIELD,
        UI,
        TIMING
    };
}

// レガシーサポート用（CommonJS形式でもアクセス可能）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SCORING,
        ROBOT_CONTROL,
        EXPLORATION,
        FIELD,
        UI,
        TIMING
    };
}