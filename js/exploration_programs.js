// 定数をインポート
// import * as CONST from './constants.js';

class ExplorationPrograms {
    static programs = {
        'wall_following': '壁沿い探索',
        'spiral_search': 'スパイラル探索',
        'random_walk': 'ランダム探索',
        'systematic_grid': '格子探索',
        'target_seeking': 'ターゲット追跡',
        'manual_control': '手動操作'
    };
    
    static getProgram(name) {
        switch(name) {
            case 'wall_following':
                return new WallFollowingProgram();
            case 'spiral_search':
                return new SpiralSearchProgram();
            case 'random_walk':
                return new RandomWalkProgram();
            case 'systematic_grid':
                return new SystematicGridProgram();
            case 'target_seeking':
                return new TargetSeekingProgram();
            case 'manual_control':
                return new ManualControlProgram();
            default:
                return new WallFollowingProgram();
        }
    }
}

class BaseExplorationProgram {
    constructor() {
        this.state = 'exploring';
        this.startTime = 0;
        this.lastDecisionTime = 0;
        this.moveQueue = [];
    }
    
    execute(robot) {
        throw new Error('execute method must be implemented');
    }
    
    reset() {
        this.state = 'exploring';
        this.startTime = 0;
        this.lastDecisionTime = 0;
        this.moveQueue = [];
    }
    
    addMove(leftSpeed, rightSpeed, duration) {
        this.moveQueue.push({
            leftSpeed,
            rightSpeed,
            duration,
            startTime: null
        });
    }
    
    processQueue(robot) {
        if (this.moveQueue.length === 0) return false;
        
        const currentMove = this.moveQueue[0];
        const now = robot.millis();
        
        if (currentMove.startTime === null) {
            currentMove.startTime = now;
        }
        
        robot.setMotorSpeeds(currentMove.leftSpeed, currentMove.rightSpeed);
        
        if (now - currentMove.startTime >= currentMove.duration) {
            this.moveQueue.shift();
            robot.setMotorSpeeds(0, 0);
            return false;
        }
        
        return true;
    }
}

class WallFollowingProgram extends BaseExplorationProgram {
    execute(robot) {
        if (this.processQueue(robot)) return;
        
        const leftPhoto = robot.getL_Photo();
        const rightPhoto = robot.getR_Photo();
        const distance = robot.getDistance();
        
        // フォトセンサでフィールド境界検知時の回避
        if (leftPhoto || rightPhoto) {
            robot.setServo(CONST.ROBOT_CONTROL.SERVO_CENTER_ANGLE);
            this.addMove(CONST.EXPLORATION.WALL_TURN_SPEED_LEFT, CONST.EXPLORATION.WALL_TURN_SPEED_RIGHT, CONST.EXPLORATION.WALL_TURN_DURATION);
            this.state = 'turning';
            return;
        }
        
        // 距離センサでターゲットとの衝突回避
        if (distance <= CONST.EXPLORATION.TARGET_COLLISION_DISTANCE) {
            this.addMove(-CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED, CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED, CONST.EXPLORATION.TARGET_COLLISION_TURN_DURATION);
            return;
        }
        
        robot.setServo(CONST.EXPLORATION.SCAN_LEFT_ANGLE);
        robot.delay(CONST.EXPLORATION.SENSOR_DELAY);
        const leftDistance = robot.getDistance();
        
        robot.setServo(CONST.EXPLORATION.SCAN_RIGHT_ANGLE);
        robot.delay(CONST.EXPLORATION.SENSOR_DELAY);
        const rightDistance = robot.getDistance();
        
        robot.setServo(CONST.ROBOT_CONTROL.SERVO_CENTER_ANGLE);
        robot.delay(CONST.EXPLORATION.SENSOR_DELAY);
        
        if (leftDistance > rightDistance && leftDistance > CONST.EXPLORATION.SCAN_DISTANCE_THRESHOLD) {
            this.addMove(50, 150, CONST.EXPLORATION.WALL_SCAN_TURN_DURATION);
        } else if (rightDistance > leftDistance && rightDistance > CONST.EXPLORATION.SCAN_DISTANCE_THRESHOLD) {
            this.addMove(150, 50, CONST.EXPLORATION.WALL_SCAN_TURN_DURATION);
        } else {
            this.addMove(120, 120, CONST.EXPLORATION.FORWARD_MOVE_DURATION);
        }
    }
}

