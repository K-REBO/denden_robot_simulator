class ConfigLoader {
    constructor() {
        this.config = null;
        this.defaultConfig = this.getDefaultConfig();
    }
    
    // デフォルト設定
    getDefaultConfig() {
        return {
            name: "Denden Robot",
            version: "1.0",
            dimensions: {
                width: 300,
                height: 300,
                length: 300,
                wheelbase: 200
            },
            initial_position: {
                x: 850,
                y: 450,
                angle: 0
            },
            performance: {
                max_speed: 200,
                max_rotation_speed: 90,
                acceleration: 100,
                deceleration: 150
            },
            sensors: {
                distance_sensor: {
                    min_range: 20,
                    max_range: 4000,
                    position: { x: 150, y: 0, z: 0 },
                    servo_range: { min: -90, max: 90 },
                    accuracy: 5,
                    scan_speed: 180
                },
                photo_sensors: {
                    count: 2,
                    position: { base_x: 250, base_y: 0, spacing: 200 },
                    detection_range: 10,
                    response_time: 10,
                    threshold: 0.5
                }
            },
            control: {
                response_time: 50,
                command_buffer: 10,
                emergency_stop: true,
                safety_margin: 50,
                update_frequency: 60
            },
            errors: {
                motor_speed_variance: 0.05,
                distance_sensor_error: 5,
                angle_error: 2,
                position_drift: 1,
                sensor_noise: 0.02
            },
            appearance: {
                body_color: "#2196F3",
                sensor_color: "#FF5722",
                trail_color: "rgba(0, 100, 255, 0.3)",
                show_trail: true,
                show_sensor_beam: true,
                show_sensor_positions: true,
                show_debug_info: false
            },
            simulation: {
                time_step: 16,
                trail_length: 1000,
                default_speed_multiplier: 5,
                physics_enabled: true,
                collision_detection: true
            },
            debug: {
                log_level: "INFO",
                log_sensors: false,
                log_movement: false,
                log_collisions: true,
                performance_monitor: false
            }
        };
    }
    
    // 簡易YAML解析（基本的なYAML構造のみサポート）
    parseYAML(yamlText) {
        const lines = yamlText.split('\n');
        const result = {};
        const stack = [result];
        let currentIndent = 0;
        
        for (let line of lines) {
            // コメント行をスキップ
            if (line.trim().startsWith('#') || line.trim() === '') {
                continue;
            }
            
            const indent = line.length - line.trimLeft().length;
            const trimmedLine = line.trim();
            
            // インデントレベルの変化を処理
            while (stack.length > 1 && indent <= currentIndent) {
                stack.pop();
                currentIndent -= 2;
            }
            
            if (trimmedLine.includes(':')) {
                const colonIndex = trimmedLine.indexOf(':');
                const key = trimmedLine.substring(0, colonIndex).trim();
                let value = trimmedLine.substring(colonIndex + 1).trim();
                
                // コメントを除去（#以降を削除）
                const commentIndex = value.indexOf('#');
                if (commentIndex !== -1) {
                    value = value.substring(0, commentIndex).trim();
                }
                
                const current = stack[stack.length - 1];
                
                if (value === '' || value === null) {
                    // ネストされたオブジェクト
                    current[key] = {};
                    stack.push(current[key]);
                    currentIndent = indent;
                } else {
                    // 値の型変換
                    current[key] = this.convertValue(value);
                }
            }
        }
        
        return result;
    }
    
    // 値の型変換
    convertValue(value) {
        // 文字列の前後の引用符を除去
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        
        // 数値変換
        if (!isNaN(value) && !isNaN(parseFloat(value))) {
            return parseFloat(value);
        }
        
        // ブール値変換
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        
        return value;
    }
    
    // 設定ファイルを読み込み
    async loadConfig(filename = 'robot.yaml') {
        try {
            // キャッシュバスティングのためタイムスタンプを追加
            const cacheBuster = `${filename}?t=${Date.now()}`;
            const response = await fetch(cacheBuster);
            if (!response.ok) {
                console.warn(`Could not load ${filename}, using default config`);
                this.config = this.defaultConfig;
                return this.config;
            }
            
            const yamlText = await response.text();
            this.config = this.parseYAML(yamlText);
            
            // デフォルト値でマージ
            this.config = this.mergeWithDefaults(this.config, this.defaultConfig);
            
            return this.config;
            
        } catch (error) {
            console.error('Error loading config:', error);
            this.config = this.defaultConfig;
            return this.config;
        }
    }
    
    // デフォルト値とマージ
    mergeWithDefaults(config, defaults) {
        const result = { ...defaults };
        
        for (const key in config) {
            if (typeof config[key] === 'object' && config[key] !== null && !Array.isArray(config[key])) {
                result[key] = this.mergeWithDefaults(config[key], defaults[key] || {});
            } else {
                result[key] = config[key];
            }
        }
        
        return result;
    }
    
    // 設定値を取得
    get(path) {
        if (!this.config) {
            return this.getFromPath(this.defaultConfig, path);
        }
        return this.getFromPath(this.config, path);
    }
    
    // パスから値を取得（例: 'sensors.distance_sensor.max_range'）
    getFromPath(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
    
    // 設定が読み込まれているかチェック
    isLoaded() {
        return this.config !== null;
    }
    
    // 全設定を取得
    getAll() {
        return this.config || this.defaultConfig;
    }
}

// グローバルインスタンス
const robotConfig = new ConfigLoader();

// グローバルスコープに公開
window.ConfigLoader = ConfigLoader;
window.robotConfig = robotConfig;

// export { ConfigLoader, robotConfig };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigLoader;
}