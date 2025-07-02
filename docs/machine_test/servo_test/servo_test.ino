#include <Servo.h>

Servo servo;
const int servoPin = 10;

void setup() {
  Serial.begin(9600);
  servo.attach(servoPin);
  Serial.println("Servo Test Started");
}

void loop() {
  Serial.println("Moving servo from 0 to 180 degrees");
  
  for (int angle = 0; angle <= 180; angle += 10) {
    servo.write(angle);
    Serial.print("Angle: ");
    Serial.println(angle);
    delay(500);
  }
  
  Serial.println("Moving servo from 180 to 0 degrees");
  
  for (int angle = 180; angle >= 0; angle -= 10) {
    servo.write(angle);
    Serial.print("Angle: ");
    Serial.println(angle);
    delay(500);
  }
  
  delay(2000);
}