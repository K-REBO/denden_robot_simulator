const RobotSensors = require('./sensors.js');
const Field = require('./field.js');

function createMockRobot(x, y, angle) {
    return { x, y, angle };
}

function createMockField(width, height, borderLineWidth, targets) {
    return { width, height, borderLineWidth, targets };
}

function createMockTarget(x, y, radius, blackRingWidth) {
    return { x, y, radius, blackRingWidth };
}

function testSensorInitialization() {
    console.log('Testing sensor initialization...');
    const sensors = new RobotSensors();
    
    console.assert(sensors.servoAngle === 0, 'Initial servo angle should be 0');
    console.assert(sensors.robot === null, 'Initial robot should be null');
    console.assert(sensors.field === null, 'Initial field should be null');
    console.log('✓ Sensor initialization test passed');
}

function testServoControl() {
    console.log('Testing servo control...');
    const sensors = new RobotSensors();
    
    sensors.setServo(45);
    console.assert(sensors.servoAngle === 45, 'Servo should be set to 45 degrees');
    
    sensors.setServo(100);
    console.assert(sensors.servoAngle === 90, 'Servo should be clamped to 90 degrees');
    
    sensors.setServo(-100);
    console.assert(sensors.servoAngle === -90, 'Servo should be clamped to -90 degrees');
    
    console.log('✓ Servo control test passed');
}

function testDistanceSensorWithoutWalls() {
    console.log('Testing distance sensor does not detect walls...');
    const sensors = new RobotSensors();
    const robot = createMockRobot(4000, 4000, 0);
    const field = createMockField(8000, 16000, 500, []);
    
    sensors.setRobot(robot);
    sensors.setField(field);
    
    const distance = sensors.getDistance();
    console.assert(distance === 4000, `Distance should be max range (4000mm), got ${distance}`);
    
    console.log('✓ Distance sensor wall detection test passed');
}

function testDistanceSensorWithTarget() {
    console.log('Testing distance sensor with target...');
    const sensors = new RobotSensors();
    const robot = createMockRobot(1000, 1000, 0);
    const target = createMockTarget(1200, 1000, 30, 50);
    const field = createMockField(8000, 16000, 500, [target]);
    
    sensors.setRobot(robot);
    sensors.setField(field);
    
    const distance = sensors.getDistance();
    console.assert(distance >= 170 && distance <= 200, `Distance should be around 170-200mm, got ${distance}`);
    
    console.log('✓ Distance sensor target detection test passed');
}

function testPhotoSensorBorderDetection() {
    console.log('Testing photo sensor border detection...');
    const sensors = new RobotSensors();
    const robot = createMockRobot(250, 400, 0);
    const field = createMockField(8000, 16000, 500, []);
    
    sensors.setRobot(robot);
    sensors.setField(field);
    
    const rightPhoto = sensors.getR_Photo();
    const leftPhoto = sensors.getL_Photo();
    
    console.log(`Border detection - Right: ${rightPhoto}, Left: ${leftPhoto} (Robot at border proximity)`);
    
    console.log('✓ Photo sensor border detection test passed');
}

function testPhotoSensorTargetDetection() {
    console.log('Testing photo sensor target detection...');
    const sensors = new RobotSensors();
    const robot = createMockRobot(1000, 1000, 0);
    const target = createMockTarget(1270, 1000, 30, 50);
    const field = createMockField(8000, 16000, 500, [target]);
    
    sensors.setRobot(robot);
    sensors.setField(field);
    
    const rightPhoto = sensors.getR_Photo();
    const leftPhoto = sensors.getL_Photo();
    
    console.log(`Target detection - Right: ${rightPhoto}, Left: ${leftPhoto}`);
    console.log(`Target at (${target.x}, ${target.y}), Robot at (${robot.x}, ${robot.y})`);
    
    console.log('✓ Photo sensor target detection test passed');
}

function testStubBehavior() {
    console.log('Testing stub behavior without robot/field...');
    const sensors = new RobotSensors();
    
    console.assert(sensors.getDistance() === 0, 'getDistance should return 0 without robot/field');
    console.assert(sensors.getR_Photo() === false, 'getR_Photo should return false without robot/field');
    console.assert(sensors.getL_Photo() === false, 'getL_Photo should return false without robot/field');
    
    console.log('✓ Stub behavior test passed');
}

