#include "Arduino.h"

//==================================================================
//  90度回転調整テスト（繰り返し版）
//  指定した速度と時間でモーターを回転させ、90度回転のキャリブレーションを行う
//  Arduino UNO（ＡＶＲマイコン）プログラム
//==================================================================

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// ここで回転速度と回転時間を調整してください
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

// 回転速度（0〜255の範囲で指定）
#define ROTATION_SPEED         150

// 回転時間（ミリ秒単位で指定）
#define ROTATION_DURATION_MS   365

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

// ピンアサイン定義
#define M2_IN1_PIN   3   // 左モーター
#define M2_IN2_PIN   5
#define M1_IN1_PIN   11  // 右モーター
#define M1_IN2_PIN   6
#define LED_PIN      7   // LED

// モ���ターキャリブレーション定数
#define LEFT_MOTOR_COMPENSATION   1.1
#define RIGHT_MOTOR_COMPENSATION  1.0

// 状態定義800
enum TestState {
  STATE_INIT_BLINK,      // 起動時の点滅
  STATE_PRE_ROTATE_BLINK,  // 回転前の点滅
  STATE_ROTATE,          // 回転中
  STATE_POST_ROTATE_BLINK, // 回転後の点灯
  STATE_WAIT             // 待機中
};

TestState currentState = STATE_INIT_BLINK;
unsigned long timer_start_time = 0;
int blink_count = 0;

//==================================================================
void setup() {
  pinMode(M1_IN1_PIN, OUTPUT);
  pinMode(M1_IN2_PIN, OUTPUT);
  pinMode(M2_IN1_PIN, OUTPUT);
  pinMode(M2_IN2_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  timer_start_time = millis();
}

//==================================================================
void loop() {
  unsigned long current_time = millis();

  switch(currentState) {
    case STATE_INIT_BLINK:
      // 起動時に3回点滅
      if (current_time - timer_start_time >= 500) {
        digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // LEDの状態を反転
        timer_start_time = current_time;
        blink_count++;
        if (blink_count >= 6) { // 3回の点滅（ON/OFFで6回状態変化）
          blink_count = 0;
          currentState = STATE_ROTATE;
        }
      }
      break;

    case STATE_ROTATE:
      // 回転開始
      setMotorSpeeds(-ROTATION_SPEED, ROTATION_SPEED); // 右回転
      timer_start_time = current_time;
      currentState = STATE_POST_ROTATE_BLINK; // すぐに次の状態へ
      break;

    case STATE_POST_ROTATE_BLINK:
      // 回転時間チェック
      if (current_time - timer_start_time >= ROTATION_DURATION_MS) {
        setMotorBrake(); // モーター停止
        
        // LEDを1回点灯
        digitalWrite(LED_PIN, HIGH);
        delay(500); // 0.5秒点灯
        digitalWrite(LED_PIN, LOW);

        timer_start_time = current_time;
        currentState = STATE_WAIT;
      }
      break;

    case STATE_WAIT:
      // 5秒待機
      if (current_time - timer_start_time >= 5000) {
        blink_count = 0;
        timer_start_time = current_time;
        currentState = STATE_PRE_ROTATE_BLINK;
      }
      break;

    case STATE_PRE_ROTATE_BLINK:
      // 次の回転の前に2回点滅
      if (current_time - timer_start_time >= 500) {
        digitalWrite(LED_PIN, !digitalRead(LED_PIN));
        timer_start_time = current_time;
        blink_count++;
        if (blink_count >= 4) { // 2回の点滅（ON/OFFで4回状態変化）
          blink_count = 0;
          currentState = STATE_ROTATE; // 再び回転へ
        }
      }
      break;
  }
}

//==================================================================
// モーター制御関数
//==================================================================
void setMotorSpeeds(int leftSpeed, int rightSpeed) {
  float compensatedLeft = leftSpeed * LEFT_MOTOR_COMPENSATION;
  float compensatedRight = rightSpeed * RIGHT_MOTOR_COMPENSATION;

  int finalLeft = constrain((int)compensatedLeft, -255, 255);
  int finalRight = constrain((int)compensatedRight, -255, 255);

  if (finalLeft > 0) {
    analogWrite(M2_IN1_PIN, finalLeft);
    analogWrite(M2_IN2_PIN, 0);
  } else {
    analogWrite(M2_IN1_PIN, 0);
    analogWrite(M2_IN2_PIN, -finalLeft);
  }

  if (finalRight > 0) {
    analogWrite(M1_IN1_PIN, finalRight);
    analogWrite(M1_IN2_PIN, 0);
  } else {
    analogWrite(M1_IN1_PIN, 0);
    analogWrite(M1_IN2_PIN, -finalRight);
  }
}

void setMotorBrake() {
  digitalWrite(M1_IN1_PIN, HIGH);
  digitalWrite(M1_IN2_PIN, HIGH);
  digitalWrite(M2_IN1_PIN, HIGH);
  digitalWrite(M2_IN2_PIN, HIGH);
}
