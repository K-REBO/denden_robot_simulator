#include <Servo.h>

Servo servo;
const int servoPin = 10;
const int trigPin = 12;
const int echoPin = 13;

void setup() {
  Serial.begin(9600);
  servo.attach(servoPin);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  Serial.println("Distance Sensor Test Started");
}

long getDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH);
  long distance = (duration / 2) / 29.1;
  
  return distance;
}

void loop() {
  int minDistance = 9999;
  int closestAngle = 90;
  
  Serial.println("Scanning from 0 to 180 degrees...");
  
  for (int angle = 0; angle <= 180; angle += 10) {
    servo.write(angle);
    delay(500);
    
    long distance = getDistance();
    
    Serial.print("Angle: ");
    Serial.print(angle);
    Serial.print("°, Distance: ");
    Serial.print(distance);
    Serial.println(" cm");
    
    if (distance < minDistance && distance > 0) {
      minDistance = distance;
      closestAngle = angle;
    }
  }
  
  Serial.print("Closest object at angle: ");
  Serial.print(closestAngle);
  Serial.print("°, Distance: ");
  Serial.print(minDistance);
  Serial.println(" cm");
  
  servo.write(closestAngle);
  Serial.println("Servo positioned at closest angle");
  
  delay(3000);
}