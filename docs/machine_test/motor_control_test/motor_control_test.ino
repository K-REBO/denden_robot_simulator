const int M1_IN1 = 11;  // 右モータ方向制御
const int M1_IN2 = 6;   // 右モータ方向制御

void setup() {
  Serial.begin(9600);
  pinMode(M1_IN1, OUTPUT);
  pinMode(M1_IN2, OUTPUT);
  Serial.println("Right Motor Control Test Started (Pins 11, 6)");
}

void stopMotor() {
  analogWrite(M1_IN1, 0);
  analogWrite(M1_IN2, 0);
}

void motorForward(int speed = 150) {
  analogWrite(M1_IN1, speed);
  analogWrite(M1_IN2, 0);
}

void motorBackward(int speed = 150) {
  analogWrite(M1_IN1, 0);
  analogWrite(M1_IN2, speed);
}

void loop() {
  Serial.println("Motor Forward");
  motorForward();
  delay(2000);
  
  stopMotor();
  Serial.println("Motor Stopped");
  delay(1000);
  
  Serial.println("Motor Backward");
  motorBackward();
  delay(2000);
  
  stopMotor();
  Serial.println("Motor Stopped");
  delay(1000);
  
  Serial.println("Testing different speeds...");
  
  for (int speed = 100; speed <= 255; speed += 50) {
    Serial.print("Forward at speed: ");
    Serial.println(speed);
    motorForward(speed);
    delay(1000);
  }
  
  stopMotor();
  delay(3000);
}