class SpiralSearchProgram extends BaseExplorationProgram {
    constructor() {
        super();
        this.spiralRadius = CONST.EXPLORATION.SPIRAL_INITIAL_RADIUS;
        this.spiralIncrement = CONST.EXPLORATION.SPIRAL_RADIUS_INCREMENT;
        this.turnDirection = 1;
    }
    
    execute(robot) {
        if (this.processQueue(robot)) return;
        
        const leftPhoto = robot.getL_Photo();
        const rightPhoto = robot.getR_Photo();
        const distance = robot.getDistance();
        
        // フォトセンサでフィールド境界検知時の回避
        if (leftPhoto || rightPhoto) {
            this.addMove(-CONST.EXPLORATION.SPIRAL_AVOIDANCE_TURN_SPEED, CONST.EXPLORATION.SPIRAL_AVOIDANCE_TURN_SPEED, CONST.EXPLORATION.SPIRAL_AVOIDANCE_TURN_DURATION);
            this.spiralRadius = CONST.EXPLORATION.SPIRAL_INITIAL_RADIUS;
            return;
        }
        
        // 距離センサでターゲットとの衝突回避
        if (distance <= CONST.EXPLORATION.TARGET_COLLISION_DISTANCE) {
            this.addMove(-CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED, CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED, CONST.EXPLORATION.SPIRAL_COLLISION_AVOIDANCE_DURATION);
            return;
        }
        
        const moveTime = this.spiralRadius * 2;
        const turnTime = CONST.EXPLORATION.SPIRAL_TURN_BASE_TIME + (this.spiralRadius / 5);
        
        this.addMove(120, 120, moveTime);
        this.addMove(50 * this.turnDirection, 150 * this.turnDirection, turnTime);
        
        this.spiralRadius += this.spiralIncrement;
        if (this.spiralRadius > CONST.EXPLORATION.SPIRAL_MAX_RADIUS) {
            this.spiralRadius = CONST.EXPLORATION.SPIRAL_INITIAL_RADIUS;
            this.turnDirection *= -1;
        }
    }
    
    reset() {
        super.reset();
        this.spiralRadius = CONST.EXPLORATION.SPIRAL_INITIAL_RADIUS;
        this.turnDirection = 1;
    }
}