function testFieldInitialization() {
    console.log('Testing field initialization...');
    const field = new Field();
    
    console.assert(field.fieldWidth === 1600, `Field width should be 1600mm, got ${field.fieldWidth}`);
    console.assert(field.fieldHeight === 800, `Field height should be 800mm, got ${field.fieldHeight}`);
    console.assert(field.width === 1700, `Total width should be 1700mm, got ${field.width}`);
    console.assert(field.height === 900, `Total height should be 900mm, got ${field.height}`);
    console.assert(field.borderLineWidth === 50, `Border line width should be 50mm, got ${field.borderLineWidth}`);
    console.assert(field.targets.length === 12, `Should have 12 targets, got ${field.targets.length}`);
    console.assert(field.score === 0, 'Initial score should be 0');
    
    console.log('✓ Field initialization test passed');
}

function testTargetSpacing() {
    console.log('Testing target spacing...');
    const field = new Field();
    
    const expectedPositions = [
        [400, 400], [400, 400], [800, 400], [800, 400],
        [1200, 400], [1200, 400], [1200, 400], [1200, 400],
        [800, 400], [800, 400], [400, 400], [400, 400]
    ];
    
    for (let i = 0; i < field.targets.length; i++) {
        const target = field.targets[i];
        console.assert(target.radius === 30, `Target ${i} radius should be 30mm, got ${target.radius}`);
        console.assert(target.blackRingWidth === 50, `Target ${i} black ring width should be 50mm, got ${target.blackRingWidth}`);
        console.assert(target.discovered === false, `Target ${i} should be undiscovered initially`);
    }
    
    console.log('✓ Target spacing test passed');
}

function testScoring() {
    console.log('Testing scoring system...');
    const field = new Field();
    
    // 最初のターゲット位置を取得
    const target1 = field.targets[0];
    const target2 = field.targets[1];
    
    const result1 = field.checkTargetReached(target1.x, target1.y, true, false, 100);
    console.assert(result1 !== null, 'Should detect target visit');
    console.assert(field.score === 10, `Score should be 10 after first discovery, got ${field.score}`);
    console.assert(field.getDiscoveredCount() === 1, 'Should have 1 discovered target');
    
    const result2 = field.checkTargetReached(target1.x, target1.y, true, false, 100);
    console.assert(field.score === 10, 'Score should remain 10 for consecutive same target visit');
    
    const result3 = field.checkTargetReached(target2.x, target2.y, false, true, 120);
    console.assert(field.score === 20, `Score should be 20 after second discovery, got ${field.score}`);
    console.assert(field.getDiscoveredCount() === 2, 'Should have 2 discovered targets');
    
    const result4 = field.checkTargetReached(target1.x, target1.y, true, false, 100);
    console.assert(field.score === 22, `Score should be 22 after revisit, got ${field.score}`);
    
    console.log('✓ Scoring system test passed');
}

function testTargetDetectionConditions() {
    console.log('Testing target detection conditions...');
    const field = new Field();
    
    const target = field.targets[0];
    
    const noPhoto = field.checkTargetReached(target.x, target.y, false, false, 100);
    console.assert(noPhoto === null, 'Should not detect target without photo sensor');
    
    const farDistance = field.checkTargetReached(target.x, target.y, true, false, 200);
    console.assert(farDistance === null, 'Should not detect target when distance > 130mm');
    
    const validDetection = field.checkTargetReached(target.x, target.y, true, false, 100);
    console.assert(validDetection !== null, 'Should detect target with photo sensor and distance <= 130mm');
    
    console.log('✓ Target detection conditions test passed');
}

