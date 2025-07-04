#include "Arduino.h"
#include "avr/io.h"
#include "Servo.h"
//==================================================================
//  探索ロボットの製作【直接アプローチ戦略】
//  差動駆動ロボットによるターゲット探索・接近アルゴリズム
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

// アルゴリズムパラメータ
#define SEARCH_ANGLE_L        -80     // サーボの左方向の最大探索角度（-90〜90度）
#define SEARCH_ANGLE_R        80      // サーボの右方向の最大探索角度（-90〜90度）
#define SEARCH_ANGLE_STEP     2       // 探索時にサーボを動かす角度のステップ
#define SEARCH_TIMEOUT        15000   // 探索を開始してからタイムアウトするまでの時間（ミリ秒）
#define APPROACH_SPEED        150      // ターゲットに接近する際の基本速度
#define DISTANCE_THRESHOLD    250      // ターゲットを発見したと判断する距離（mm）
#define FEEDBACK_SCAN_DELAY   30      // 接近中に進路補正のためにスキャンする間隔（ミリ秒）
#define DIRECTION_CORRECTION_GAIN 2.0 // 接近中の進路補正の感度（大きいほど敏感に反応）

#define MIN_APPROACH_SPEED    80      // 接近時の最低速度
#define MAX_APPROACH_SPEED    130      // 接近時の最高速度

#define STEP_FORWARD_DISTANCE 10      // STATE_STEP_FORWARDで前進する距離（現在未使用）
#define RECOVERY_FORWARD_DISTANCE 100 // STATE_404で前進する距離（現在未使用）
#define RECOVERY_ROTATION_ANGLE 60    // STATE_404で回転する角度（現在未使用）

#define FIRST_ROTATION_TIME   150     // STATE_FIRSTで最初に回転する時間（ミリ秒）365ms = 90度回転
#define STEP_ROTATION_TIME    1600    // STATE_STEP_FORWARDで回転する時間（ミリ秒）

#define RECOVERY_ROTATION_TIME_MS 333 // STATE_404（タイムアウト後）でリカバリーのために回転する時間（ミリ秒）

// スキャン結果を格納する配列のサイズ
#define MAX_SCAN_RESULTS 100

// モーターキャリブレーション定数
#define LEFT_MOTOR_COMPENSATION   1.1   // 左モーターの出力補正係数（1.0が基準）
#define RIGHT_MOTOR_COMPENSATION  1.0   // 右モーターの出力補正係数（1.0が基準）

// 状態定義
enum RobotState {
  STATE_FIRST,
  STATE_SEARCH,
  STATE_CALIBRATED_APPROACH,
  STATE_FOUND,
  STATE_STEP_FORWARD,
  STATE_AVOID_FALL,
  STATE_404
};

// グローバル変数
Servo distanceSensorServo;
RobotState currentState = STATE_FIRST;
RobotState previousState = STATE_FIRST;

// タイマー変数
unsigned long searchStartTime = 0;
unsigned long stepForwardStartTime = 0;
unsigned long lastFeedbackTime = 0;
unsigned long tPhoto = 0;

// スキャン関連変数
int currentServoAngle = SEARCH_ANGLE_L;
int scanResults[MAX_SCAN_RESULTS][2]; // [angle, distance]
int scanResultCount = 0;
int targetAngle = 0;

// step_forward関連変数
int stepForwardPhase = 0; // 0:後退, 1:回転, 2:前進
bool isFirstInitialized = false;

// avoid_fall関連変数
int avoidFallPhase = 0;
int avoidFallServoAngle = -90;
int avoidFallScanResults[MAX_SCAN_RESULTS][2];
int avoidFallScanCount = 0;

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
  
  // モーター制御ピン設定
  pinMode(M1_IN1_PIN, OUTPUT);
  pinMode(M1_IN2_PIN, OUTPUT);
  pinMode(M2_IN1_PIN, OUTPUT);
  pinMode(M2_IN2_PIN, OUTPUT);
  
  // サーボ初期化
  distanceSensorServo.attach(SERVO_PIN);
  distanceSensorServo.write(90); // 正面向き
  
  // LEDテスト
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("Direct Approach Strategy initialized");
  Serial.println("Starting exploration...");
}