class RandomWalkProgram extends BaseExplorationProgram {
    execute(robot) {
        if (this.processQueue(robot)) return;
        
        const leftPhoto = robot.getL_Photo();
        const rightPhoto = robot.getR_Photo();
        const distance = robot.getDistance();
        
        // フォトセンサでフィールド境界検知時の回避
        if (leftPhoto || rightPhoto) {
            const turnDirection = Math.random() > 0.5 ? 1 : -1;
            this.addMove(-CONST.EXPLORATION.SPIRAL_AVOIDANCE_TURN_SPEED * turnDirection, CONST.EXPLORATION.SPIRAL_AVOIDANCE_TURN_SPEED * turnDirection, CONST.EXPLORATION.RANDOM_AVOIDANCE_BASE_TIME + Math.random() * CONST.EXPLORATION.RANDOM_AVOIDANCE_EXTRA_TIME);
            return;
        }
        
        // 距離センサでターゲットとの衝突回避
        if (distance <= CONST.EXPLORATION.TARGET_COLLISION_DISTANCE) {
            const turnDirection = Math.random() > 0.5 ? 1 : -1;
            this.addMove(-CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED * turnDirection, CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED * turnDirection, CONST.EXPLORATION.RANDOM_COLLISION_AVOIDANCE_TIME);
            return;
        }
        
        const moveTime = CONST.EXPLORATION.RANDOM_MIN_MOVE_TIME + Math.random() * (CONST.EXPLORATION.RANDOM_MAX_MOVE_TIME - CONST.EXPLORATION.RANDOM_MIN_MOVE_TIME);
        const leftSpeed = CONST.EXPLORATION.RANDOM_MIN_SPEED + Math.random() * (CONST.EXPLORATION.RANDOM_MAX_SPEED - CONST.EXPLORATION.RANDOM_MIN_SPEED);
        const rightSpeed = CONST.EXPLORATION.RANDOM_MIN_SPEED + Math.random() * (CONST.EXPLORATION.RANDOM_MAX_SPEED - CONST.EXPLORATION.RANDOM_MIN_SPEED);
        
        this.addMove(leftSpeed, rightSpeed, moveTime);
        
        if (Math.random() > CONST.EXPLORATION.RANDOM_TURN_PROBABILITY) {
            const turnDirection = Math.random() > 0.5 ? 1 : -1;
            const turnTime = CONST.EXPLORATION.RANDOM_TURN_MIN_TIME + Math.random() * (CONST.EXPLORATION.RANDOM_TURN_MAX_TIME - CONST.EXPLORATION.RANDOM_TURN_MIN_TIME);
            this.addMove(CONST.EXPLORATION.RANDOM_MIN_SPEED * turnDirection, CONST.ROBOT_CONTROL.DEFAULT_FORWARD_SPEED * turnDirection, turnTime);
        }
    }
}

class SystematicGridProgram extends BaseExplorationProgram {
    constructor() {
        super();
        this.direction = 0;
        this.gridSize = CONST.EXPLORATION.GRID_CELL_SIZE;
        this.stepCount = 0;
    }
    
    execute(robot) {
        if (this.processQueue(robot)) return;
        
        const leftPhoto = robot.getL_Photo();
        const rightPhoto = robot.getR_Photo();
        const distance = robot.getDistance();
        
        // フォトセンサでフィールド境界検知時の回避
        if (leftPhoto || rightPhoto) {
            this.addMove(-CONST.EXPLORATION.SPIRAL_AVOIDANCE_TURN_SPEED, CONST.EXPLORATION.SPIRAL_AVOIDANCE_TURN_SPEED, CONST.EXPLORATION.GRID_AVOIDANCE_TURN_DURATION);
            this.direction = (this.direction + 90) % 360;
            return;
        }
        
        // 距離センサでターゲットとの衝突回避
        if (distance <= CONST.EXPLORATION.TARGET_COLLISION_DISTANCE) {
            this.addMove(-CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED, CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED, CONST.EXPLORATION.GRID_COLLISION_AVOIDANCE_DURATION);
            return;
        }
        
        const moveTime = this.gridSize;
        this.addMove(120, 120, moveTime);
        
        this.stepCount++;
        if (this.stepCount % CONST.EXPLORATION.GRID_STEPS_PER_TURN === 0) {
            this.addMove(CONST.EXPLORATION.WALL_SCAN_TURN_DURATION / 6, CONST.ROBOT_CONTROL.DEFAULT_FORWARD_SPEED, CONST.EXPLORATION.GRID_TURN_DURATION);
            this.direction = (this.direction + 90) % 360;
        }
    }
    
    reset() {
        super.reset();
        this.direction = 0;
        this.stepCount = 0;
    }
}

class TargetSeekingProgram extends BaseExplorationProgram {
    constructor() {
        super();
        this.scanAngle = -90;
        this.scanDirection = 1;
        this.targetFound = false;
        this.nearestAngle = 0;
        this.nearestDistance = Infinity;
        this.scanResults = new Map();
        this.scanComplete = false;
        this.closestTargetDistance = Infinity; // 最も近づいた距離を記録
    }
    
