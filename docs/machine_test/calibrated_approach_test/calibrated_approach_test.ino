#include "Arduino.h"
#include "Servo.h"

// ピンアサイン定義
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
#define APPROACH_SPEED        150
#define DISTANCE_THRESHOLD    60     // 6cm in mm
#define FEEDBACK_SCAN_DELAY   30
#define DIRECTION_CORRECTION_GAIN 2.0
#define MIN_APPROACH_SPEED    80
#define MAX_APPROACH_SPEED    200

// 状態定義
enum TestState {
  STATE_CALIBRATED_APPROACH,
  STATE_FOUND,
  STATE_COMPLETED
};

// グローバル変数
Servo distanceSensorServo;
TestState currentState = STATE_CALIBRATED_APPROACH;

// タイマー変数
unsigned long lastFeedbackTime = 0;

// calibrated_approach関連変数
int currentScanIndex = 0;
int feedbackDistances[3]; // [left, center, right]
int feedbackScanAngles[3] = {-15, 0, 15};

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
  distanceSensorServo.write(90); // 正面向き
  
  // LEDテスト
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("Calibrated Approach Test Started");
  Serial.println("Place target 30-100cm in front of robot");
  Serial.println("Test will approach target using feedback control");
  
  delay(2000); // 準備時間
}

void loop() {
  unsigned long now = millis();
  
  switch(currentState) {
    case STATE_CALIBRATED_APPROACH:
      executeCalibratedApproach(now);
      break;
    case STATE_FOUND:
      executeFound(now);
      break;
    case STATE_COMPLETED:
      setMotorSpeeds(0, 0);
      Serial.println("Test completed. Reset to restart.");
      delay(5000);
      break;
  }
}

void executeCalibratedApproach(unsigned long now) {
  int currentDistance = getDistance();
  int leftPhoto = getL_Photo();
  int rightPhoto = getR_Photo();
  
  // 詳細なセンサー情報をシリアル出力
  Serial.print("=== SENSOR STATUS ===");
  Serial.print(" Distance: ");
  Serial.print(currentDistance);
  Serial.print("mm");
  
  Serial.print(" | L_Photo: ");
  Serial.print(leftPhoto);
  Serial.print("(");
  Serial.print(leftPhoto == 0 ? "WHITE" : "BLACK");
  Serial.print(")");
  
  Serial.print(" | R_Photo: ");
  Serial.print(rightPhoto);
  Serial.print("(");
  Serial.print(rightPhoto == 0 ? "WHITE" : "BLACK");
  Serial.print(")");
  
  if (leftPhoto == 1 || rightPhoto == 1) {
    Serial.print(" *** BLACK DETECTED ***");
  }
  Serial.println();
  
  // ターゲット発見条件チェック
  if (currentDistance <= DISTANCE_THRESHOLD && (leftPhoto == 1 || rightPhoto == 1)) {
    Serial.println("Target found with photo detection -> FOUND");
    currentState = STATE_FOUND;
    setMotorSpeeds(0, 0);
    return;
  }
  
  // フィードバック制御による方向修正
  performFeedbackControl(now);
}

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

void performFeedbackScan() {
  if (currentScanIndex < 3) {
    int scanAngle = feedbackScanAngles[currentScanIndex];
    distanceSensorServo.write(90 + scanAngle);
    delay(FEEDBACK_SCAN_DELAY);
    
    int distance = getDistance();
    feedbackDistances[currentScanIndex] = distance;
    
    Serial.print("--- Feedback scan [");
    Serial.print(currentScanIndex + 1);
    Serial.print("/3]: servo=");
    Serial.print(90 + scanAngle);
    Serial.print("° (");
    Serial.print(scanAngle);
    Serial.print("°), distance=");
    Serial.print(distance);
    Serial.println("mm");
    
    currentScanIndex++;
  }
}

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
  
  Serial.print(">>> CONTROL: L=");
  Serial.print(leftDistance);
  Serial.print("mm, C=");
  Serial.print(centerDistance);
  Serial.print("mm, R=");
  Serial.print(rightDistance);
  Serial.print("mm | Error=");
  Serial.print(directionError);
  Serial.print(" | Motors: L=");
  Serial.print(leftSpeed);
  Serial.print(", R=");
  Serial.println(rightSpeed);
  
  setMotorSpeeds(leftSpeed, rightSpeed);
}

void executeFound(unsigned long now) {
  static unsigned long foundStartTime = 0;
  static bool foundInitialized = false;
  
  if (!foundInitialized) {
    Serial.println("TARGET FOUND!");
    foundStartTime = now;
    foundInitialized = true;
    setMotorSpeeds(0, 0);
  }
  
  unsigned long elapsed = now - foundStartTime;
  
  if (elapsed < 2000) { // 2秒間LEDとブザー
    digitalWrite(LED_PIN, HIGH);
    tone(LED_PIN, 1000); // 1kHzのブザー音
  } else if (elapsed < 12000) { // 2秒後から10秒間停止（合計12秒）
    digitalWrite(LED_PIN, LOW);
    noTone(LED_PIN);
    setMotorSpeeds(0, 0);
    if (elapsed >= 11000) { // 残り1秒でカウントダウン
      Serial.print("Restarting in: ");
      Serial.println(12 - (elapsed / 1000));
    }
  } else {
    // 12秒経過後、テストを最初からやり直し
    digitalWrite(LED_PIN, LOW);
    noTone(LED_PIN);
    
    currentState = STATE_CALIBRATED_APPROACH;
    foundInitialized = false; // リセット
    currentScanIndex = 0;
    lastFeedbackTime = 0;
    
    // サーボを正面に戻す
    distanceSensorServo.write(90);
    
    Serial.println("=== RESTARTING TEST ===");
    Serial.println("Calibrated Approach Test Restarted");
  }
}

// ユーティリティ関数
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
  return digitalRead(PHOTO_L_PIN); // 生の値を返す（0 or 1）
}

int getR_Photo() {
  return digitalRead(PHOTO_R_PIN); // 生の値を返す（0 or 1）
}

void setMotorSpeeds(int leftSpeed, int rightSpeed) {
  // 左モータ制御 (M2)
  if (leftSpeed > 0) {
    analogWrite(M2_IN1_PIN, leftSpeed);
    analogWrite(M2_IN2_PIN, 0);
  } else if (leftSpeed < 0) {
    analogWrite(M2_IN1_PIN, 0);
    analogWrite(M2_IN2_PIN, -leftSpeed);
  } else {
    analogWrite(M2_IN1_PIN, 0);
    analogWrite(M2_IN2_PIN, 0);
  }
  
  // 右モータ制御 (M1)
  if (rightSpeed > 0) {
    analogWrite(M1_IN1_PIN, rightSpeed);
    analogWrite(M1_IN2_PIN, 0);
  } else if (rightSpeed < 0) {
    analogWrite(M1_IN1_PIN, 0);
    analogWrite(M1_IN2_PIN, -rightSpeed);
  } else {
    analogWrite(M1_IN1_PIN, 0);
    analogWrite(M1_IN2_PIN, 0);
  }
}