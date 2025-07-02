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
#define BACKWARD_TIME_MS      2000    // 後退時間（1秒）
#define DISTANCE_THRESHOLD    250     // 15cm in mm（Found判定距離）
#define FORWARD_TIME_MS       50000    // 最大前進時間（5秒）

// モーターキャリブレーション定数
#define LEFT_MOTOR_COMPENSATION   1.1   // 左モーター補正係数
#define RIGHT_MOTOR_COMPENSATION  1.0   // 右モーター補正係数

// 状態定義
enum TestState {
  STATE_INIT,
  STATE_FORWARD,
  STATE_BACKWARD,
  STATE_FOUND,
  STATE_FINISHED
};

// グローバル変数
Servo distanceSensorServo;
TestState currentState = STATE_INIT;

// タイマー変数
unsigned long forwardStartTime = 0;
unsigned long backwardStartTime = 0;
unsigned long foundStartTime = 0;

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
  
  Serial.println("Straight Forward Found Test initialized");
  Serial.println("Starting forward movement...");
  
  currentState = STATE_FORWARD;
  forwardStartTime = millis();
}

//==================================================================
void loop() {
  unsigned long now = millis();
  
  switch(currentState) {
    case STATE_INIT:
      // 初期化完了済み
      break;
      
    case STATE_FORWARD:
      executeForward(now);
      break;
      
    case STATE_BACKWARD:
      executeBackward(now);
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
void executeForward(unsigned long now) {
  // センサー読み取り
  int currentDistance = getDistance();
  int leftPhoto = getL_Photo();
  int rightPhoto = getR_Photo();
  
  // デバッグ出力（1秒間隔）
  static unsigned long lastDebugTime = 0;
  if (now - lastDebugTime >= 1000) {
    Serial.print("Distance: ");
    Serial.print(currentDistance);
    Serial.print("mm, L_Photo: ");
    Serial.print(leftPhoto);
    Serial.print(", R_Photo: ");
    Serial.println(rightPhoto);
    lastDebugTime = now;
  }
  
  // Found判定：距離センサ ≤ 閾値 AND フォトセンサのどちらかが黒検知
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
  
  // 黒ライン検知による後退（Found条件以外）
  if ((leftPhoto == 1 || rightPhoto == 1) && currentDistance > DISTANCE_THRESHOLD) {
    setMotorBrake(); // 電磁ブレーキで一旦停止
    Serial.println("Black line detected - moving backward");
    currentState = STATE_BACKWARD;
    backwardStartTime = now;
    return;
  }
  
  // タイムアウトチェック
  if (now - forwardStartTime >= FORWARD_TIME_MS) {
    setMotorBrake();
    Serial.println("Forward timeout - stopping");
    currentState = STATE_FINISHED;
    return;
  }

  // 上記のどの条件にも当てはまらない場合、前進を続ける
  setMotorSpeeds(FORWARD_SPEED, FORWARD_SPEED);
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
void executeFound(unsigned long now) {
  // この関数は発見時に一度だけ実行されるブロッキング処理です

  // ブザーを2回鳴らす
  Serial.println("Target found! Beeping twice...");
  for (int i = 0; i < 2; i++) {
    tone(LED_PIN, 1000, 200); // 1kHzのブザーを200ms鳴らす
    delay(400); // 400ms待つ
  }

  // 10秒停止
  Serial.println("Waiting for 10 seconds...");
  delay(10000);

  // ブザーを3回鳴らす
  Serial.println("Beeping three times...");
  for (int i = 0; i < 3; i++) {
    tone(LED_PIN, 1000, 200); // 1kHzのブザーを200ms鳴らす
    delay(400); // 400ms待つ
  }

  // テストを再開
  Serial.println("Restarting test...");
  restartTest();
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
  currentState = STATE_FORWARD;
  forwardStartTime = millis();
  Serial.println("Starting forward movement...");
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