//==================================================================
void loop() {
  unsigned long now = millis();
  
  // フォトセンサー監視（found状態以外）
  if (currentState != STATE_FOUND) {
    if (now - tPhoto >= 20) { // 50Hz
      checkPhotoSensors();
      tPhoto = now;
    }
  }
  
  // メインステート処理
  executeCurrentState(now);
}

//==================================================================
void executeCurrentState(unsigned long now) {
  switch(currentState) {
    case STATE_FIRST:
      executeFirst(now);
      break;
    case STATE_SEARCH:
      executeSearch(now);
      break;
    case STATE_CALIBRATED_APPROACH:
      executeCalibratedApproach(now);
      break;
    case STATE_FOUND:
      executeFound(now);
      break;
    case STATE_STEP_FORWARD:
      executeStepForward(now);
      break;
    case STATE_AVOID_FALL:
      executeAvoidFall(now);
      break;
    case STATE_404:
      execute404(now);
      break;
    default:
      currentState = STATE_FIRST;
      break;
  }
}

//==================================================================
void executeFirst(unsigned long now) {
  if (!isFirstInitialized) {
    Serial.println("STATE: FIRST - Starting -90 degree rotation");
    setMotorSpeeds(-150, 150); // 左回転（90度回転用速度）
    stepForwardStartTime = now;
    isFirstInitialized = true;
    return;
  }
  
  if (now - stepForwardStartTime >= FIRST_ROTATION_TIME) {
    setMotorSpeeds(0, 0);
    currentState = STATE_SEARCH;
    searchStartTime = now;
    Serial.println("STATE: FIRST completed -> SEARCH");
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
void executeCalibratedApproach(unsigned long now) {
  int currentDistance = getDistance();
  int leftPhoto = getL_Photo();
  int rightPhoto = getR_Photo();
  

  // ターゲット発見条件チェック
  if (currentDistance <= DISTANCE_THRESHOLD && (leftPhoto == 1 || rightPhoto == 1)) {
    Serial.println("Target found with photo detection -> FOUND");
    currentState = STATE_FOUND;
    setMotorBrake();
    return;
  }

    // フォトセンサーによる落下判定（ターゲット発見でない場合）
  if ((leftPhoto == 1 || rightPhoto == 1) && currentDistance > DISTANCE_THRESHOLD) {
    Serial.println("Black line detected in CALIBRATED_APPROACH -> AVOID_FALL");
    previousState = currentState;
    currentState = STATE_AVOID_FALL;
    resetAvoidFallState();
    return;
  }
  
  
  // フィードバック制御による方向修正
  performFeedbackControl(now);
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

//==================================================================
void executeFound(unsigned long now) {
  Serial.println("FOUND!");
  setMotorBrake(); // モーター停止

  // 2秒間、LEDとブザーを鳴らし続ける（ブロッキング）
  digitalWrite(LED_PIN, HIGH);
  tone(LED_PIN, 1000); // 1kHzのブザー音
  delay(2000);
  digitalWrite(LED_PIN, LOW);
  noTone(LED_PIN);

  // step_forward状態に移行
  currentState = STATE_STEP_FORWARD;
  stepForwardPhase = 0;
  stepForwardStartTime = millis(); // delay後はmillis()で現在時刻を再取得
  Serial.println("STATE: FOUND -> STEP_FORWARD");
}

//==================================================================
void executeStepForward(unsigned long now) {
  unsigned long elapsed = now - stepForwardStartTime;
  
  switch(stepForwardPhase) {
    case 0: // 後退フェーズ
      setMotorSpeeds(-50, -50);
      if (elapsed >= 200) { // 5mm後退完了
        stepForwardPhase = 1;
        stepForwardStartTime = now;
      }
      break;
      
    case 1: // 回転フェーズ
      setMotorSpeeds(-80, 80);
      if (elapsed >= STEP_ROTATION_TIME) {
        stepForwardPhase = 2;
        stepForwardStartTime = now;
      }
      break;
      
    case 2: // 前進フェーズ
      setMotorSpeeds(50, 50);
      if (elapsed >= 200) { // 10mm前進完了
        setMotorSpeeds(0, 0);
        // search状態に戻る
        currentState = STATE_SEARCH;
        resetSearchState();
        Serial.println("STATE: STEP_FORWARD -> SEARCH");
      }
      break;
  }
}

//==================================================================
void executeAvoidFall(unsigned long now) {
  switch(avoidFallPhase) {
    case 0: // サーボスキャンフェーズ
      if (avoidFallServoAngle <= 90) {
        distanceSensorServo.write(90 + avoidFallServoAngle);
        delay(50);
        
        int distance = getDistance();
        if (distance <= DISTANCE_THRESHOLD) {
          avoidFallScanResults[avoidFallScanCount][0] = avoidFallServoAngle;
          avoidFallScanResults[avoidFallScanCount][1] = distance;
          avoidFallScanCount++;
        }
        
        avoidFallServoAngle += SEARCH_ANGLE_STEP;
        return;
      }
      
      // スキャン完了、結果判定
      if (avoidFallScanCount > 0) {
        Serial.println("Target found in avoid_fall");
        digitalWrite(LED_PIN, HIGH);
        delay(500);
        digitalWrite(LED_PIN, LOW);
        
        currentState = previousState;
        resetAvoidFallState();
        return;
      } else {
        avoidFallPhase = 1;
        stepForwardStartTime = now;
      }
      break;
      
    case 1: // 後退フェーズ
      setMotorSpeeds(-50, -50);
      if (now - stepForwardStartTime >= 300) { // 15mm後退
        setMotorSpeeds(0, 0);
        currentState = previousState;
        resetAvoidFallState();
        Serial.println("STATE: AVOID_FALL completed");
      }
      break;
  }
}

//==================================================================
void execute404(unsigned long now) {
  unsigned long elapsed = now - stepForwardStartTime;
  
  if (elapsed < 2000) { // 前進フェーズ（2秒で100mm前進）
    setMotorSpeeds(50, 50);
  } else if (elapsed < 2000 + RECOVERY_ROTATION_TIME_MS) { // 回転フェーズ
    setMotorSpeeds(-80, 80);
  } else {
    // 動作完了、search状態に戻る
    setMotorSpeeds(0, 0);
    currentState = STATE_SEARCH;
    resetSearchState();
    Serial.println("STATE: 404 -> SEARCH");
  }
}

//==================================================================
// ユーティリティ関数
//==================================================================

int getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  unsigned long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = duration * 0.034 / 2; // cm to mm conversion
  
  return distance * 10; // convert to mm
}

int getL_Photo() {
  return digitalRead(PHOTO_L_PIN); // デジタル読み取り（0 or 1）
}

int getR_Photo() {
  return digitalRead(PHOTO_R_PIN); // デジタル読み取り（0 or 1）
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
  searchStartTime = 0;
  Serial.println("Search state reset");
}

void resetAvoidFallState() {
  avoidFallPhase = 0;
  avoidFallServoAngle = -90;
  avoidFallScanCount = 0;
}



void checkPhotoSensors() {
  // フォトセンサー値を読み取り
  int leftPhoto = getL_Photo();
  int rightPhoto = getR_Photo();
  
  // フォトセンサー状態をシリアルに出力
  Serial.print("Photo L: ");
  Serial.print(leftPhoto == 1 ? "BLACK" : "WHITE");
  Serial.print(", R: ");
  Serial.println(rightPhoto == 1 ? "BLACK" : "WHITE");
  
  // フォトセンサー監視
  if (leftPhoto == 1 || rightPhoto == 1) {
    // 黒ライン検知、avoid_fall状態に移行
    if (currentState == STATE_FIRST || currentState == STATE_SEARCH || 
        currentState == STATE_STEP_FORWARD || currentState == STATE_404) {
      Serial.println("Black line detected -> AVOID_FALL");
      previousState = currentState;
      currentState = STATE_AVOID_FALL;
      resetAvoidFallState();
    }
  }
}