    execute(robot) {
        if (this.processQueue(robot)) return;
        
        const leftPhoto = robot.getL_Photo();
        const rightPhoto = robot.getR_Photo();
        const distance = robot.getDistance();
        
        // フォトセンサでフィールド境界検知時の回避
        if (leftPhoto || rightPhoto) {
            this.addMove(-CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED, CONST.EXPLORATION.TARGET_COLLISION_TURN_SPEED, CONST.EXPLORATION.TARGET_SEEKING_BORDER_AVOIDANCE_DURATION);
            this.resetScan();
            return;
        }
        
        // 距離センサでターゲットとの衝突回避（接近しすぎた場合）
        if (distance <= CONST.EXPLORATION.TARGET_SEEKING_COLLISION_DISTANCE) {
            this.addMove(-CONST.EXPLORATION.TARGET_SEEKING_AVOIDANCE_SPEED, CONST.EXPLORATION.TARGET_SEEKING_AVOIDANCE_SPEED, CONST.EXPLORATION.TARGET_SEEKING_AVOIDANCE_DURATION);
            this.resetScan();
            return;
        }
        
        // スキャン実行
        if (!this.scanComplete) {
            this.performScan(robot);
        } else {
            // スキャン完了後、最も近いターゲットに向かう
            this.approachNearestTarget(robot);
        }
    }
    
    performScan(robot) {
        robot.setServo(this.scanAngle);
        robot.delay(CONST.EXPLORATION.SCAN_DELAY); // 5°刻みなので待機時間短縮
        
        const scanDistance = robot.getDistance();
        
        // スキャン結果を記録（有効範囲のみ）
        if (scanDistance < CONST.SENSORS.DISTANCE_MAX_RANGE && scanDistance > CONST.SENSORS.DISTANCE_MIN_RANGE) {
            this.scanResults.set(this.scanAngle, scanDistance);
            
            // 最も近いターゲットを更新
            if (scanDistance < this.nearestDistance) {
                this.nearestDistance = scanDistance;
                this.nearestAngle = this.scanAngle;
                this.targetFound = true;
            }
            
            // 全期間を通じての最接近距離を記録
            if (scanDistance < this.closestTargetDistance) {
                this.closestTargetDistance = scanDistance;
                console.log(`New closest target distance: ${this.closestTargetDistance.toFixed(1)}mm at angle ${this.scanAngle}°`);
            }
        }
        
        // 次のスキャン角度へ
        this.scanAngle += this.scanDirection * CONST.EXPLORATION.SCAN_ANGLE_STEP;
        
        if (this.scanAngle >= 90) {
            this.scanAngle = 90;
            this.scanDirection = -1;
        } else if (this.scanAngle <= -90) {
            this.scanAngle = -90;
            this.scanDirection = 1;
        }
        
        // スキャン完了判定（一周した場合）
        if (this.scanAngle === -90 && this.scanDirection === 1 && this.scanResults.size > 0) {
            this.scanComplete = true;
            robot.setServo(0); // サーボを正面に戻す
        }
    }
    
    approachNearestTarget(robot) {
        if (!this.targetFound) {
            // ターゲットが見つからなかった場合、前進して新しい位置でスキャン
            this.addMove(CONST.ROBOT_CONTROL.DEFAULT_FORWARD_SPEED / 1.25, CONST.ROBOT_CONTROL.DEFAULT_FORWARD_SPEED / 1.25, CONST.EXPLORATION.TARGET_APPROACH_MOVE_DURATION);
            this.resetScan();
            return;
        }
        
        // 最も近いターゲットの方向に向かって移動
        const targetAngle = this.nearestAngle;
        const targetDistance = this.nearestDistance;
        
        // ターゲットまでの距離-10cm（100mm）分だけ進む
        const approachDistance = Math.max(0, targetDistance - 100); // 最小0mm（負の値を防ぐ）
        
        console.log(`Approaching target: distance=${targetDistance.toFixed(1)}mm, angle=${targetAngle}°, approach=${approachDistance.toFixed(1)}mm`);
        
        if (targetAngle < -15) {
            // 左旋回してから接近
            this.addMove(80, 140, 200);
            if (approachDistance > 0) {
                this.addMove(150, 150, this.calculateMoveTime(approachDistance));
            }
        } else if (targetAngle > 15) {
            // 右旋回してから接近  
            this.addMove(140, 80, 200);
            if (approachDistance > 0) {
                this.addMove(150, 150, this.calculateMoveTime(approachDistance));
            }
        } else if (targetAngle < -5) {
            // 軽微な左旋回してから接近
            this.addMove(100, 130, 150);
            if (approachDistance > 0) {
                this.addMove(150, 150, this.calculateMoveTime(approachDistance));
            }
        } else if (targetAngle > 5) {
            // 軽微な右旋回してから接近
            this.addMove(130, 100, 150);
            if (approachDistance > 0) {
                this.addMove(150, 150, this.calculateMoveTime(approachDistance));
            }
        } else {
            // 正面なので直進（距離-10cm分）
            if (approachDistance > 0) {
                this.addMove(150, 150, this.calculateMoveTime(approachDistance));
            }
        }
        
        // 接近後、新しいスキャンを開始
        this.resetScan();
    }
    
