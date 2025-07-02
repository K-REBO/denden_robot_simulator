#include "Arduino.h"
#include "avr/io.h"
//==================================================================
//  探索ロボットの製作【使用ユニット】LED/警報ユニット
//  ＤＡ２，ＤＡ３からアナログ電圧を出力し，その出力信号により
//  ブザー警報テスト基板のブザーを鳴らす制御プログラム（ＡＶＲ）
//  2019.2.9  Rev.1.0  T.Eizawa 
//  ※ブザー警報が１回路のみ使用の場合，7pin or 13pinどちらか選択すること
//==================================================================

#define Buzzer_DA2  7   //ブザーDA2のピン番号
#define Buzzer_DA3 13   //ブザーDA3のピン番号

int WAIT_BUZZER = 500;
//================================================================
void setup(){
/* pinMode(Buzzer_DA2,OUTPUT); //初期設定
   pinMode(Buzzer_DA3,OUTPUT); //初期設定     */
   DDRD = DDRD | B10000000;  //初期設定（Ｄ７を出力ポート設定）
   DDRB = DDRB | B00100000;  //初期設定（Ｄ13を出力ポート設定）
// 注意！　Ｄ７、Ｄ１３以外のポートも出力設定とする場合は同時にセットする
}
//=================================================================
//        ACTION MAIN PROGRAM
//=================================================================
  void loop(){

    for ( int i = 1; i<=5; i++ )
    {
 //digitalWrite処理高速化のため、以下AVRコマンドを使用する
 
      PORTD |= _BV(7);  // digitalWrite ( 7, HIGH )と同等
      delay(WAIT_BUZZER);
      PORTD &=~_BV(7);   // digitalWrite ( 7, LOW )と同等
      delay(WAIT_BUZZER);

      PORTB |= _BV(5);   // digitalWrite ( 13, HIGH )と同等
      delay(WAIT_BUZZER);
      PORTB &=~_BV(5);
      delay(WAIT_BUZZER); // digitalWrite ( 13, LOW )と同等     
     }
     delay(2000);
}
