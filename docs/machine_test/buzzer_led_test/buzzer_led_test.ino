const int DA1 = 7;  // LED/警報信号

void setup() {
  Serial.begin(9600);
  pinMode(DA1, OUTPUT);
  Serial.println("Buzzer/LED Test Started");
}

void buzzTone(int frequency, int duration) {
  tone(DA1, frequency, duration);
  delay(duration);
  noTone(DA1);
}

void blinkLED(int times, int delayTime) {
  for (int i = 0; i < times; i++) {
    digitalWrite(DA1, HIGH);
    delay(delayTime);
    digitalWrite(DA1, LOW);
    delay(delayTime);
  }
}

void loop() {
  Serial.println("Testing Buzzer - Playing ドミソミド");
  
  buzzTone(262, 500);  // ド (C)
  delay(100);
  buzzTone(330, 500);  // ミ (E)
  delay(100);
  buzzTone(392, 500);  // ソ (G)
  delay(100);
  buzzTone(330, 500);  // ミ (E)
  delay(100);
  buzzTone(262, 500);  // ド (C)
  
  delay(1000);
  
  Serial.println("Testing LED - Blinking pattern");
  blinkLED(5, 200);
  
  delay(1000);
  
  Serial.println("Testing combined - Buzzer + LED");
  for (int i = 0; i < 3; i++) {
    digitalWrite(DA1, HIGH);
    buzzTone(1000, 200);
    digitalWrite(DA1, LOW);
    delay(200);
  }
  
  delay(3000);
}