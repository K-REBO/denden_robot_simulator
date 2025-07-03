#include "Arduino.h"
#include "avr/io.h"
#include "Servo.h"
//==================================================================
//  まっすぐ進んでFound判定とブザーテスト
//  差動駆動ロボットによる直進とターゲット発見テスト
//  Arduino UNO（ＡＶＲマイコン）プログラム
//==================================================================

// ピンアサイン定義（arduino_pin_assign.mdに基づく）
#define TRIG_PIN     12  // 距離センサ Trig信号
#define ECHO_PIN     13  // 距離センサ Echo信号
#define SERVO_PIN    10  // サーボモータ SG90
#define PHOTO_L_PIN  4   // 左フォトセンサ HC14出力 (Vp0)
#define PHOTO_R_PIN  9   // 右フォトセンサ HC14出力 (Vp1)
#define M2_IN1_PIN   3   // 左モータ方向制御
#define M2_IN2_PIN   5   // 左モータ方向制御
#define M1_IN1_PIN   11  // 右モータ方向制御
#define M1_IN2_PIN   6   // 右モータ方向制御
#define LED_PIN      7   // LED/警報信号

// テストパラメータ
#define FORWARD_SPEED         100      // 前進速度
#define BACKWARD_TIME_MS      500     // 後退時間（0.5秒）
#define DISTANCE_THRESHOLD    250     // 15cm in mm（Found判定距離）

// 探索パラメータ（direct_approach_strategyから）
#define SEARCH_ANGLE_L        -80     // サーボの左方向の最大探索角度（-90〜90度）
#define SEARCH_ANGLE_R        80      // サーボの右方向の最大探索角度（-90〜90度）
#define SEARCH_ANGLE_STEP     2       // 探索時にサーボを動かす角度のステップ
#define SEARCH_TIMEOUT        15000   // 探索を開始してからタイムアウトするまでの時間（ミリ秒）
#define APPROACH_SPEED        150      // ターゲットに接近する際の基本速度
#define FEEDBACK_SCAN_DELAY   30      // 接近中に進路補正のためにスキャンする間隔（ミリ秒）
#define DIRECTION_CORRECTION_GAIN 2.0 // 接近中の進路補正の感度（大きいほど敏感に反応）

#define MIN_APPROACH_SPEED    80      // 接近時の最低速度
#define MAX_APPROACH_SPEED    130      // 接近時の最高速度

#define RECOVERY_ROTATION_TIME_MS 999 // STATE_404（タイムアウト後）でリカバリーのために回転する時間（ミリ秒）

// スキャン結果を格納する配列のサイズ
#define MAX_SCAN_RESULTS 100

// モーターキャリブレーション定数
#define LEFT_MOTOR_COMPENSATION   1.0   // 左モーター補正係数
#define RIGHT_MOTOR_COMPENSATION  0.95   // 右モーター補正係数

// 状態定義
enum TestState {
  STATE_INIT,
  STATE_SEARCH,
  STATE_CALIBRATED_APPROACH,
  STATE_BACKWARD,
  STATE_FOUND,
  STATE_404,
  STATE_FINISHED
};

// グローバル変数
Servo distanceSensorServo;
TestState currentState = STATE_INIT;

// タイマー変数
unsigned long searchStartTime = 0;
unsigned long backwardStartTime = 0;
unsigned long foundStartTime = 0;
unsigned long lastFeedbackTime = 0;
unsigned long stepForwardStartTime = 0;

// スキャン関連変数
int currentServoAngle = SEARCH_ANGLE_L;
int scanResults[MAX_SCAN_RESULTS][2]; // [angle, distance]
int scanResultCount = 0;
int targetAngle = 0;

// calibrated_approach関連変数
int currentScanIndex = 0;
int feedbackDistances[3]; // [left, center, right]
int feedbackScanAngles[3] = {-15, 0, 15};

// モーターキャリブレーション関連変数
float leftMotorCompensation = LEFT_MOTOR_COMPENSATION;
float rightMotorCompensation = RIGHT_MOTOR_COMPENSATION;