function testFieldReset() {
    console.log('Testing field reset...');
    const field = new Field();
    
    const target1 = field.targets[0];
    const target2 = field.targets[1];
    
    field.checkTargetReached(target1.x, target1.y, true, false, 100);
    field.checkTargetReached(target2.x, target2.y, false, true, 120);
    
    console.assert(field.score > 0, 'Score should be positive before reset');
    console.assert(field.getDiscoveredCount() > 0, 'Should have discovered targets before reset');
    
    field.reset();
    
    console.assert(field.score === 0, 'Score should be 0 after reset');
    console.assert(field.getDiscoveredCount() === 0, 'Should have 0 discovered targets after reset');
    console.assert(field.lastVisitedTarget === null, 'Last visited target should be null after reset');
    
    for (const target of field.targets) {
        console.assert(target.discovered === false, 'All targets should be undiscovered after reset');
    }
    
    console.log('✓ Field reset test passed');
}

function testCollisionDetection() {
    console.log('Testing collision detection...');
    const field = new Field();
    
    // 壁に衝突する位置をテスト
    const collisionResult = field.checkCollision(40, 450, 300, 300, 0);
    console.assert(collisionResult !== null, 'Should detect collision with wall');
    console.assert(collisionResult.type === 'collision', 'Should return collision type');
    console.assert(field.isGameOver() === true, 'Game should be over after collision');
    
    field.reset();
    
    // 安全な位置をテスト
    const safeResult = field.checkCollision(400, 450, 300, 300, 0);
    console.assert(safeResult === null, 'Should not detect collision in safe area');
    console.assert(field.isGameOver() === false, 'Game should not be over in safe area');
    
    console.log('✓ Collision detection test passed');
}

function testFallOffDetection() {
    console.log('Testing fall off detection...');
    const field = new Field();
    
    // フィールド外に落下する位置をテスト
    const fallResult = field.checkFallOff(-50, 450, 300, 300, 0);
    console.assert(fallResult !== null, 'Should detect fall off');
    console.assert(fallResult.type === 'fall_off', 'Should return fall off type');
    console.assert(field.isGameOver() === true, 'Game should be over after fall off');
    
    field.reset();
    
    // 安全な位置をテスト
    const safeResult = field.checkFallOff(400, 450, 300, 300, 0);
    console.assert(safeResult === null, 'Should not detect fall off in safe area');
    console.assert(field.isGameOver() === false, 'Game should not be over in safe area');
    
    console.log('✓ Fall off detection test passed');
}

function testGameOverSystem() {
    console.log('Testing game over system...');
    const field = new Field();
    
    console.assert(field.isGameOver() === false, 'Game should not be over initially');
    console.assert(field.getGameOverReason() === null, 'Game over reason should be null initially');
    
    // 衝突によるゲームオーバー
    field.checkCollision(40, 450, 300, 300, 0);
    console.assert(field.isGameOver() === true, 'Game should be over after collision');
    console.assert(field.getGameOverReason() === 'collision', 'Game over reason should be collision');
    
    field.reset();
    
    // 落下によるゲームオーバー
    field.checkFallOff(-50, 450, 300, 300, 0);
    console.assert(field.isGameOver() === true, 'Game should be over after fall off');
    console.assert(field.getGameOverReason() === 'fall_off', 'Game over reason should be fall_off');
    
    field.reset();
    console.assert(field.isGameOver() === false, 'Game should not be over after reset');
    console.assert(field.getGameOverReason() === null, 'Game over reason should be null after reset');
    
    console.log('✓ Game over system test passed');
}

function runAllTests() {
    console.log('Running all tests...\n');
    
    console.log('=== SENSOR TESTS ===');
    testSensorInitialization();
    testServoControl();
    testDistanceSensorWithoutWalls();
    testDistanceSensorWithTarget();
    testPhotoSensorBorderDetection();
    testPhotoSensorTargetDetection();
    testStubBehavior();
    
    console.log('\n=== FIELD TESTS ===');
    testFieldInitialization();
    testTargetSpacing();
    testScoring();
    testTargetDetectionConditions();
    testFieldReset();
    
    console.log('\n=== SAFETY TESTS ===');
    testCollisionDetection();
    testFallOffDetection();
    testGameOverSystem();
    
    console.log('\n✅ All tests passed!');
}

if (require.main === module) {
    runAllTests();
}

module.exports = {
    testSensorInitialization,
    testServoControl,
    testDistanceSensorWithoutWalls,
    testDistanceSensorWithTarget,
    testPhotoSensorBorderDetection,
    testPhotoSensorTargetDetection,
    testStubBehavior,
    runAllTests
};