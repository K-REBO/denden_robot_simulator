// import { Sensors } from './sensors.js';
// import { robotConfig } from './config_loader.js';

class Robot {
    constructor(config = null, x = null, y = null, angle = null) {
        // ConfigManagerを使用して設定値を処理
        const rawConfig = config || robotConfig.getAll();
        this.configManager = new ConfigManager(rawConfig);
        const processedConfig = this.configManager.getRobotConfig();
        
        // 位置と角度の設定（引数優先、次に処理済み設定値）
        this.x = x !== null ? x : processedConfig.initialPosition.x;
        this.y = y !== null ? y : processedConfig.initialPosition.y;
        this.angle = angle !== null ? angle : processedConfig.initialPosition.angle;
        
        // 初期位置を保存（リセット用）
        this.initialX = this.x;
        this.initialY = this.y;
        this.initialAngle = this.angle;
        
        // 動作パラメータを処理済み設定から読み込み
        this.leftSpeed = 0;
        this.rightSpeed = 0;
        this.maxSpeed = processedConfig.performance.maxSpeed;
        this.maxRotationSpeed = processedConfig.performance.maxRotationSpeed;
        this.acceleration = processedConfig.performance.acceleration;
        this.deceleration = processedConfig.performance.deceleration;
        
        // 物理的寸法を処理済み設定から読み込み
        this.width = processedConfig.dimensions.width;
        this.height = processedConfig.dimensions.height;
        this.length = processedConfig.dimensions.length;
        this.wheelbase = processedConfig.dimensions.wheelbase;
        
        // 車輪位置による落下判定（ロボット中心からの車輪位置）
        this.wheelTrack = {
            width: processedConfig.dimensions.wheelTrack.width,
            length: processedConfig.dimensions.wheelTrack.length
        };
        
        // シミュレーション設定
        const simConfig = this.configManager.getSimulationConfig();
        this.trail = [];
        this.maxTrailLength = simConfig.trailLength;
        this.startTime = Date.now();
        
        // 誤差・ノイズ設定
        this.motorVariance = processedConfig.errors.motorNoise;
        this.angleError = rawConfig.errors?.angle_error || 2;
        this.positionDrift = processedConfig.errors.positionDrift;
        
        // センサー初期化（ConfigManagerを渡す）
        this.sensors = new RobotSensors(this.configManager);
        this.sensors.setRobot(this);
        
        // 制御関連
        this.moveStartTime = 0;
        this.moveQueue = [];
        this.isMoving = false;
        this.commandBuffer = rawConfig.control?.command_buffer || 10;
        this.responseTime = rawConfig.control?.response_time || 50;
        
        this.explorationProgram = null;
        
        console.log(`Robot initialized with config: ${rawConfig.name || 'Default'}`);
    }
    
    /**
     * 当たり判定用四角形の4つの角を計算
     * @returns {Array} 4つの角の位置の配列 [{x, y}, {x, y}, {x, y}, {x, y}]
     */
    getCollisionCorners() {
        const halfWidth = this.wheelTrack.width / 2;
        const halfLength = this.wheelTrack.length / 2;
        const angleRad = this.angle * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        // ロボット中心からの相対座標（回転前）
        const corners = [
            { x: -halfLength, y: -halfWidth },  // 左上
            { x: halfLength, y: -halfWidth },   // 右上
            { x: halfLength, y: halfWidth },    // 右下
            { x: -halfLength, y: halfWidth }    // 左下
        ];
        
        // 回転を適用して絶対座標に変換
        return corners.map(corner => ({
            x: this.x + corner.x * cos - corner.y * sin,
            y: this.y + corner.x * sin + corner.y * cos
        }));
    }
    
    setField(field) {
        this.field = field;
        this.sensors.setField(field);
    }
    
