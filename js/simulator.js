// import * as CONST from './constants.js';
// import { Field } from './field.js';
// import { Robot } from './robot.js';
// import { ConfigLoader } from './config_loader.js';
// import { ExplorationPrograms } from './exploration_programs.js';

class Simulator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.config = null;
        this.field = new Field();
        this.robot = null;
        
        this.isRunning = false;
        this.animationId = null;
        this.lastTime = 0;
        this.speed = 5; // 後で設定ファイルから読み込む
        this.currentProgram = 'wall_following';
        
        // DOM要素をプロパティとして保存
        this.domElements = {};
        
        // 初期化はmain.jsから明示的に呼び出される
    }
    
    async initializeAsync() {
        // 設定ファイルを読み込み
        this.config = await robotConfig.loadConfig();
        
        // ロボット初期化
        this.robot = new Robot(this.config);
        this.robot.setField(this.field);
        
        // シミュレーション設定を適用
        this.speed = this.config.simulation?.default_speed_multiplier || 5;
        
        // UI初期化
        this.initializeUI();
        this.render();
        
        console.log('Simulator initialized with config:', this.config.name);
        console.log('Robot position:', this.robot.x, this.robot.y, this.robot.angle);
        console.log('Robot dimensions:', this.robot.width, this.robot.height);
        console.log('Simulation settings:', this.config.simulation);
        console.log('Appearance settings:', this.config.appearance);
        console.log('Performance settings:', this.config.performance);
    }
    
    initializeUI() {
        // DOM要素を一度だけ取得して保存
        this.cacheUIElements();
        
        const { startBtn, stopBtn, resetBtn, speedSlider, speedValue, programSelect } = this.domElements;
        
        startBtn.addEventListener('click', () => this.start());
        stopBtn.addEventListener('click', () => this.stop());
        resetBtn.addEventListener('click', () => this.reset());
        
        // 速度スライダーの初期値を設定ファイルから設定
        speedSlider.value = this.speed;
        speedValue.textContent = `${this.speed}x`;
        
        speedSlider.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            speedValue.textContent = `${this.speed}x`;
        });
        
        programSelect.addEventListener('change', (e) => {
            this.currentProgram = e.target.value;
            this.setExplorationProgram();
            this.log(`Exploration program changed to: ${ExplorationPrograms.programs[this.currentProgram]}`);
            
            // 手動操作モードの場合、リモコンを表示
            this.toggleRemoteControl(this.currentProgram === 'manual_control');
        });
        
        this.setExplorationProgram();
        this.updateUI();
        this.initializeRemoteControl();
        this.updateButtonStates();
    }
    
    cacheUIElements() {
        // 基本UI要素
        this.domElements.startBtn = document.getElementById('startBtn');
        this.domElements.stopBtn = document.getElementById('stopBtn');
        this.domElements.resetBtn = document.getElementById('resetBtn');
        this.domElements.speedSlider = document.getElementById('speedSlider');
        this.domElements.speedValue = document.getElementById('speedValue');
        this.domElements.programSelect = document.getElementById('programSelect');
        this.domElements.simulationStatus = document.getElementById('simulationStatus');
        this.domElements.remoteControl = document.getElementById('remoteControl');
        
        // リモコン要素
        this.domElements.leftMotorSlider = document.getElementById('leftMotorSlider');
        this.domElements.rightMotorSlider = document.getElementById('rightMotorSlider');
        this.domElements.leftMotorValue = document.getElementById('leftMotorValue');
        this.domElements.rightMotorValue = document.getElementById('rightMotorValue');
        this.domElements.servoSlider = document.getElementById('servoSlider');
        this.domElements.servoAngleValue = document.getElementById('servoAngleValue');
        
        // 方向ボタン
        this.domElements.forwardBtn = document.getElementById('forwardBtn');
        this.domElements.backwardBtn = document.getElementById('backwardBtn');
        this.domElements.leftBtn = document.getElementById('leftBtn');
        this.domElements.rightBtn = document.getElementById('rightBtn');
        this.domElements.remoteStopBtn = document.getElementById('remoteStopBtn');
        
        // サーボボタン
        this.domElements.servoLeftBtn = document.getElementById('servoLeftBtn');
        this.domElements.servoCenterBtn = document.getElementById('servoCenterBtn');
        this.domElements.servoRightBtn = document.getElementById('servoRightBtn');
        
        // 情報表示要素
        this.domElements.score = document.getElementById('score');
        this.domElements.targetsFound = document.getElementById('targetsFound');
        this.domElements.time = document.getElementById('time');
        this.domElements.robotPos = document.getElementById('robotPos');
        this.domElements.distanceValue = document.getElementById('distanceValue');
        this.domElements.leftPhotoValue = document.getElementById('leftPhotoValue');
        this.domElements.rightPhotoValue = document.getElementById('rightPhotoValue');
        this.domElements.servoAngleValueDisplay = document.getElementById('servoAngleValue');
    }
    
    toggleRemoteControl(show) {
        this.domElements.remoteControl.style.display = show ? 'block' : 'none';
    }
    
    initializeRemoteControl() {
        this.initializeMotorControls();
        this.initializeServoControls();
    }
    
    initializeMotorControls() {
        // モータースライダーの初期化
        const { leftMotorSlider, rightMotorSlider, leftMotorValue, rightMotorValue } = this.domElements;
        
        leftMotorSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            leftMotorValue.textContent = value;
            this.updateManualControl();
        });
        
        rightMotorSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            rightMotorValue.textContent = value;
            this.updateManualControl();
        });
        
        this.initializeDirectionButtons();
    }
    
    initializeDirectionButtons() {
        // 方向ボタンの初期化
        const { forwardBtn, backwardBtn, leftBtn, rightBtn, remoteStopBtn } = this.domElements;
        const { leftMotorSlider, rightMotorSlider, leftMotorValue, rightMotorValue } = this.domElements;
        
        forwardBtn.addEventListener('click', () => {
            this.setMotorValues(CONST.UI.MANUAL_CONTROL_SPEEDS.FORWARD, CONST.UI.MANUAL_CONTROL_SPEEDS.FORWARD);
        });
        
        backwardBtn.addEventListener('click', () => {
            this.setMotorValues(CONST.UI.MANUAL_CONTROL_SPEEDS.REVERSE, CONST.UI.MANUAL_CONTROL_SPEEDS.REVERSE);
        });
        
        leftBtn.addEventListener('click', () => {
            this.setMotorValues(CONST.UI.MANUAL_CONTROL_SPEEDS.TURN_LEFT, CONST.UI.MANUAL_CONTROL_SPEEDS.TURN_OPPOSITE);
        });
        
        rightBtn.addEventListener('click', () => {
            this.setMotorValues(CONST.UI.MANUAL_CONTROL_SPEEDS.TURN_OPPOSITE, CONST.UI.MANUAL_CONTROL_SPEEDS.TURN_LEFT);
        });
        
        remoteStopBtn.addEventListener('click', () => {
            this.setMotorValues(CONST.ROBOT_CONTROL.STOP_SPEED, CONST.ROBOT_CONTROL.STOP_SPEED);
        });
    }
    
    setMotorValues(leftSpeed, rightSpeed) {
        const { leftMotorSlider, rightMotorSlider, leftMotorValue, rightMotorValue } = this.domElements;
        
        leftMotorSlider.value = leftSpeed;
        rightMotorSlider.value = rightSpeed;
        leftMotorValue.textContent = leftSpeed.toString();
        rightMotorValue.textContent = rightSpeed.toString();
        this.updateManualControl();
    }
    
    initializeServoControls() {
        // サーボ制御の初期化
        const { servoSlider, servoAngleValue, servoLeftBtn, servoCenterBtn, servoRightBtn } = this.domElements;
        
        servoSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            servoAngleValue.textContent = value;
            this.updateManualServo();
        });
        
        servoLeftBtn.addEventListener('click', () => {
            this.setServoValue(CONST.UI.SERVO_PRESET_ANGLES.LEFT);
        });
        
        servoCenterBtn.addEventListener('click', () => {
            this.setServoValue(CONST.UI.SERVO_PRESET_ANGLES.CENTER);
        });
        
        servoRightBtn.addEventListener('click', () => {
            this.setServoValue(CONST.UI.SERVO_PRESET_ANGLES.RIGHT);
        });
    }
    
    setServoValue(angle) {
        const { servoSlider, servoAngleValue } = this.domElements;
        
        servoSlider.value = angle;
        servoAngleValue.textContent = angle.toString();
        this.updateManualServo();
    }
    
    updateManualControl() {
        if (this.currentProgram === 'manual_control' && this.robot.explorationProgram) {
            const leftSpeed = parseInt(this.domElements.leftMotorSlider.value);
            const rightSpeed = parseInt(this.domElements.rightMotorSlider.value);
            this.robot.explorationProgram.setMotorSpeeds(leftSpeed, rightSpeed);
        }
    }
    
    updateManualServo() {
        if (this.currentProgram === 'manual_control' && this.robot.explorationProgram) {
            const angle = parseInt(this.domElements.servoSlider.value);
            this.robot.explorationProgram.setServoAngle(angle);
        }
    }
    
    
    setExplorationProgram() {
        const program = ExplorationPrograms.getProgram(this.currentProgram);
        this.robot.setExplorationProgram(program);
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.animate();
            this.log('Simulation started');
            this.updateButtonStates();
        }
    }
    
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this.log('Simulation stopped');
            this.updateButtonStates();
        }
    }
    
    reset() {
        this.stop();
        this.field.reset();
        this.robot.reset();
        this.setExplorationProgram();
        this.updateUI();
        this.render();
        this.log('Simulation reset');
        this.updateButtonStates();
    }
    
    animate(currentTime = 0) {
        if (!this.isRunning) return;
        
        const deltaTime = (currentTime - this.lastTime) * this.speed;
        this.lastTime = currentTime;
        
        const safetyResult = this.robot.update(deltaTime);
        
        if (safetyResult) {
            this.handleGameOver(safetyResult);
            return;
        }
        
        if (!this.field.isGameOver()) {
            this.robot.executeExploration();
        }
        
        this.render();
        this.updateUI();
        
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }
    
    updateButtonStates() {
        const { startBtn, stopBtn, resetBtn, simulationStatus } = this.domElements;
        
        if (this.isRunning) {
            // 実行中状態
            startBtn.disabled = true;
            startBtn.classList.remove('btn-active');
            stopBtn.disabled = false;
            stopBtn.classList.add('btn-active');
            resetBtn.disabled = false;
            resetBtn.classList.remove('btn-active');
            
            simulationStatus.textContent = '▶ Running';
            simulationStatus.className = 'simulation-status status-running';
        } else {
            // 停止中状態
            startBtn.disabled = false;
            startBtn.classList.remove('btn-active');
            stopBtn.disabled = true;
            stopBtn.classList.remove('btn-active');
            resetBtn.disabled = false;
            resetBtn.classList.remove('btn-active');
            
            simulationStatus.textContent = '⏹ Stopped';
            simulationStatus.className = 'simulation-status status-stopped';
        }
    }
    
    handleGameOver(safetyResult) {
        this.stop();
        const reason = safetyResult.type === 'collision' ? '壁に衝突しました！' : 'フィールドから落下しました！';
        this.log(`GAME OVER: ${reason}`);
        this.log(`Final Score: ${this.field.getScore()}, Targets Found: ${this.field.getDiscoveredCount()}/${this.field.getTotalTargets()}`);
        
        // ゲームオーバー状態を表示
        this.domElements.simulationStatus.textContent = '💥 Game Over';
        this.domElements.simulationStatus.className = 'simulation-status status-paused';
        
        // ターゲット追跡アルゴリズムの場合、最接近距離を表示
        if (this.currentProgram === 'target_seeking' && this.robot.explorationProgram) {
            const closestDistance = this.robot.explorationProgram.getClosestTargetDistance();
            if (closestDistance !== Infinity) {
                this.log(`Closest Target Distance: ${closestDistance.toFixed(1)}mm`);
                console.log(`GAME OVER - Closest Target Distance: ${closestDistance.toFixed(1)}mm`);
            } else {
                this.log(`Closest Target Distance: No targets detected`);
                console.log(`GAME OVER - No targets were detected during the run`);
            }
        }
        
        // ゲームオーバー表示
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText(reason, this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText(`Score: ${this.field.getScore()}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        this.ctx.fillText('RESET to try again', this.canvas.width / 2, this.canvas.height / 2 + 80);
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawField();
        this.drawTargets();
        this.drawRobotTrail();
        this.drawRobot();
        this.drawSensorBeam();
    }
    
    drawField() {
        // 全体背景
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.field.width, this.field.height);
        
        // フィールド有効エリア（白）
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(
            this.field.borderLineWidth, 
            this.field.borderLineWidth, 
            this.field.fieldWidth, 
            this.field.fieldHeight
        );
        
        // 黒いライン（外周）
        this.ctx.fillStyle = '#000';
        // 上の黒ライン
        this.ctx.fillRect(0, 0, this.field.width, this.field.borderLineWidth);
        // 下の黒ライン
        this.ctx.fillRect(0, this.field.height - this.field.borderLineWidth, this.field.width, this.field.borderLineWidth);
        // 左の黒ライン
        this.ctx.fillRect(0, 0, this.field.borderLineWidth, this.field.height);
        // 右の黒ライン
        this.ctx.fillRect(this.field.width - this.field.borderLineWidth, 0, this.field.borderLineWidth, this.field.height);
    }
    
    drawTargets() {
        for (const target of this.field.targets) {
            this.ctx.fillStyle = target.discovered ? '#4CAF50' : '#FF5722';
            this.ctx.beginPath();
            this.ctx.arc(target.x, target.y, target.radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = target.blackRingWidth;
            this.ctx.beginPath();
            this.ctx.arc(target.x, target.y, target.radius + target.blackRingWidth / 2, 0, 2 * Math.PI);
            this.ctx.stroke();
            
            this.ctx.fillStyle = '#000';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(target.id.toString(), target.x, target.y + 4);
        }
    }
    
    drawRobotTrail() {
        if (!this.config?.appearance?.show_trail || this.robot.trail.length < 2) return;
        
        this.ctx.strokeStyle = this.config?.appearance?.trail_color || 'rgba(0, 100, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i < this.robot.trail.length; i++) {
            const point = this.robot.trail[i];
            if (i === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        }
        
        this.ctx.stroke();
    }
    
    drawRobot() {
        this.ctx.save();
        this.ctx.translate(this.robot.x, this.robot.y);
        this.ctx.rotate(this.robot.angle * Math.PI / 180);
        
        this.ctx.fillStyle = this.config?.appearance?.body_color || '#2196F3';
        this.ctx.fillRect(-this.robot.width/2, -this.robot.height/2, this.robot.width, this.robot.height);
        
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-this.robot.width/2, -this.robot.height/2, this.robot.width, this.robot.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.moveTo(this.robot.width/2, 0);
        this.ctx.lineTo(this.robot.width/2 - 50, -20);
        this.ctx.lineTo(this.robot.width/2 - 50, 20);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // フォトセンサーの描画（設定に基づく）
        if (this.config?.appearance?.show_sensor_positions !== false) {
            this.ctx.fillStyle = this.config?.appearance?.sensor_color || '#FF5722';
            const photoBaseX = this.robot.sensors?.photoBaseX || 250;
            const photoSpacing = this.robot.sensors?.photoSpacing || 200;
            
            this.ctx.beginPath();
            this.ctx.arc(photoBaseX, -(photoSpacing/2), 8, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(photoBaseX, (photoSpacing/2), 8, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        // 当たり判定エリアの描画
        if (this.config?.appearance?.show_debug_info !== false) {
            this.drawCollisionArea();
        }
        
        this.ctx.restore();
    }
    
    drawCollisionArea() {
        // 当たり判定用四角形を描画
        this.ctx.save();
        
        // 当たり判定四角形の輪郭を描画
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // 赤色
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            -this.robot.wheelTrack.width/2, 
            -this.robot.wheelTrack.length/2, 
            this.robot.wheelTrack.width, 
            this.robot.wheelTrack.length
        );
        
        // 当たり判定四角形の内部を半透明で塗りつぶし
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        this.ctx.fillRect(
            -this.robot.wheelTrack.width/2, 
            -this.robot.wheelTrack.length/2, 
            this.robot.wheelTrack.width, 
            this.robot.wheelTrack.length
        );
        
        // 4つの角に小さな点を描画
        const corners = [
            { x: -this.robot.wheelTrack.width/2, y: -this.robot.wheelTrack.length/2 },
            { x: this.robot.wheelTrack.width/2, y: -this.robot.wheelTrack.length/2 },
            { x: this.robot.wheelTrack.width/2, y: this.robot.wheelTrack.length/2 },
            { x: -this.robot.wheelTrack.width/2, y: this.robot.wheelTrack.length/2 }
        ];
        
        this.ctx.fillStyle = '#ff0000';
        corners.forEach(corner => {
            this.ctx.beginPath();
            this.ctx.arc(corner.x, corner.y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }
    
    drawSensorBeam() {
        if (!this.config?.appearance?.show_sensor_beam) return;
        
        // 距離センサーの実際の位置を計算
        const distConfig = this.config.sensors?.distance_sensor || {};
        const sensorOffsetX = distConfig.position?.x || 150;
        const sensorOffsetY = distConfig.position?.y || 0;
        
        const robotAngle = this.robot.angle;
        const cos = Math.cos(robotAngle * Math.PI / 180);
        const sin = Math.sin(robotAngle * Math.PI / 180);
        
        const startX = this.robot.x + sensorOffsetX * cos - sensorOffsetY * sin;
        const startY = this.robot.y + sensorOffsetX * sin + sensorOffsetY * cos;
        
        const sensorAngle = this.robot.angle + this.robot.sensors.servoAngle;
        const distance = this.robot.getDistance();
        const endX = startX + (distance * Math.cos(sensorAngle * Math.PI / 180));
        const endY = startY + (distance * Math.sin(sensorAngle * Math.PI / 180));
        
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    updateUI() {
        const { score, targetsFound, time, robotPos, distanceValue, 
                leftPhotoValue, rightPhotoValue, servoAngleValueDisplay } = this.domElements;
                
        score.textContent = this.field.getScore();
        targetsFound.textContent = `${this.field.getDiscoveredCount()}/${this.field.getTotalTargets()}`;
        
        const elapsedTime = Math.floor((Date.now() - this.robot.startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        time.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        robotPos.textContent = `${Math.round(this.robot.x)}, ${Math.round(this.robot.y)}`;
        
        distanceValue.textContent = `${Math.round(this.robot.getDistance() / 10)}cm`;
        
        leftPhotoValue.textContent = this.robot.getL_Photo() ? 'ON' : 'OFF';
        leftPhotoValue.style.color = this.robot.getL_Photo() ? '#4CAF50' : '#666';
        
        rightPhotoValue.textContent = this.robot.getR_Photo() ? 'ON' : 'OFF';
        rightPhotoValue.style.color = this.robot.getR_Photo() ? '#4CAF50' : '#666';
        
        servoAngleValueDisplay.textContent = `${this.robot.sensors.servoAngle}°`;
    }
    
    log(message) {
        const console = document.getElementById('console');
        const timestamp = new Date().toLocaleTimeString();
        console.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        console.scrollTop = console.scrollHeight;
    }
}

// グローバルスコープに公開
window.Simulator = Simulator;

// export { Simulator };

// 初期化はmain.jsで制御される