//==================================================================
void setup() {
  Serial.begin(9600);
  
  // ピン設定
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(PHOTO_L_PIN, INPUT);
  pinMode(PHOTO_R_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // フォトセンサーピン設定（参考コードに基づく）
  DDRD = DDRD | B00000000;  // D4, D9を入力ポート設定
  
  // モーター制御ピン設定
  pinMode(M1_IN1_PIN, OUTPUT);
  pinMode(M1_IN2_PIN, OUTPUT);
  pinMode(M2_IN1_PIN, OUTPUT);
  pinMode(M2_IN2_PIN, OUTPUT);
  
  // サーボ初期化（正面向き）
  distanceSensorServo.attach(SERVO_PIN);
  distanceSensorServo.write(90);
  
  // LEDテスト
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("Straight Forward Found Test initialized");
  Serial.println("Starting search...");
  
  currentState = STATE_SEARCH;
  searchStartTime = millis();
}

//==================================================================
void loop() {
  unsigned long now = millis();
  
  switch(currentState) {
    case STATE_INIT:
      // 初期化完了済み
      break;
      
    case STATE_SEARCH:
      executeSearch(now);
      break;
      
    case STATE_CALIBRATED_APPROACH:
      executeCalibratedApproach(now);
      break;
      
    case STATE_BACKWARD:
      executeBackward(now);
      break;
      
    case STATE_FOUND:
      executeFound(now);
      break;
      
    case STATE_404:
      execute404(now);
      break;
      
    case STATE_FINISHED:
      executeFinished();
      break;
      
    default:
      currentState = STATE_INIT;
      break;
  }
}

//==================================================================
void executeSearch(unsigned long now) {
  unsigned long elapsedTime = now - searchStartTime;
  
  // タイムアウトチェック
  if (elapsedTime >= SEARCH_TIMEOUT) {
    Serial.println("STATE: SEARCH timeout -> 404");
    currentState = STATE_404;
    stepForwardStartTime = now;
    return;
  }
  
  // サーボスキャン実行
  if (currentServoAngle <= SEARCH_ANGLE_R) {
    distanceSensorServo.write(90 + currentServoAngle); // サーボ角度調整
    delay(50); // サーボ安定待機
    
    int distance = getDistance();
    
    if (distance <= 4000 && distance >= 20) { // 有効範囲内
      scanResults[scanResultCount][0] = currentServoAngle;
      scanResults[scanResultCount][1] = distance;
      scanResultCount++;
      
      Serial.print("Valid scan: angle=");
      Serial.print(currentServoAngle);
      Serial.print(", distance=");
      Serial.println(distance);
    }
    
    currentServoAngle += SEARCH_ANGLE_STEP;
    
    return;
  }
  
  // スキャン完了
  Serial.print("Scan completed! Results: ");
  Serial.println(scanResultCount);
  
  // ターゲット選択
  if (scanResultCount > 0) {
    targetAngle = selectTarget();
    Serial.print("Target selected: angle=");
    Serial.println(targetAngle);
    
    // ターゲット方向に向ける
    currentState = STATE_CALIBRATED_APPROACH;
    distanceSensorServo.write(90 + targetAngle);
    setMotorSpeeds(0, 0);
    Serial.println("STATE: SEARCH -> CALIBRATED_APPROACH");
  } else {
    Serial.println("No target found -> 404");
    currentState = STATE_404;
    stepForwardStartTime = now;
  }
}

//==================================================================
void executeBackward(unsigned long now) {
  // 後退実行
  setMotorSpeeds(-FORWARD_SPEED, -FORWARD_SPEED);

  // タイムアウトチェック
  if (now - backwardStartTime >= BACKWARD_TIME_MS) {
    Serial.println("Backward time finished - stopping");
    setMotorSpeeds(0, 0);
    restartTest();
    return;
  }
}

//==================================================================
void executeCalibratedApproach(unsigned long now) {
  int currentDistance = getDistance();
  int leftPhoto = getL_Photo();
  int rightPhoto = getR_Photo();
  
  // フォトセンサーデバッグ出力（0.5秒間隔）
  static unsigned long lastPhotoDebugTime = 0;
  if (now - lastPhotoDebugTime >= 500) {
    Serial.print("PHOTO DEBUG: L=");
    Serial.print(leftPhoto);
    Serial.print(" (");
    Serial.print(leftPhoto == 1 ? "BLACK" : "WHITE");
    Serial.print("), R=");
    Serial.print(rightPhoto);
    Serial.print(" (");
    Serial.print(rightPhoto == 1 ? "BLACK" : "WHITE");
    Serial.print("), Dist=");
    Serial.print(currentDistance);
    Serial.println("mm");
    lastPhotoDebugTime = now;
  }
  
  // Found判定の詳細チェック
  bool distanceCondition = (currentDistance <= DISTANCE_THRESHOLD);
  bool photoCondition = (leftPhoto == 1 || rightPhoto == 1);
  
  // 詳細デバッグ出力
  if (distanceCondition || photoCondition) {
    Serial.print(">> Found Check: Dist=");
    Serial.print(currentDistance);
    Serial.print("mm(≤250?");
    Serial.print(distanceCondition ? "YES" : "NO");
    Serial.print("), Photo L=");
    Serial.print(leftPhoto);
    Serial.print(" R=");
    Serial.print(rightPhoto);
    Serial.print("(Black?");
    Serial.print(photoCondition ? "YES" : "NO");
    Serial.println(")");
  }
  
  // ターゲット発見条件チェック
  if (distanceCondition && photoCondition) {
    setMotorBrake(); // 電磁ブレーキで停止
    Serial.println("***** TARGET FOUND! *****");
    Serial.print("Found at distance: ");
    Serial.print(currentDistance);
    Serial.print("mm, L_Photo: ");
    Serial.print(leftPhoto);
    Serial.print(", R_Photo: ");
    Serial.println(rightPhoto);
    
    currentState = STATE_FOUND;
    foundStartTime = now;
    return;
  }

  // フォトセンサーによる落下判定（ターゲット発見でない場合）
  if ((leftPhoto == 1 || rightPhoto == 1) && currentDistance > DISTANCE_THRESHOLD) {
    setMotorBrake(); // 電磁ブレーキで一旦停止
    Serial.println("Black line detected - moving backward");
    currentState = STATE_BACKWARD;
    backwardStartTime = now;
    return;
  }
  
  // フィードバック制御による方向修正
  performFeedbackControl(now);
}

//==================================================================
void executeFound(unsigned long now) {
  // この関数は発見時に一度だけ実行されるブロッキング処理です

  // ブザーを2回鳴らす
  Serial.println("Target found! Beeping twice...");
  for (int i = 0; i < 2; i++) {
    tone(LED_PIN, 1000, 200); // 1kHzのブザーを200ms鳴らす
    delay(400); // 400ms待つ
  }

  // 回転動作（Speed200で1000ms）
  Serial.println("Rotating for 1000ms at speed 200...");
  setMotorSpeeds(-200, 200); // 左回転
  delay(1000);
  setMotorSpeeds(0, 0); // 停止

  // テストを再開
  Serial.println("Restarting test...");
  restartTest();
}

//==================================================================
void execute404(unsigned long now) {
  unsigned long elapsed = now - stepForwardStartTime;
  
  if (elapsed < 2000) { // 前進フェーズ（2秒で100mm前進）
    setMotorSpeeds(50, 50);
  } else if (elapsed < 2000 + RECOVERY_ROTATION_TIME_MS) { // 回転フェーズ
    setMotorSpeeds(80, -80);
  } else {
    // 動作完了、search状態に戻る
    setMotorSpeeds(0, 0);
    currentState = STATE_SEARCH;
    resetSearchState();
    Serial.println("STATE: 404 -> SEARCH");
  }
}

//==================================================================
void executeFinished() {
  // 全ての動作を停止
  setMotorSpeeds(0, 0);
  digitalWrite(LED_PIN, LOW);
  noTone(LED_PIN);
  
  // 完了メッセージを定期的に出力
  static unsigned long lastMessageTime = 0;
  unsigned long now = millis();
  
  if (now - lastMessageTime >= 5000) { // 5秒間隔
    Serial.println("Test finished. Reset to run again.");
    lastMessageTime = now;
  }
}

//==================================================================
void restartTest() {
  currentState = STATE_SEARCH;
  resetSearchState();
  Serial.println("Starting search...");
}

//==================================================================
// センサー・制御関数
//==================================================================

int getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms タイムアウト追加
  
  // タイムアウトまたは無効な値をチェック
  if (duration == 0 || duration > 25000) { // 4m以上は無効
    return 9999; // 無効値として大きな値を返す
  }
  
  int distance = duration * 0.034 / 2; // cm計算
  
  // 最小距離チェック（2cm未満は無効）
  if (distance < 2) {
    return 9999;
  }
  
  return distance * 10; // mm変換
}

