// 定数をインポート
// import * as CONST from './constants.js';

class ExplorationPrograms {
    static programs = {
        'wall_following': '壁沿い探索',
        'spiral_search': 'スパイラル探索',
        'random_walk': 'ランダム探索',
        'systematic_grid': '格子探索',
        'target_seeking': 'ターゲット追跡',
        'direct_approach': '直接アプローチ戦略',
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
            case 'direct_approach':
                return new DirectApproachProgram();
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
        // robot.yamlのsensor設定を使用
        const sensorConfig = robot.sensors;
        const maxRange = sensorConfig?.distance_sensor?.max_range || 4000;
        const minRange = sensorConfig?.distance_sensor?.min_range || 20;
        
        if (scanDistance < maxRange && scanDistance > minRange) {
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

// 直接アプローチ戦略 - direct_aproach.mdの仕様に基づく実装
class DirectApproachProgram extends BaseExplorationProgram {
    constructor() {
        super();
        this.state = 'first';
        this.previousState = null;
        
        // 非同期処理用タイマー
        this.tMotor = 0;
        this.tSensor = 0;
        this.tPhoto = 0;
        
        // パラメータ（direct_aproach.mdより）
        this.params = {
            // 検索パラメータ
            search_angle_L: -90,
            search_angle_R: 90,
            search_angle_step: 4,
            search_timeout: 15000,
            target_selection_strategy: 'nearest', // 'leftmost' or 'rightmost' or "nearest" , or "center_closest"
            
            // 接近パラメータ
            approach_speed: 150,
            distance_threshold: 2,

            // calibrated_approachフィードバック制御パラメータ
            feedback_scan_angles: [-15, 0, 15],    // フィードバック用スキャン角度
            feedback_scan_delay: 30,               // スキャン間隔 (ms)
            direction_correction_gain: 2.0,        // 方向修正ゲイン
            min_approach_speed: 80,                // 最小接近速度
            max_approach_speed: 200,               // 最大接近速度
            
            // ステップ移動パラメータ
            step_forward_distance: 10,
            step_forward_angle: 90,
            step_back_distance: 5,
            
            // 落下回避パラメータ
            avoid_fall_back_distance: 15,
            
            // 404状態パラメータ
            recovery_forward_distance: 100,
            recovery_rotation_angle: 60,
            
            // 非同期処理パラメータ
            photo_sensor_frequency: 50,
            motor_control_frequency: 200,
            servo_control_frequency: 50,
            
            // 回転調整パラメータ（目視調整用）
            first_rotation_time: 1500,        // first状態での-90°回転時間 (ms) - 目視で調整
            step_rotation_time: 1600,         // step_forward状態での回転時間 (ms) - 目視で調整
            recovery_rotation_time: 333,      // 404状態での30°回転時間 (ms) - 目視で調整
            
            // デバッグ用パラメータ
            avoid_fall_enabled: true          // avoid_fall機能の有効/無効切り替え
        };
        
        // 状態固有変数
        this.searchStartTime = 0;
        this.currentServoAngle = this.params.search_angle_L;
        this.scanResults = [];
        this.targetAngle = 0;
        this.stepForwardPhase = 0; // 0:後退, 1:回転, 2:前進
        this.stepForwardStartTime = 0;
        this.isFirstInitialized = false;
        
        // avoid_fall状態用変数
        this.avoidFallPhase = 0; // 0:スキャン, 1:後退
        this.avoidFallServoAngle = -90;
        this.avoidFallScanResults = [];
        
        // calibrated_approach状態用変数
        this.lastFeedbackTime = 0;
        this.currentScanIndex = 0;
        this.feedbackDistances = []; // [left, center, right]の距離
    }
    
    execute(robot) {
        const now = robot.millis();
        
        // 非同期処理実行
        this.executeAsyncTasks(robot, now);
        
        // メインステート処理
        return this.executeCurrentState(robot, now);
    }
    
    executeAsyncTasks(robot, now) {
        // モーター制御（200Hz = 5ms間隔）
        if (now - this.tMotor >= 1000 / this.params.motor_control_frequency) {
            this.controlMotor(robot);
            this.tMotor = now;
        }
        
        // センサー読み取り（50Hz = 20ms間隔）
        if (now - this.tSensor >= 1000 / this.params.servo_control_frequency) {
            this.readSensors(robot);
            this.tSensor = now;
        }
        
        // フォトセンサー監視（calibrated_approach状態とfound状態以外）
        if (this.state !== 'calibrated_approach' && this.state !== 'found') {
            if (now - this.tPhoto >= 1000 / this.params.photo_sensor_frequency) {
                this.checkPhotoSensors(robot);
                this.tPhoto = now;
            }
        }
    }
    
    executeCurrentState(robot, now) {
        // デバッグ: 現在の状態を表示
        console.log(`🔄 状態実行: ${this.state} (時刻: ${now}ms)`);
        
        switch(this.state) {
            case 'first':
                return this.executeFirst(robot, now);
            case 'search':
                return this.executeSearch(robot, now);
            case 'calibrated_approach':
                return this.executeCalibratedApproach(robot, now);
            case 'found':
                return this.executeFound(robot, now);
            case 'step_forward':
                return this.executeStepForward(robot, now);
            case 'avoid_fall':
                return this.executeAvoidFall(robot, now);
            case '404':
                return this.execute404(robot, now);
            default:
                console.log(`⚠️ 不明な状態: ${this.state} → first状態にリセット`);
                this.state = 'first';
                return true;
        }
    }
    
    executeFirst(robot, now) {
        if (!this.isFirstInitialized) {
            console.log('直接アプローチ戦略開始: first状態');
            console.log(`-90°回転開始 (時間: ${this.params.first_rotation_time}ms)`);
            
            // -90°回転開始
            robot.setMotorSpeeds(-80, 80);
            this.stepForwardStartTime = now;
            this.isFirstInitialized = true;
            return true;
        }
        
        // 設定時間経過で回転完了
        if (now - this.stepForwardStartTime >= this.params.first_rotation_time) {
            robot.setMotorSpeeds(0, 0);
            this.state = 'search';
            this.searchStartTime = now;
            console.log(`first状態完了（${this.params.first_rotation_time}ms回転） → search状態へ移行`);
            return true;
        }
        
        return true;
    }
    
    executeSearch(robot, now) {
        // デバッグ: search状態開始時の情報
        if (this.searchStartTime === 0) {
            console.log('⚠️ SEARCH状態開始時 searchStartTime が0です！');
            this.searchStartTime = now;
        }
        
        const elapsedTime = now - this.searchStartTime;
        console.log(`🔍 SEARCH状態実行中: 経過時間=${elapsedTime}ms, サーボ角度=${this.currentServoAngle}°, スキャン結果数=${this.scanResults.length}`);
        
        // タイムアウトチェック
        if (elapsedTime >= this.params.search_timeout) {
            console.log(`⏰ search状態タイムアウト（${this.params.search_timeout}ms） → 404状態へ移行`);
            this.state = '404';
            this.stepForwardStartTime = now;
            return true;
        }
        
        // サーボスキャン実行
        if (this.currentServoAngle <= this.params.search_angle_R) {
            console.log(`🎯 サーボスキャン: 角度=${this.currentServoAngle}°（範囲: ${this.params.search_angle_L}°〜${this.params.search_angle_R}°）`);
            
            robot.setServo(this.currentServoAngle);
            robot.delay(50); // サーボ安定待機
            
            const distance = robot.getDistance();
            console.log(`📏 距離測定: ${distance}mm`);
            
            if (distance <= 4000 && distance >= 20) { // 有効範囲内
                this.scanResults.push({
                    angle: this.currentServoAngle,
                    distance: distance
                });
                console.log(`✅ 有効な測定値を記録: 角度=${this.currentServoAngle}°, 距離=${distance}mm`);
            } else {
                console.log(`❌ 測定値が範囲外: ${distance}mm（有効範囲: 20-4000mm）`);
            }
            
            this.currentServoAngle += this.params.search_angle_step;
            console.log(`⬆️ 次のサーボ角度: ${this.currentServoAngle}°（ステップ: ${this.params.search_angle_step}°）`);
            
            // 車体回転（同時実行）
            robot.setMotorSpeeds(-30, 30); // ゆっくり回転
            console.log(`🔄 車体回転中: 左モーター=-30, 右モーター=30`);
            
            return true;
        }
        
        // スキャン完了
        console.log(`🏁 サーボスキャン完了！総スキャン結果数: ${this.scanResults.length}`);
        console.log(`📊 スキャン結果詳細:`, this.scanResults);
        
        // ターゲット選択
        if (this.scanResults.length > 0) {
            this.targetAngle = this.selectTarget();
            console.log(`🎯 ターゲット選択完了: 角度=${this.targetAngle}°, 戦略=${this.params.target_selection_strategy}`);
            
            // ターゲット方向に向ける
            this.state = 'calibrated_approach';
            robot.setServo(this.targetAngle);
            robot.setMotorSpeeds(0, 0);
            console.log(`➡️ calibrated_approach状態へ移行`);
            return true;
        } else {
            // ターゲットが見つからない場合
            console.log(`❌ ターゲット未発見（スキャン結果0件） → 404状態へ移行`);
            this.state = '404';
            this.stepForwardStartTime = now;
            return true;
        }
    }
    
    executeCalibratedApproach(robot, now) {
        const currentDistance = robot.getDistance();
        const leftPhoto = robot.getL_Photo();
        const rightPhoto = robot.getR_Photo();
        
        // ターゲット発見条件チェック
        const targetDetectionDistance = this.params.distance_threshold * 10; // cm → mm変換
        if (currentDistance <= targetDetectionDistance && (leftPhoto || rightPhoto)) {
            console.log(`🎯 ターゲット発見条件満足（距離=${currentDistance}mm, フォト検知） → found状態へ移行`);
            this.state = 'found';
            robot.setMotorSpeeds(0, 0);
            return true;
        }
        
        // 距離のみで接近完了判定
        if (currentDistance <= targetDetectionDistance) {
            console.log(`📍 距離接近完了（${currentDistance}mm） → found状態へ移行`);
            this.state = 'found';
            robot.setMotorSpeeds(0, 0);
            return true;
        }
        
        // フィードバック制御による方向修正とアプローチ
        this.performFeedbackControl(robot, now);
        return true;
    }
    
    performFeedbackControl(robot, now) {
        // フィードバックスキャンの実行
        if (now - this.lastFeedbackTime >= this.params.feedback_scan_delay) {
            this.performFeedbackScan(robot);
            this.lastFeedbackTime = now;
        }
        
        // 3方向のスキャンが完了したら速度調整
        if (this.feedbackDistances.length === this.params.feedback_scan_angles.length) {
            this.adjustMotorSpeeds(robot);
            this.feedbackDistances = []; // リセット
            this.currentScanIndex = 0;
        }
    }
    
    performFeedbackScan(robot) {
        if (this.currentScanIndex < this.params.feedback_scan_angles.length) {
            const scanAngle = this.params.feedback_scan_angles[this.currentScanIndex];
            robot.setServo(scanAngle);
            robot.delay(this.params.feedback_scan_delay);
            
            const distance = robot.getDistance();
            this.feedbackDistances.push(distance);
            
            console.log(`📡 フィードバックスキャン: 角度=${scanAngle}°, 距離=${distance}mm`);
            
            this.currentScanIndex++;
        }
    }
    
    adjustMotorSpeeds(robot) {
        const [leftDistance, centerDistance, rightDistance] = this.feedbackDistances;
        
        // 方向修正計算（左右の距離差に基づく）
        const directionError = (leftDistance - rightDistance) * this.params.direction_correction_gain;
        
        // 一定の基本速度
        const baseSpeed = this.params.approach_speed;
        
        // 左右モーター速度計算（方向修正のみ）
        let leftSpeed = baseSpeed - directionError;
        let rightSpeed = baseSpeed + directionError;
        
        // 速度制限（負の値を防ぐ）
        leftSpeed = Math.max(this.params.min_approach_speed, 
                            Math.min(this.params.max_approach_speed, leftSpeed));
        rightSpeed = Math.max(this.params.min_approach_speed, 
                             Math.min(this.params.max_approach_speed, rightSpeed));
        
        robot.setMotorSpeeds(leftSpeed, rightSpeed);
        
        console.log(`🎮 方向修正制御: 左=${leftSpeed.toFixed(1)}, 右=${rightSpeed.toFixed(1)}, 修正量=${directionError.toFixed(1)}`);
        console.log(`📊 距離: 左=${leftDistance}mm, 中央=${centerDistance}mm, 右=${rightDistance}mm`);
    }
    
    executeFound(robot, now) {
        console.log('found'); // モック実装
        robot.setMotorSpeeds(0, 0);
        
        // 自動的にstep_forward状態に移行
        this.state = 'step_forward';
        this.stepForwardPhase = 0;
        this.stepForwardStartTime = now;
        console.log('found状態完了 → step_forward状態へ移行');
        return true;
    }
    
    executeStepForward(robot, now) {
        const elapsed = now - this.stepForwardStartTime;
        
        switch(this.stepForwardPhase) {
            case 0: // 後退フェーズ
                robot.setMotorSpeeds(-50, -50);
                if (elapsed >= 200) { // 5mm後退完了（概算）
                    this.stepForwardPhase = 1;
                    this.stepForwardStartTime = now;
                }
                break;
                
            case 1: // 回転フェーズ
                robot.setMotorSpeeds(-80, 80);
                if (elapsed >= this.params.step_rotation_time) {
                    this.stepForwardPhase = 2;
                    this.stepForwardStartTime = now;
                }
                break;
                
            case 2: // 前進フェーズ
                robot.setMotorSpeeds(50, 50);
                if (elapsed >= 200) { // 10mm前進完了（概算）
                    robot.setMotorSpeeds(0, 0);
                    // search状態に戻る
                    this.state = 'search';
                    this.resetSearchState();
                    console.log('step_forward状態完了 → search状態へ移行');
                }
                break;
        }
        
        return true;
    }
    
    executeAvoidFall(robot, now) {
        switch(this.avoidFallPhase) {
            case 0: // サーボスキャンフェーズ
                // サーボ角度範囲内でスキャン
                if (this.avoidFallServoAngle <= 90) {
                    robot.setServo(this.avoidFallServoAngle);
                    robot.delay(50); // サーボ安定待機
                    
                    const distance = robot.getDistance();
                    console.log(`avoid_fall スキャン: 角度${this.avoidFallServoAngle}°, 距離${distance}mm`);
                    
                    // 有効範囲内で距離センサーが既定値以下の場合
                    if (distance <= this.params.distance_threshold * 10 && distance >= 20) {
                        this.avoidFallScanResults.push({
                            angle: this.avoidFallServoAngle,
                            distance: distance
                        });
                    }
                    
                    this.avoidFallServoAngle += this.params.search_angle_step;
                    return true;
                }
                
                // スキャン完了、結果判定
                if (this.avoidFallScanResults.length > 0) {
                    // ターゲット発見
                    console.log(`avoid_fall: ターゲット発見！結果数: ${this.avoidFallScanResults.length}`);
                    console.log('found'); // found()関数呼び出し
                    
                    // 前の状態に復帰
                    this.state = this.previousState || 'search';
                    this.resetAvoidFallState();
                    console.log(`avoid_fall状態完了（ターゲット発見） → ${this.state}状態へ復帰`);
                    return true;
                } else {
                    // ターゲット未発見、後退フェーズへ
                    console.log('avoid_fall: ターゲット未発見 → 後退フェーズへ');
                    this.avoidFallPhase = 1;
                    this.stepForwardStartTime = now;
                    return true;
                }
                
            case 1: // 後退フェーズ
                robot.setMotorSpeeds(-50, -50);
                
                // 後退時間計算（avoid_fall_back_distanceに基づく）
                const backTime = (this.params.avoid_fall_back_distance / 50) * 1000; // 概算
                
                if (now - this.stepForwardStartTime >= backTime) {
                    robot.setMotorSpeeds(0, 0);
                    
                    // 前の状態に復帰
                    this.state = this.previousState || 'search';
                    this.resetAvoidFallState();
                    console.log(`avoid_fall状態完了（${this.params.avoid_fall_back_distance}mm後退） → ${this.state}状態へ復帰`);
                    return true;
                }
                
                return true;
                
            default:
                // 異常状態、強制復帰
                this.state = this.previousState || 'search';
                this.resetAvoidFallState();
                return true;
        }
    }
    
    execute404(robot, now) {
        const elapsed = now - this.stepForwardStartTime;
        
        if (elapsed < 2000) { // 前進フェーズ（2秒で100mm前進）
            robot.setMotorSpeeds(50, 50);
        } else if (elapsed < 2000 + this.params.recovery_rotation_time) { // 回転フェーズ
            robot.setMotorSpeeds(-80, 80);
        } else {
            // 動作完了、search状態に戻る
            robot.setMotorSpeeds(0, 0);
            this.state = 'search';
            this.resetSearchState();
            console.log('404状態完了 → search状態へ移行');
        }
        
        return true;
    }
    
    // 非同期処理メソッド
    controlMotor(robot) {
        // モーター制御の詳細処理（必要に応じて実装）
    }
    
    readSensors(robot) {
        // センサー読み取りの詳細処理（必要に応じて実装）
    }
    
    checkPhotoSensors(robot) {
        // avoid_fall機能が無効化されている場合はスキップ
        if (!this.params.avoid_fall_enabled) {
            return;
        }
        
        // フォトセンサー監視
        if (robot.getL_Photo() || robot.getR_Photo()) {
            // 黒ライン検知、avoid_fall状態に移行
            if (this.state === 'first' || this.state === 'search' || 
                this.state === 'step_forward' || this.state === '404') {
                console.log('黒ライン検知 → avoid_fall状態へ移行');
                this.previousState = this.state;
                this.state = 'avoid_fall';
                this.resetAvoidFallState(); // avoid_fall状態をリセット
            }
        }
    }
    
    // ユーティリティメソッド
    selectTarget() {
        if (this.scanResults.length === 0) return 0;
        
        switch(this.params.target_selection_strategy) {
            case 'nearest':
                return this.scanResults.reduce((min, curr) => 
                    curr.distance < min.distance ? curr : min).angle;
            case 'leftmost':
                return Math.min(...this.scanResults.map(r => r.angle));
            case 'rightmost':
                return Math.max(...this.scanResults.map(r => r.angle));
            case 'center_closest':
                return this.scanResults.reduce((closest, curr) => 
                    Math.abs(curr.angle) < Math.abs(closest.angle) ? curr : closest).angle;
            default:
                return this.scanResults[0].angle;
        }
    }
    
    resetSearchState() {
        console.log(`🔧 search状態リセット: 角度${this.params.search_angle_L}°から開始`);
        this.currentServoAngle = this.params.search_angle_L;
        this.scanResults = [];
        this.searchStartTime = 0;
    }
    
    resetAvoidFallState() {
        this.avoidFallPhase = 0;
        this.avoidFallServoAngle = -90;
        this.avoidFallScanResults = [];
    }
    
    reset() {
        super.reset();
        this.state = 'first';
        this.previousState = null;
        this.isFirstInitialized = false;
        this.resetSearchState();
        this.stepForwardPhase = 0;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ExplorationPrograms, 
        WallFollowingProgram, 
        SpiralSearchProgram, 
        RandomWalkProgram, 
        SystematicGridProgram, 
        TargetSeekingProgram,
        DirectApproachProgram,
        ManualControlProgram
    };
}