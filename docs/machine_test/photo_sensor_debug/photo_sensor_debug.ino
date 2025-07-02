const int Vp0 = 4;  // 右フォトセンサ
const int Vp1 = 9;  // 左フォトセンサ

void setup() {
  Serial.begin(9600);
  pinMode(Vp0, INPUT_PULLUP);  // プルアップ有効
  pinMode(Vp1, INPUT_PULLUP);  // プルアップ有効
  Serial.println("Photo Sensor Debug Test Started - WITH PULLUP");
  Serial.println("Raw values: 0=LOW, 1=HIGH");
  Serial.println("Testing with PULLUP enabled");
  Serial.println("Place sensors on different surfaces to test");
}

void loop() {
  int rightSensorRaw = digitalRead(Vp0);
  int leftSensorRaw = digitalRead(Vp1);
  
  // アナログ値も読み取り（参考用）
  int rightAnalog = analogRead(A0); // Pin 4はデジタル、A0は別ピン
  int leftAnalog = analogRead(A1);  // Pin 9はデジタル、A1は別ピン
  
  Serial.print("Right(Pin4): RAW=");
  Serial.print(rightSensorRaw);
  Serial.print(" | Left(Pin9): RAW=");
  Serial.print(leftSensorRaw);
  
  Serial.print(" | Analog A0=");
  Serial.print(rightAnalog);
  Serial.print(" A1=");
  Serial.println(leftAnalog);
  
  // 期待される動作をテスト
  Serial.print("Expected: White=1(HIGH), Black=0(LOW) | ");
  Serial.print("Current interpretation: Right=");
  Serial.print(rightSensorRaw == 0 ? "BLACK" : "WHITE");
  Serial.print(", Left=");
  Serial.println(leftSensorRaw == 0 ? "BLACK" : "WHITE");
  
  delay(1000);
}