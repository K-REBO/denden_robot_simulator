class RobotSensors {
    constructor(configManager = null) {
        // ConfigManagerから処理済み設定値を取得、またはフォールバック
        this.configManager = configManager;
        this.config = configManager ? {} : (robotConfig ? robotConfig.getAll() : {});
        
        this.servoAngle = 0;
        this.robot = null;
        this.field = null;
        
        // ConfigManagerから処理済み設定値を取得
        if (this.configManager) {
            this.initializeFromProcessedConfig();
        } else {
            this.initializeWithLegacyConfig();
        }
    }
    
    initializeFromProcessedConfig() {
        const sensorConfig = this.configManager.getSensorConfig();
        
        // 距離センサー設定
        const distConfig = sensorConfig.distance;
        this.minDistance = distConfig.minDistance;
        this.maxDistance = distConfig.maxDistance;
        this.distanceAccuracy = distConfig.accuracy;
        this.servoMinAngle = distConfig.servoRange.min;
        this.servoMaxAngle = distConfig.servoRange.max;
        this.scanSpeed = distConfig.scanSpeed;
        
        // フォトセンサー設定  
        const photoConfig = sensorConfig.photo;
        this.photoCount = photoConfig.count;
        this.photoBaseX = photoConfig.basePosition.x;
        this.photoBaseY = photoConfig.basePosition.y;
        this.photoSpacing = photoConfig.spacing;
        this.photoPositions = photoConfig.positions;
        this.detectionRange = photoConfig.detectionRange;
        this.responseTime = photoConfig.responseTime;
        this.threshold = photoConfig.threshold;
        
        // ノイズ設定
        this.sensorNoise = sensorConfig.noise.sensorNoise;
        this.distanceError = this.configManager.rawConfig.errors?.distance_sensor_error || 5;
    }
    
    initializeWithLegacyConfig() {
        // 従来の設定方式（フォールバック）
        const distConfig = this.config.sensors?.distance_sensor || {};
        this.minDistance = distConfig.min_range || 20;
        this.maxDistance = distConfig.max_range || 4000;
        this.distanceAccuracy = distConfig.accuracy || 5;
        this.servoMinAngle = distConfig.servo_range?.min || -90;
        this.servoMaxAngle = distConfig.servo_range?.max || 90;
        this.scanSpeed = distConfig.scan_speed || 180;
        
        // フォトセンサー設定  
        const photoConfig = this.config.sensors?.photo_sensors || {};
        this.photoCount = photoConfig.count || 2;
        this.photoBaseX = photoConfig.position?.base_x || 250;
        this.photoBaseY = photoConfig.position?.base_y || 0;
        this.photoSpacing = photoConfig.position?.spacing || 200;
        this.detectionRange = photoConfig.detection_range || 10;
        this.responseTime = photoConfig.response_time || 10;
        this.threshold = photoConfig.threshold || 0.5;
        
        // ノイズ設定
        this.sensorNoise = this.config.errors?.sensor_noise || 0.02;
        this.distanceError = this.config.errors?.distance_sensor_error || 5;
        
        console.log('Sensors initialized with config');
    }
    
    setRobot(robot) {
        this.robot = robot;
    }
    
    setField(field) {
        this.field = field;
    }
    
    setServo(angle) {
        this.servoAngle = Math.max(this.servoMinAngle, Math.min(this.servoMaxAngle, angle));
    }
    
    getDistance() {
        if (!this.robot || !this.field) {
            return this.maxDistance;
        }
        
        // 距離センサーの実際の位置を計算（ロボット中心からのオフセット適用）
        let sensorOffsetX, sensorOffsetY;
        
        if (this.configManager) {
            const sensorConfig = this.configManager.getSensorConfig();
            sensorOffsetX = sensorConfig.distance.position.x;
            sensorOffsetY = sensorConfig.distance.position.y;
        } else {
            // フォールバック用（デフォルト値）
            sensorOffsetX = 150;
            sensorOffsetY = 0;
        }
        
        const robotAngle = this.robot.angle;
        const cos = Math.cos(robotAngle * Math.PI / 180);
        const sin = Math.sin(robotAngle * Math.PI / 180);
        
        // センサーの実際の位置（ロボットの向きを考慮）
        const sensorX = this.robot.x + sensorOffsetX * cos - sensorOffsetY * sin;
        const sensorY = this.robot.y + sensorOffsetX * sin + sensorOffsetY * cos;
        
        const sensorAngle = robotAngle + this.servoAngle;
        const dx = Math.cos(sensorAngle * Math.PI / 180);
        const dy = Math.sin(sensorAngle * Math.PI / 180);
        
        // 最大距離まで10mm刻みで検索（上限を設定してタイムアウトを防ぐ）
        const maxSteps = Math.min(400, (this.maxDistance - this.minDistance) / 10);
        
        for (let step = 0; step < maxSteps; step++) {
            const distance = this.minDistance + step * 10;
            const checkX = sensorX + dx * distance;
            const checkY = sensorY + dy * distance;
            
            // フィールド外に出た場合は最大距離を返す
            if (checkX < 0 || checkX >= this.field.width || 
                checkY < 0 || checkY >= this.field.height) {
                const error = (Math.random() - 0.5) * this.distanceError * 2;
                return Math.max(this.minDistance, this.maxDistance + error);
            }
            
            // ターゲット衝突判定
            for (const target of this.field.targets) {
                const targetDist = Math.sqrt(
                    Math.pow(checkX - target.x, 2) + 
                    Math.pow(checkY - target.y, 2)
                );
                if (targetDist <= target.radius) {
                    const error = (Math.random() - 0.5) * this.distanceError * 2;
                    return Math.max(this.minDistance, distance + error);
                }
            }
        }
        
        // 最大距離まで到達（何も検出されない）
        const error = (Math.random() - 0.5) * this.distanceError * 2;
        return Math.max(this.minDistance, this.maxDistance + error);
    }
    
    getR_Photo() {
        if (!this.robot || !this.field) {
            return false;
        }
        
        const sensorX = this.robot.x + this.photoBaseX * Math.cos(this.robot.angle * Math.PI / 180);
        const sensorY = this.robot.y + this.photoBaseX * Math.sin(this.robot.angle * Math.PI / 180);
        
        const rightSensorX = sensorX + (this.photoSpacing/2) * Math.cos((this.robot.angle + 90) * Math.PI / 180);
        const rightSensorY = sensorY + (this.photoSpacing/2) * Math.sin((this.robot.angle + 90) * Math.PI / 180);
        
        if (rightSensorX < this.field.borderLineWidth || 
            rightSensorX >= this.field.width - this.field.borderLineWidth || 
            rightSensorY < this.field.borderLineWidth || 
            rightSensorY >= this.field.height - this.field.borderLineWidth) {
            return true;
        }
        
        for (const target of this.field.targets) {
            const dist = Math.sqrt(
                Math.pow(rightSensorX - target.x, 2) + 
                Math.pow(rightSensorY - target.y, 2)
            );
            const innerRadius = target.radius;
            const outerRadius = target.radius + target.blackRingWidth;
            if (dist >= innerRadius && dist <= outerRadius) {
                return true;
            }
        }
        
        return false;
    }
    
    getL_Photo() {
        if (!this.robot || !this.field) {
            return false;
        }
        
        const sensorX = this.robot.x + this.photoBaseX * Math.cos(this.robot.angle * Math.PI / 180);
        const sensorY = this.robot.y + this.photoBaseX * Math.sin(this.robot.angle * Math.PI / 180);
        
        const leftSensorX = sensorX - (this.photoSpacing/2) * Math.cos((this.robot.angle + 90) * Math.PI / 180);
        const leftSensorY = sensorY - (this.photoSpacing/2) * Math.sin((this.robot.angle + 90) * Math.PI / 180);
        
        if (leftSensorX < this.field.borderLineWidth || 
            leftSensorX >= this.field.width - this.field.borderLineWidth || 
            leftSensorY < this.field.borderLineWidth || 
            leftSensorY >= this.field.height - this.field.borderLineWidth) {
            return true;
        }
        
        for (const target of this.field.targets) {
            const dist = Math.sqrt(
                Math.pow(leftSensorX - target.x, 2) + 
                Math.pow(leftSensorY - target.y, 2)
            );
            const innerRadius = target.radius;
            const outerRadius = target.radius + target.blackRingWidth;
            if (dist >= innerRadius && dist <= outerRadius) {
                return true;
            }
        }
        
        return false;
    }
}

// グローバルスコープに公開
window.RobotSensors = RobotSensors;

// export { RobotSensors as Sensors };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RobotSensors;
}