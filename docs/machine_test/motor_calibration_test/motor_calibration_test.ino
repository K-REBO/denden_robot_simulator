#include "Arduino.h"

//==================================================================
//  モーターキャリブレーションテスト
//  左右モーターの回転数差を補正するための調整・テスト用プログラム
//  Arduino UNO（ＡＶＲマイコン）プログラム
//==================================================================

// ピンアサイン定義
#define M2_IN1_PIN   3   // 左モータ方向制御
#define M2_IN2_PIN   5   // 左モータ方向制御
#define M1_IN1_PIN   11  // 右モータ方向制御
#define M1_IN2_PIN   6   // 右モータ方向制御
#define LED_PIN      7   // LED/警報信号

// モーターキャリブレーション定数（ここで調整）
#define LEFT_MOTOR_COMPENSATION   1.1   // 左モーター補正係数
#define RIGHT_MOTOR_COMPENSATION  1.0   // 右モーター補正係数

// テストパラメータ
#define TEST_DURATION_MS         5000   // 各テストの実行時間（5秒）
#define TEST_SPEED_LOW           80     // 低速テスト
#define TEST_SPEED_MID           150    // 中速テスト
#define TEST_SPEED_HIGH          200    // 高速テスト
#define SETUP_DELAY_MS           3000   // セットアップ待機時間
#define INTER_TEST_DELAY_MS      2000   // テスト間の待機時間

// 状態定義
enum TestState {
  STATE_SETUP,
  STATE_LOW_SPEED_TEST,
  STATE_MID_SPEED_TEST,
  STATE_HIGH_SPEED_TEST,
  STATE_ROTATION_TEST_LEFT,
  STATE_ROTATION_TEST_RIGHT,
  STATE_COMPLETED
};

// グローバル変数
TestState currentState = STATE_SETUP;
unsigned long testStartTime = 0;
unsigned long setupStartTime = 0;
float leftMotorCompensation = LEFT_MOTOR_COMPENSATION;
float rightMotorCompensation = RIGHT_MOTOR_COMPENSATION;
int testCount = 0;