    // 移動距離から移動時間を計算（150mm/s速度での移動時間）
    calculateMoveTime(distance) {
        // 速度150mm/s、距離をmmで受け取り、時間をmsで返す
        const speed = 150; // mm/s
        const timeSeconds = distance / speed;
        const timeMs = timeSeconds * 1000;
        return Math.max(100, Math.min(2000, timeMs)); // 100ms-2000msの範囲に制限
    }
    
    resetScan() {
        this.scanAngle = -90;
        this.scanDirection = 1;
        this.targetFound = false;
        this.nearestAngle = 0;
        this.nearestDistance = Infinity;
        this.scanResults.clear();
        this.scanComplete = false;
        // closestTargetDistance はリセットしない（ゲーム全体での最接近距離を保持）
    }
    
    reset() {
        super.reset();
        this.resetScan();
        this.closestTargetDistance = Infinity; // ゲーム全体のリセット時のみ初期化
    }
    
    // ゲームオーバー時に呼び出される関数
    getClosestTargetDistance() {
        return this.closestTargetDistance;
    }
}

class ManualControlProgram extends BaseExplorationProgram {
    constructor() {
        super();
        this.currentLeftSpeed = 0;
        this.currentRightSpeed = 0;
        this.servoAngle = 0;
    }
    
    execute(robot) {
        // 手動操作では自動的な動作は行わない
        // 外部からsetMotorSpeeds()とsetServo()で制御される
        robot.setMotorSpeeds(this.currentLeftSpeed, this.currentRightSpeed);
        robot.setServo(this.servoAngle);
    }
    
    setMotorSpeeds(leftSpeed, rightSpeed) {
        this.currentLeftSpeed = leftSpeed;
        this.currentRightSpeed = rightSpeed;
    }
    
    setServoAngle(angle) {
        this.servoAngle = angle;
    }
    
    stop() {
        this.currentLeftSpeed = 0;
        this.currentRightSpeed = 0;
    }
    
    reset() {
        super.reset();
        this.currentLeftSpeed = 0;
        this.currentRightSpeed = 0;
        this.servoAngle = 0;
    }
}

// グローバルスコープに公開
window.ExplorationPrograms = ExplorationPrograms;
window.WallFollowingProgram = WallFollowingProgram;
window.SpiralSearchProgram = SpiralSearchProgram;
window.RandomWalkProgram = RandomWalkProgram;
window.SystematicGridProgram = SystematicGridProgram;
window.TargetSeekingProgram = TargetSeekingProgram;
window.ManualControlProgram = ManualControlProgram;

// export { 
//     ExplorationPrograms, 
//     WallFollowingProgram, 
//     SpiralSearchProgram, 
//     RandomWalkProgram, 
//     SystematicGridProgram, 
//     TargetSeekingProgram,
//     ManualControlProgram
// };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ExplorationPrograms, 
        WallFollowingProgram, 
        SpiralSearchProgram, 
        RandomWalkProgram, 
        SystematicGridProgram, 
        TargetSeekingProgram,
        ManualControlProgram
    };
}