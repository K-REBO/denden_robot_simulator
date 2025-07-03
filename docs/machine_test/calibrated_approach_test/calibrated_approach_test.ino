#include "Arduino.h"
#include "avr/io.h"
#include "Servo.h"
//==================================================================
//  Calibrated Approach Test
//  フィードバック制御による精密接近テスト
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
#define DISTANCE_THRESHOLD    250     // Found判定距離（mm）
#define APPROACH_SPEED        120      // ターゲットに接近する際の基本速度
#define FEEDBACK_SCAN_DELAY   50      // 接近中に進路補正のためにスキャンする間隔（ミリ秒）
#define DIRECTION_CORRECTION_GAIN 1.5 // 接近中の進路補正の感度（大きいほど敏感に反応）

#define MIN_APPROACH_SPEED    80      // 接近時の最低速度
#define MAX_APPROACH_SPEED    170      // 接近時の最高速度

// モーターキャリブレーション定数
#define LEFT_MOTOR_COMPENSATION   1.0   // 左モーター補正係数
#define RIGHT_MOTOR_COMPENSATION  1.0   // 右モーター補正係数

// 状態定義
enum TestState {
  STATE_INIT,
  STATE_CALIBRATED_APPROACH,
  STATE_FOUND,
  STATE_FINISHED
};

// グローバル変数
Servo distanceSensorServo;
TestState currentState = STATE_INIT;

// タイマー変数
unsigned long lastFeedbackTime = 0;
unsigned long foundStartTime = 0;

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
  
  // サーボ初期化（正面向き）
  distanceSensorServo.attach(SERVO_PIN);
  distanceSensorServo.write(90);
  
  // LEDテスト
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("Calibrated Approach Test initialized");
  Serial.println("Starting calibrated approach...");
  
  currentState = STATE_CALIBRATED_APPROACH;
}

//==================================================================
void loop() {
  unsigned long now = millis();
  
  switch(currentState) {
    case STATE_INIT:
      // 初期化完了済み
      break;
      
    case STATE_CALIBRATED_APPROACH:
      executeCalibratedApproach(now);
      break;
      
    case STATE_FOUND:
      executeFound(now);
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
void executeCalibratedApproach(unsigned long now) {
  int currentDistance = getDistance();
  int leftPhoto = getL_Photo();
  int rightPhoto = getR_Photo();
  
  // デバッグ出力（常に表示）
  static unsigned long lastDebugTime = 0;
  if (now - lastDebugTime >= 500) { // 0.5秒間隔に変更
    Serial.print("Distance: ");
    Serial.print(currentDistance);
    Serial.print("mm, L_Photo: ");
    Serial.print(leftPhoto);
    Serial.print(", R_Photo: ");
    Serial.println(rightPhoto);
    lastDebugTime = now;
  }
  
  // ターゲット発見条件チェック
  if (currentDistance <= DISTANCE_THRESHOLD && (leftPhoto == 1 || rightPhoto == 1)) {
    setMotorBrake(); // 電磁ブレーキで停止
    Serial.println("TARGET FOUND!");
    Serial.print("Found at distance: ");
    Serial.print(currentDistance);
    Serial.println("mm");
    
    currentState = STATE_FOUND;
    foundStartTime = now;
    return;
  }

  // フォトセンサーによる停止判定（ターゲット発見でない場合）- 一時的にコメントアウト
  /*
  if ((leftPhoto == 1 || rightPhoto == 1) && currentDistance > DISTANCE_THRESHOLD) {
    setMotorBrake(); // 電磁ブレーキで一旦停止
    Serial.println("Black line detected - stopping test");
    currentState = STATE_FINISHED;
    return;
  }
  */
  
  // フィードバック制御による方向修正
  performFeedbackControl(now);
}

//==================================================================
void executeFound(unsigned long now) {
  // ブザーを2回鳴らす
  Serial.println("Target found! Beeping twice...");
  for (int i = 0; i < 2; i++) {
    tone(LED_PIN, 1000, 200); // 1kHzのブザーを200ms鳴らす
    delay(400); // 400ms待つ
  }

  // 回転動作（Speed200で365ms）
  Serial.println("Rotating for 365ms at speed 200...");
  setMotorSpeeds(-200, 200); // 左回転
  delay(365);
  setMotorSpeeds(0, 0); // 停止

  // テスト再開
  Serial.println("Restarting test...");
  currentState = STATE_CALIBRATED_APPROACH;
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
  return digitalRead(PHOTO_L_PIN); // デジタル読み取り（0 or 1）
}

int getR_Photo() {
  return digitalRead(PHOTO_R_PIN); // デジタル読み取り（0 or 1）
}

void setMotorSpeeds(int leftSpeed, int rightSpeed) {
  // モーター補正係数を適用
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
  
  Serial.print("Motor speeds: L=");
  Serial.print(leftSpeed);
  Serial.print(", R=");
  Serial.println(rightSpeed);
  
  setMotorSpeeds(leftSpeed, rightSpeed);
}