//==================================================================
void setup() {
  Serial.begin(9600);
  
  // ピン設定
  pinMode(M1_IN1_PIN, OUTPUT);
  pinMode(M1_IN2_PIN, OUTPUT);
  pinMode(M2_IN1_PIN, OUTPUT);
  pinMode(M2_IN2_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // LEDテスト
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("=== MOTOR CALIBRATION TEST ===");
  Serial.println("This test helps adjust motor compensation values");
  Serial.println();
  Serial.print("Current LEFT compensation: ");
  Serial.println(leftMotorCompensation);
  Serial.print("Current RIGHT compensation: ");
  Serial.println(rightMotorCompensation);
  Serial.println();
  Serial.println("Observe robot movement and adjust compensation values:");
  Serial.println("- If curves LEFT: increase LEFT_MOTOR_COMPENSATION");
  Serial.println("- If curves RIGHT: increase RIGHT_MOTOR_COMPENSATION");
  Serial.println();
  Serial.println("Place robot on flat surface with at least 2m space");
  Serial.println("Test will start in 3 seconds...");
  
  setupStartTime = millis();
}

//==================================================================
void loop() {
  unsigned long now = millis();
  
  switch(currentState) {
    case STATE_SETUP:
      executeSetup(now);
      break;
    case STATE_LOW_SPEED_TEST:
      executeLowSpeedTest(now);
      break;
    case STATE_MID_SPEED_TEST:
      executeMidSpeedTest(now);
      break;
    case STATE_HIGH_SPEED_TEST:
      executeHighSpeedTest(now);
      break;
    case STATE_ROTATION_TEST_LEFT:
      executeRotationTestLeft(now);
      break;
    case STATE_ROTATION_TEST_RIGHT:
      executeRotationTestRight(now);
      break;
    case STATE_COMPLETED:
      executeCompleted();
      break;
  }
}

//==================================================================
void executeSetup(unsigned long now) {
  if (now - setupStartTime >= SETUP_DELAY_MS) {
    Serial.println("=== Starting Calibration Tests ===");
    currentState = STATE_LOW_SPEED_TEST;
    testStartTime = now;
    testCount = 1;
    Serial.println();
    Serial.println("TEST 1/5: LOW SPEED STRAIGHT (80 PWM)");
    Serial.println("Observe: Does robot go straight?");
  }
}

//==================================================================
void executeLowSpeedTest(unsigned long now) {
  unsigned long elapsed = now - testStartTime;
  
  if (elapsed < TEST_DURATION_MS) {
    setMotorSpeeds(TEST_SPEED_LOW, TEST_SPEED_LOW);
  } else {
    setMotorSpeeds(0, 0);
    Serial.println("Low speed test completed");
    Serial.println("Waiting 2 seconds...");
    delay(INTER_TEST_DELAY_MS);
    
    currentState = STATE_MID_SPEED_TEST;
    testStartTime = millis();
    testCount++;
    Serial.println();
    Serial.println("TEST 2/5: MID SPEED STRAIGHT (150 PWM)");
    Serial.println("Observe: Does robot go straight?");
  }
}

//==================================================================
void executeMidSpeedTest(unsigned long now) {
  unsigned long elapsed = now - testStartTime;
  
  if (elapsed < TEST_DURATION_MS) {
    setMotorSpeeds(TEST_SPEED_MID, TEST_SPEED_MID);
  } else {
    setMotorSpeeds(0, 0);
    Serial.println("Mid speed test completed");
    Serial.println("Waiting 2 seconds...");
    delay(INTER_TEST_DELAY_MS);
    
    currentState = STATE_HIGH_SPEED_TEST;
    testStartTime = millis();
    testCount++;
    Serial.println();
    Serial.println("TEST 3/5: HIGH SPEED STRAIGHT (200 PWM)");
    Serial.println("Observe: Does robot go straight?");
  }
}

//==================================================================
void executeHighSpeedTest(unsigned long now) {
  unsigned long elapsed = now - testStartTime;
  
  if (elapsed < TEST_DURATION_MS) {
    setMotorSpeeds(TEST_SPEED_HIGH, TEST_SPEED_HIGH);
  } else {
    setMotorSpeeds(0, 0);
    Serial.println("High speed test completed");
    Serial.println("Waiting 2 seconds...");
    delay(INTER_TEST_DELAY_MS);
    
    currentState = STATE_ROTATION_TEST_LEFT;
    testStartTime = millis();
    testCount++;
    Serial.println();
    Serial.println("TEST 4/5: LEFT ROTATION");
    Serial.println("Observe: Rotation consistency");
  }
}

//==================================================================
void executeRotationTestLeft(unsigned long now) {
  unsigned long elapsed = now - testStartTime;
  
  if (elapsed < TEST_DURATION_MS) {
    setMotorSpeeds(-TEST_SPEED_MID, TEST_SPEED_MID); // 左回転
  } else {
    setMotorSpeeds(0, 0);
    Serial.println("Left rotation test completed");
    Serial.println("Waiting 2 seconds...");
    delay(INTER_TEST_DELAY_MS);
    
    currentState = STATE_ROTATION_TEST_RIGHT;
    testStartTime = millis();
    testCount++;
    Serial.println();
    Serial.println("TEST 5/5: RIGHT ROTATION");
    Serial.println("Observe: Rotation consistency");
  }
}

//==================================================================
void executeRotationTestRight(unsigned long now) {
  unsigned long elapsed = now - testStartTime;
  
  if (elapsed < TEST_DURATION_MS) {
    setMotorSpeeds(TEST_SPEED_MID, -TEST_SPEED_MID); // 右回転
  } else {
    setMotorSpeeds(0, 0);
    Serial.println("Right rotation test completed");
    
    currentState = STATE_COMPLETED;
  }
}

//==================================================================
void executeCompleted() {
  Serial.println();
  Serial.println("=== ALL TESTS COMPLETED ===");
  Serial.println();
  Serial.println("CALIBRATION RESULTS ANALYSIS:");
  Serial.println("1. If robot curved LEFT in straight tests:");
  Serial.println("   -> Increase LEFT_MOTOR_COMPENSATION (try 1.05, 1.1, etc.)");
  Serial.println();
  Serial.println("2. If robot curved RIGHT in straight tests:");
  Serial.println("   -> Increase RIGHT_MOTOR_COMPENSATION (try 1.05, 1.1, etc.)");
  Serial.println();
  Serial.println("3. If rotation tests were inconsistent:");
  Serial.println("   -> Fine-tune both compensation values");
  Serial.println();
  Serial.println("Current compensation values in code:");
  Serial.print("LEFT_MOTOR_COMPENSATION: ");
  Serial.println(leftMotorCompensation);
  Serial.print("RIGHT_MOTOR_COMPENSATION: ");
  Serial.println(rightMotorCompensation);
  Serial.println();
  Serial.println("RECOMMENDED ADJUSTMENT STEPS:");
  Serial.println("- Start with small increments (0.05 - 0.1)");
  Serial.println("- Test at different speeds to ensure consistency");
  Serial.println("- Perfect straight-line movement is the goal");
  Serial.println();
  Serial.println("Reset Arduino to run test again");
  
  // 10秒間LEDを点滅させて完了を示す
  for (int i = 0; i < 20; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(250);
    digitalWrite(LED_PIN, LOW);
    delay(250);
  }
  
  // 無限ループで待機
  while(true) {
    delay(1000);
  }
}

//==================================================================
// ユーティリティ関数
//==================================================================

void setMotorSpeeds(int leftSpeed, int rightSpeed) {
  // モーター補正係数を適用
  int compensatedLeftSpeed = (int)(leftSpeed * leftMotorCompensation);
  int compensatedRightSpeed = (int)(rightSpeed * rightMotorCompensation);
  
  // 速度制限（-255～255）
  compensatedLeftSpeed = constrain(compensatedLeftSpeed, -255, 255);
  compensatedRightSpeed = constrain(compensatedRightSpeed, -255, 255);
  
  // デバッグ出力（実際の制御値）
  if (leftSpeed != 0 || rightSpeed != 0) {
    Serial.print("Motor Control: Original(L=");
    Serial.print(leftSpeed);
    Serial.print(", R=");
    Serial.print(rightSpeed);
    Serial.print(") -> Compensated(L=");
    Serial.print(compensatedLeftSpeed);
    Serial.print(", R=");
    Serial.print(compensatedRightSpeed);
    Serial.println(")");
  }
  
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