int getL_Photo() {
  unsigned long int P1_val = digitalRead(PHOTO_L_PIN); // フォトセンサVp0数値取得
  return (int)P1_val; // デジタル読み取り（0 or 1）
}

int getR_Photo() {
  unsigned long int P2_val = digitalRead(PHOTO_R_PIN); // フォトセンサVp1数値取得
  return (int)P2_val; // デジタル読み取り（0 or 1）
}

void setMotorSpeeds(int leftSpeed, int rightSpeed) {
  // モーター補正��数を適用
  int compensatedLeftSpeed = (int)(leftSpeed * leftMotorCompensation);
  int compensatedRightSpeed = (int)(rightSpeed * rightMotorCompensation);
  
  // 速度制限（0-255）
  compensatedLeftSpeed = constrain(compensatedLeftSpeed, -255, 255);
  compensatedRightSpeed = constrain(compensatedRightSpeed, -255, 255);
  
  // 左モータ制御 (M2)
  if (compensatedLeftSpeed > 0) {
    analogWrite(M2_IN1_PIN, compensatedLeftSpeed);
    analogWrite(M2_IN2_PIN, 0);
  } else if (compensatedLeftSpeed < 0) {
    analogWrite(M2_IN1_PIN, 0);
    analogWrite(M2_IN2_PIN, -compensatedLeftSpeed);
  } else {
    analogWrite(M2_IN1_PIN, 0);
    analogWrite(M2_IN2_PIN, 0);
  }
  
  // 右モータ制御 (M1)
  if (compensatedRightSpeed > 0) {
    analogWrite(M1_IN1_PIN, compensatedRightSpeed);
    analogWrite(M1_IN2_PIN, 0);
  } else if (compensatedRightSpeed < 0) {
    analogWrite(M1_IN1_PIN, 0);
    analogWrite(M1_IN2_PIN, -compensatedRightSpeed);
  } else {
    analogWrite(M1_IN1_PIN, 0);
    analogWrite(M1_IN2_PIN, 0);
  }
}