    setMotorSpeeds(leftSpeed, rightSpeed) {
        this.leftSpeed = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, leftSpeed));
        this.rightSpeed = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, rightSpeed));
    }
    
    delay(milliseconds) {
        this.moveQueue.push({
            type: 'delay',
            duration: milliseconds,
            startTime: null
        });
    }
    
    millis() {
        return Date.now() - this.startTime;
    }
    
    setServo(angle) {
        this.sensors.setServo(angle);
    }
    
    getDistance() {
        return this.sensors.getDistance();
    }
    
    getL_Photo() {
        return this.sensors.getL_Photo();
    }
    
    getR_Photo() {
        return this.sensors.getR_Photo();
    }
    
    update(deltaTime) {
        if (this.moveQueue.length > 0 && !this.isMoving) {
            const currentMove = this.moveQueue[0];
            if (currentMove.type === 'delay') {
                if (currentMove.startTime === null) {
                    currentMove.startTime = Date.now();
                    this.isMoving = true;
                }
                
                if (Date.now() - currentMove.startTime >= currentMove.duration) {
                    this.moveQueue.shift();
                    this.isMoving = false;
                }
                return;
            }
        }
        
        if (this.leftSpeed === 0 && this.rightSpeed === 0) {
            return;
        }
        
        const dt = deltaTime / 1000;
        
        const wheelbase = 200;
        const leftDistance = this.leftSpeed * dt;
        const rightDistance = this.rightSpeed * dt;
        
        if (Math.abs(leftDistance - rightDistance) < 0.001) {
            const moveDistance = leftDistance;
            this.x += moveDistance * Math.cos(this.angle * Math.PI / 180);
            this.y += moveDistance * Math.sin(this.angle * Math.PI / 180);
        } else {
            const radius = wheelbase * (leftDistance + rightDistance) / (2 * (rightDistance - leftDistance));
            const angularVelocity = (rightDistance - leftDistance) / wheelbase;
            
            const centerX = this.x - radius * Math.sin(this.angle * Math.PI / 180);
            const centerY = this.y + radius * Math.cos(this.angle * Math.PI / 180);
            
            this.angle += angularVelocity * 180 / Math.PI;
            this.angle = ((this.angle % 360) + 360) % 360;
            
            this.x = centerX + radius * Math.sin(this.angle * Math.PI / 180);
            this.y = centerY - radius * Math.cos(this.angle * Math.PI / 180);
        }
        
        this.trail.push({x: this.x, y: this.y, time: Date.now()});
        
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // 誤差・ノイズの適用
        this.applyErrors(deltaTime);
        
        if (this.field) {
            const safety = this.field.checkSafety(this);
            if (safety) {
                this.leftSpeed = 0;
                this.rightSpeed = 0;
                return safety;
            }
            
            const leftPhoto = this.getL_Photo();
            const rightPhoto = this.getR_Photo();
            const distance = this.getDistance();
            
            this.field.checkTargetReached(this.x, this.y, leftPhoto, rightPhoto, distance);
        }
        
        return null;
    }
    
    applyErrors(deltaTime) {
        // 位置ドリフト誤差
        const driftX = (Math.random() - 0.5) * this.positionDrift * deltaTime / 1000;
        const driftY = (Math.random() - 0.5) * this.positionDrift * deltaTime / 1000;
        this.x += driftX;
        this.y += driftY;
        
        // 角度誤差（累積）
        const angleDrift = (Math.random() - 0.5) * this.angleError * deltaTime / 1000;
        this.angle += angleDrift;
        this.angle = ((this.angle % 360) + 360) % 360;
    }
    
    applyMotorVariance(leftSpeed, rightSpeed) {
        // モーター個体差を適用
        const leftVariance = 1 + (Math.random() - 0.5) * this.motorVariance * 2;
        const rightVariance = 1 + (Math.random() - 0.5) * this.motorVariance * 2;
        
        return {
            left: leftSpeed * leftVariance,
            right: rightSpeed * rightVariance
        };
    }
    
    reset() {
        this.x = this.initialX;
        this.y = this.initialY;
        this.angle = this.initialAngle;
        this.leftSpeed = 0;
        this.rightSpeed = 0;
        this.trail = [];
        this.startTime = Date.now();
        this.moveQueue = [];
        this.isMoving = false;
        this.sensors.setServo(0);
        
        if (this.explorationProgram) {
            this.explorationProgram.reset();
        }
    }
    
    setExplorationProgram(program) {
        this.explorationProgram = program;
        if (program) {
            program.reset();
        }
    }
    
    executeExploration() {
        if (this.explorationProgram) {
            this.explorationProgram.execute(this);
        } else {
            this.executeDefaultBehavior();
        }
    }
    
    executeDefaultBehavior() {
        if (this.moveQueue.length > 0) {
            return;
        }
        
        const leftPhoto = this.getL_Photo();
        const rightPhoto = this.getR_Photo();
        const distance = this.getDistance();
        
        if (leftPhoto || rightPhoto) {
            this.setMotorSpeeds(-100, 100);
            this.delay(500);
            this.setMotorSpeeds(0, 0);
        } else {
            this.setServo(-45);
            this.delay(100);
            const leftDistance = this.getDistance();
            
            this.setServo(45);
            this.delay(100);
            const rightDistance = this.getDistance();
            
            this.setServo(0);
            this.delay(100);
            
            if (leftDistance > rightDistance) {
                this.setMotorSpeeds(50, 150);
            } else {
                this.setMotorSpeeds(150, 50);
            }
            
            this.delay(200);
            this.setMotorSpeeds(0, 0);
        }
    }
}

// グローバルスコープに公開
window.Robot = Robot;

// export { Robot };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Robot;
}