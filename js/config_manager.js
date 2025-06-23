// ConfigManager - 設定値計算の一元管理
// 各クラスに分散していた設定値の計算とデフォルト値管理を統合

class ConfigManager {
    constructor(config = null) {
        this.rawConfig = config || {};
        this.processedConfig = this.processConfiguration();
    }
    
    // 設定値を処理して計算済みの値を返す
    processConfiguration() {
        return {
            robot: this.processRobotConfig(),
            sensors: this.processSensorConfig(),
            simulation: this.processSimulationConfig()
        };
    }
    
    // ロボット関連の設定値を計算
    processRobotConfig() {
        // rawConfigから直接取得（robot.yamlの構造に合わせる）
        const config = this.rawConfig;
        
        return {
            // 初期位置（引数で上書き可能）
            initialPosition: {
                x: config.initial_position?.x || 850,
                y: config.initial_position?.y || 450,
                angle: config.initial_position?.angle || 0
            },
            
            // 性能パラメータ
            performance: {
                maxSpeed: config.performance?.max_speed || 200,
                maxRotationSpeed: config.performance?.max_rotation_speed || 90,
                acceleration: config.performance?.acceleration || 100,
                deceleration: config.performance?.deceleration || 150
            },
            
            // 物理的寸法
            dimensions: {
                width: config.dimensions?.width || 300,
                height: config.dimensions?.height || 300,
                length: config.dimensions?.length || 300,
                wheelbase: config.dimensions?.wheelbase || 200,
                // 車輪位置による落下判定
                wheelTrack: {
                    width: config.dimensions?.wheel_track?.width || 150,
                    length: config.dimensions?.wheel_track?.length || 150
                }
            },
            
            // エラー設定
            errors: {
                motorNoise: config.errors?.motor_noise || 0.02,
                positionDrift: config.errors?.position_drift || 0.01
            }
        };
    }
    
    // センサー関連の設定値を計算
    processSensorConfig() {
        const sensorsConfig = this.rawConfig.sensors || {};
        
        return {
            distance: this.processDistanceSensorConfig(sensorsConfig.distance_sensor || {}),
            photo: this.processPhotoSensorConfig(sensorsConfig.photo_sensors || {}),
            noise: {
                sensorNoise: this.rawConfig.errors?.sensor_noise || 0.02
            }
        };
    }
    
    // 距離センサー設定を処理
    processDistanceSensorConfig(distConfig) {
        return {
            minDistance: distConfig.min_range || 20,
            maxDistance: distConfig.max_range || 4000,
            accuracy: distConfig.accuracy || 5,
            servoRange: {
                min: distConfig.servo_range?.min || -90,
                max: distConfig.servo_range?.max || 90
            },
            scanSpeed: distConfig.scan_speed || 180,
            position: {
                x: distConfig.position?.x || 150,
                y: distConfig.position?.y || 0,
                angle: distConfig.position?.angle || 0
            }
        };
    }
    
    // フォトセンサー設定を処理
    processPhotoSensorConfig(photoConfig) {
        const baseX = photoConfig.position?.base_x || 250;
        const baseY = photoConfig.position?.base_y || 0;
        const spacing = photoConfig.position?.spacing || 200;
        
        // フォトセンサーの位置を計算
        const positions = this.calculatePhotoSensorPositions(baseX, baseY, spacing);
        
        return {
            count: photoConfig.count || 2,
            basePosition: {
                x: baseX,
                y: baseY
            },
            spacing: spacing,
            positions: positions,
            detectionRange: photoConfig.detection_range || 10,
            responseTime: photoConfig.response_time || 10,
            threshold: photoConfig.threshold || 0.5
        };
    }
    
    // フォトセンサーの具体的な位置を計算
    calculatePhotoSensorPositions(baseX, baseY, spacing) {
        const positions = [];
        const count = 2; // 左右2つのセンサー
        
        for (let i = 0; i < count; i++) {
            const offsetX = (i - (count - 1) / 2) * spacing;
            positions.push({
                x: baseX + offsetX,
                y: baseY,
                id: i === 0 ? 'left' : 'right'
            });
        }
        
        return positions;
    }
    
    // シミュレーション設定を処理
    processSimulationConfig() {
        const simConfig = this.rawConfig.simulation || {};
        
        return {
            timeStep: simConfig.time_step || 16, // 60FPS
            trailLength: simConfig.trail_length || 1000,
            enableCollision: simConfig.enable_collision !== false, // デフォルトtrue
            enableBoundaryCheck: simConfig.enable_boundary_check !== false // デフォルトtrue
        };
    }
    
    // 処理済み設定値を取得
    getProcessedConfig() {
        return this.processedConfig;
    }
    
    // 特定のセクションの設定値を取得
    getRobotConfig() {
        return this.processedConfig.robot;
    }
    
    getSensorConfig() {
        return this.processedConfig.sensors;
    }
    
    getSimulationConfig() {
        return this.processedConfig.simulation;
    }
    
    // 元の設定を更新して再計算
    updateConfig(newConfig) {
        this.rawConfig = newConfig;
        this.processedConfig = this.processConfiguration();
    }
    
    // 設定値のマージ（部分更新）
    mergeConfig(partialConfig) {
        this.rawConfig = this.deepMerge(this.rawConfig, partialConfig);
        this.processedConfig = this.processConfiguration();
    }
    
    // オブジェクトの深いマージ
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
}

// グローバルスコープに公開
window.ConfigManager = ConfigManager;

// レガシーサポート用（CommonJS形式でもアクセス可能）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
}