void setMotorBrake() {
  // 両方のモーターのIN1, IN2をHIGHにして電磁ブレーキをかける
  digitalWrite(M1_IN1_PIN, HIGH);
  digitalWrite(M1_IN2_PIN, HIGH);
  digitalWrite(M2_IN1_PIN, HIGH);
  digitalWrite(M2_IN2_PIN, HIGH);
}

void setServo(int angle) {
  distanceSensorServo.write(90 + constrain(angle, -90, 90));
}

int selectTarget() {
  if (scanResultCount == 0) return 0;
  
  // 最も近いターゲットを選択
  int minDistance = scanResults[0][1];
  int targetAngle = scanResults[0][0];
  
  for (int i = 1; i < scanResultCount; i++) {
    if (scanResults[i][1] < minDistance) {
      minDistance = scanResults[i][1];
      targetAngle = scanResults[i][0];
    }
  }
  
  return targetAngle;
}

void resetSearchState() {
  currentServoAngle = SEARCH_ANGLE_L;
  scanResultCount = 0;
  searchStartTime = millis();
  Serial.println("Search state reset");
}

//==================================================================
void performFeedbackControl(unsigned long now) {
  // フィードバックスキャンの実行
  if (now - lastFeedbackTime >= FEEDBACK_SCAN_DELAY) {
    performFeedbackScan();
    lastFeedbackTime = now;
  }
  
  // 3方向のスキャンが完了したら速度調整
  if (currentScanIndex >= 3) {
    adjustMotorSpeeds();
    currentScanIndex = 0;
  }
}

//==================================================================
void performFeedbackScan() {
  if (currentScanIndex < 3) {
    int scanAngle = feedbackScanAngles[currentScanIndex];
    distanceSensorServo.write(90 + scanAngle);
    delay(FEEDBACK_SCAN_DELAY);
    
    int distance = getDistance();
    feedbackDistances[currentScanIndex] = distance;
    
    Serial.print("Feedback scan: angle=");
    Serial.print(scanAngle);
    Serial.print(", distance=");
    Serial.println(distance);
    
    currentScanIndex++;
  }
}

//==================================================================
void adjustMotorSpeeds() {
  int leftDistance = feedbackDistances[0];
  int centerDistance = feedbackDistances[1];
  int rightDistance = feedbackDistances[2];
  
  // 方向修正計算
  float directionError = (leftDistance - rightDistance) * DIRECTION_CORRECTION_GAIN;
  
  // 左右モーター速度計算
  int leftSpeed = APPROACH_SPEED - (int)directionError;
  int rightSpeed = APPROACH_SPEED + (int)directionError;
  
  // 速度制限
  leftSpeed = constrain(leftSpeed, MIN_APPROACH_SPEED, MAX_APPROACH_SPEED);
  rightSpeed = constrain(rightSpeed, MIN_APPROACH_SPEED, MAX_APPROACH_SPEED);
  
  setMotorSpeeds(leftSpeed, rightSpeed);
}