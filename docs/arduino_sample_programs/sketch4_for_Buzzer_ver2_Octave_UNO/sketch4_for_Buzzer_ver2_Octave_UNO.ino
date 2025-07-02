#include "Arduino.h"
#include "avr/io.h"
//==================================================================
//  探索ロボットの製作【使用ユニット】LED/警報ユニット
//  ＤＡ２，ＤＡ３からの出力信号により
//  テスト基板のブザーで音階を鳴らす制御プログラム（ＡＶＲ）
//  2019.2.9  Rev.1.0  T.Eizawa 
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

//注意！　階調は圧電スピーカ使用時に表現できる（圧電ブザーでは鳴動のみ）
     tone( Buzzer_DA2, 262, 300 ) ;  // ド
     delay(300) ;
     tone( Buzzer_DA2, 294, 300 ) ;  // レ
     delay(300) ;
     tone( Buzzer_DA2, 330, 300 ) ;  // ミ
     delay(300) ;
     tone( Buzzer_DA2, 349, 300 ) ;  // ファ
     delay(300) ;
     tone( Buzzer_DA2, 392, 300 ) ;  // ソ
     delay(300) ;
     tone( Buzzer_DA2, 440, 300 ) ;  // ラ
     delay(300) ;
     tone( Buzzer_DA2, 494, 300 ) ;  // シ
     delay(300) ;
     tone( Buzzer_DA2, 523, 2000 ) ;  // ド
     delay(800);
     noTone(Buzzer_DA2);
     delay(2000);

     tone( Buzzer_DA3, 262, 300 ) ;  // ド
     delay(300) ;
     tone( Buzzer_DA3, 294, 300 ) ;  // レ
     delay(300) ;
     tone( Buzzer_DA3, 330, 300 ) ;  // ミ
     delay(300) ;
     tone( Buzzer_DA3, 349, 300 ) ;  // ファ
     delay(300) ;
     tone( Buzzer_DA3, 392, 300 ) ;  // ソ
     delay(300) ;
     tone( Buzzer_DA3, 440, 300 ) ;  // ラ
     delay(300) ;
     tone( Buzzer_DA3, 494, 300 ) ;  // シ
     delay(300) ;
     tone( Buzzer_DA3, 523, 2000 ) ;  // ド
     delay(1000);
     noTone(Buzzer_DA3);
     delay(2000);
}
