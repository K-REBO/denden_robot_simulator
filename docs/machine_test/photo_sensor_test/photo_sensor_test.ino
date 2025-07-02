const int Vp0 = 4;  // 右フォトセンサ
const int Vp1 = 9;  // 左フォトセンサ

void setup() {
  Serial.begin(9600);
  pinMode(Vp0, INPUT);
  pinMode(Vp1, INPUT);
  Serial.println("Photo Sensor Test Started");
  Serial.println("White surface: HIGH (1), Black surface: LOW (0)");
}

void loop() {
  int rightSensor = digitalRead(Vp0);
  int leftSensor = digitalRead(Vp1);
  
  Serial.print("Right Sensor (Pin ");
  Serial.print(Vp0);
  Serial.print("): ");
  Serial.print(rightSensor);
  Serial.print(" - ");
  Serial.print(rightSensor ? "WHITE" : "BLACK");
  
  Serial.print(" | Left Sensor (Pin ");
  Serial.print(Vp1);
  Serial.print("): ");
  Serial.print(leftSensor);
  Serial.print(" - ");
  Serial.println(leftSensor ? "WHITE" : "BLACK");
  
  if (rightSensor && leftSensor) {
    Serial.println("*** BOTH SENSORS DETECT BLACK LINE ***");
  } else if (rightSensor || leftSensor) {
    Serial.println("*** ONE SENSOR DETECTS BLACK LINE ***");
  }
  
  delay(500);
}