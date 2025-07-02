#include "Arduino.h"
#include "avr/io.h"
//==================================================================
//  探索ロボットの製作【使用ユニット】センサユニットＡ／Ｂ／Ｃ
//  超音波センサを使用した距離計測
//  Arduino UNO（ＡＶＲマイコン）プログラム　★AVRコマンドで記述
//  2021.3.9  Rev.1.0  T.Eizawa 
//==================================================================
#define  Trig_pin  12  //測距離センサのトリガーピン番号
#define  Echo_pin  13  //測距離センサのエコーピン番号

long int L1_val=0;
unsigned long time_high =0;
unsigned long time_low =0;

int WAIT_BUZZER = 500;
//==================================================================
void setup() {

  Serial.begin(9600);  //シリアルモニタ開始（速度9600bps）
//  IDEメニューの「ツール」→「シリアルモニタ」でモニタ開始

  DDRB = DDRB | B00010000;  //初期設定（Ｄ１２を出力ポート設定）

// 注意！　同一チャネルに属する他のポートがある場合は同時にセットする
// 参考：上記をArduinoの言語で記述する場合と比べ，行数削減＆実行速度ＵＰにつながる
}
//=================================================================
void loop() {       //メインループ関数

// 距離計測 ///
    PORTB &=~_BV(4);      //Trigピン（12pin）を2uS間Lowレベル設定
    delayMicroseconds(2);
    PORTB |= _BV(4);      //Trigピンを10uS間Highレベル設定
    delayMicroseconds(10); 
    PORTB &=~_BV(4);

//Echo_pinがHighレベルになり計測開始，Lowに戻るまでの時間計測を行う。
  while (digitalRead(13) == LOW) {} //EchoピンがLOWの間は空実行（そのまま何もしない）
          time_high = micros();               //EchoピンがHIGH状態の時間取得
  while (digitalRead(13)==HIGH){ }
          time_low =micros();                //EchoピンがLOW状態の時間取得
  
  L1_val = (time_low-time_high) / 58.5; //物体との距離を求める
     
    Serial.print("\n""L_Sensor L1=""\t");  // シリアルモニタへ表示
    Serial.println(L1_val);    // シリアルモニタへ表示
     //注意！　シリアルモニタ表示は本番走行時には全てコメントとすること
}
