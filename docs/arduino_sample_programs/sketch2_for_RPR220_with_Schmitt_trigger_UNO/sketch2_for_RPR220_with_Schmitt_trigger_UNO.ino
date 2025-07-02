#include "Arduino.h"
#include "avr/io.h"
//==================================================================
//  探索ロボットの製作【使用ユニット】センサユニットＣ
//  探索缶エリアにフォトセンサが接近するときステータスがHIGHレベルになる
//  Arduino UNO（ＡＶＲマイコン）プログラム
//  2021.3.9  Rev.1.0  T.Eizawa 
//==================================================================
#define  P1_pin  4  //フォトセンサVp0のピン番号
#define  P2_pin  2  //フォトセンサVp1のピン番号
unsigned long int P1_val;   //フォトセンサ信号の値
unsigned long int P2_val;   //フォトセンサ信号の値

int WAIT_BUZZER = 500;
int WAIT_SENSOR = 30;
//==================================================================
void setup() {

  Serial.begin(9600);  //シリアルモニタ開始（速度9600bps）
//  IDEメニューの「ツール」→「シリアルモニタ」でモニタ開始

  DDRD = DDRD | B00000000;  //初期設定（Ｄ４，Ｄ２を入力ポート設定）
  P1_val = 0;
  P2_val = 0;
}
//=================================================================
void loop() {       //メインループ関数

   P1_val = digitalRead(P1_pin); //フォトセンサVp0数値取得
//    P1_val = PIND &_BV(4); //digitalReadの高速化（前の行にあるものと同じ処理）

   P2_val = digitalRead(P2_pin); //フォトセンサVp1数値取得
    
    Serial.print("\n""P_Sensor Vp0=""\t");  // シリアルモニタへ表示
    Serial.print(P1_val);    // シリアルモニタへ表示※
    Serial.print("\n""P_Sensor Vp1=""\t");  // シリアルモニタへ表示
    Serial.print(P2_val);    // シリアルモニタへ表示※
//※「ツール」→「シリアルモニタ」により、フォトセンサ値をリアルタイムに観測できる
       
    delay(WAIT_SENSOR);
}
