// 定数をインポート
// import * as CONST from './constants.js';

class Field {
    constructor() {
        this.fieldWidth = CONST.FIELD.WIDTH;
        this.fieldHeight = CONST.FIELD.HEIGHT;
        this.borderLineWidth = CONST.FIELD.BORDER_WIDTH;
        this.width = this.fieldWidth + 2 * this.borderLineWidth;
        this.height = this.fieldHeight + 2 * this.borderLineWidth;
        this.targets = [];
        this.visitedTargets = new Set();
        this.score = 0;
        this.lastVisitedTarget = null;
        this.gameOver = false;
        this.gameOverReason = null;
        
        this.initializeTargets();
    }
    
    initializeTargets() {
        const targetRadius = CONST.FIELD.TARGET_RADIUS;
        const blackRingWidth = CONST.FIELD.TARGET_BLACK_RING_WIDTH;
        const targetSpacing = CONST.FIELD.TARGET_SPACING;
        
        const positions = [];
        
        // フィールド境界線の座標
        const fieldLeft = this.borderLineWidth;
        const fieldRight = this.borderLineWidth + this.fieldWidth;
        const fieldTop = this.borderLineWidth;
        const fieldBottom = this.borderLineWidth + this.fieldHeight;
        
        // 長辺（X軸）に5個の位置を計算
        const xPositions = [];
        for (let i = 0; i < 5; i++) {
            xPositions.push(fieldLeft + (this.fieldWidth * i / 4));
        }
        
        // 短辺（Y軸）に3個の位置を計算  
        const yPositions = [];
        for (let i = 0; i < 3; i++) {
            yPositions.push(fieldTop + (this.fieldHeight * i / 2));
        }
        
        // 長辺に沿ってターゲット配置（上下の境界線上）
        for (const x of xPositions) {
            positions.push([x, fieldTop]);     // 上辺
            positions.push([x, fieldBottom]);  // 下辺
        }
        
        // 短辺に沿ってターゲット配置（左右の境界線上）
        for (const y of yPositions) {
            positions.push([fieldLeft, y]);   // 左辺
            positions.push([fieldRight, y]);  // 右辺
        }
        
        // 重複除去（四隅が重複）
        const uniquePositions = [];
        const positionSet = new Set();
        
        for (const pos of positions) {
            const key = `${Math.round(pos[0])},${Math.round(pos[1])}`;
            if (!positionSet.has(key)) {
                positionSet.add(key);
                uniquePositions.push([Math.round(pos[0]), Math.round(pos[1])]);
            }
        }
        
        for (let i = 0; i < uniquePositions.length; i++) {
            this.targets.push({
                id: i,
                x: uniquePositions[i][0],
                y: uniquePositions[i][1],
                radius: targetRadius,
                blackRingWidth: blackRingWidth,
                discovered: false
            });
        }
    }
    
    checkTargetReached(robotX, robotY, leftPhotoSensor, rightPhotoSensor, distanceSensor) {
        const isOnBlackLine = leftPhotoSensor || rightPhotoSensor;
        const isCloseToTarget = distanceSensor <= 130; // 13cm
        
        if (isOnBlackLine && isCloseToTarget) {
            // フォトセンサーで黒リング検知 AND 距離センサー≤13cmの条件を満たした場合
            // 最も近いターゲットを特定してスコア加算
            let nearestTarget = null;
            let nearestDistance = Infinity;
            
            for (const target of this.targets) {
                const distance = Math.sqrt(
                    Math.pow(robotX - target.x, 2) + 
                    Math.pow(robotY - target.y, 2)
                );
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestTarget = target;
                }
            }
            
            if (nearestTarget) {
                this.handleTargetVisit(nearestTarget);
                return nearestTarget;
            }
        }
        
        return null;
    }
    
    handleTargetVisit(target) {
        if (this.lastVisitedTarget && this.lastVisitedTarget.id === target.id) {
            return;
        }
        
        if (!target.discovered) {
            target.discovered = true;
            this.visitedTargets.add(target.id);
            this.score += 10;
            console.log(`New target discovered! Target ${target.id}, Score: +10, Total: ${this.score}`);
        } else {
            this.score += 2;
            console.log(`Target revisited! Target ${target.id}, Score: +2, Total: ${this.score}`);
        }
        
        this.lastVisitedTarget = target;
    }
    
    getScore() {
        return this.score;
    }
    
    getDiscoveredCount() {
        return this.visitedTargets.size;
    }
    
    getTotalTargets() {
        return this.targets.length;
    }
    
    isAllTargetsDiscovered() {
        return this.visitedTargets.size === this.targets.length;
    }
    
    // ロボット表示用四角形の4角を計算するヘルパーメソッド
    getRobotDisplayCorners(robot, width, height) {
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // 基本四角形の4角（ロボット中心基準）
        const corners = [
            { x: -halfWidth, y: -halfHeight },  // 左上
            { x: halfWidth, y: -halfHeight },   // 右上
            { x: halfWidth, y: halfHeight },    // 右下
            { x: -halfWidth, y: halfHeight }    // 左下
        ];
        
        // 回転と移動変換を適用
        const angleRad = robot.angle * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        return corners.map(corner => ({
            x: robot.x + corner.x * cos - corner.y * sin,
            y: robot.y + corner.x * sin + corner.y * cos
        }));
    }
    
    checkCollision(robot) {
        if (this.gameOver) return null;
        
        // 当たり判定用四角形の角を取得
        const corners = robot.getCollisionCorners();
        
        // 各角が黒ライン（境界）に接触していないかチェック
        for (let i = 0; i < corners.length; i++) {
            const corner = corners[i];
            
            if (corner.x < this.borderLineWidth || 
                corner.x >= this.width - this.borderLineWidth ||
                corner.y < this.borderLineWidth || 
                corner.y >= this.height - this.borderLineWidth) {
                this.gameOver = true;
                this.gameOverReason = 'collision';
                return { type: 'collision', x: corner.x, y: corner.y, cornerIndex: i };
            }
        }
        
        // ロボット外側とターゲットの衝突チェック（robot.yamlの表示用サイズを使用）
        // ロボット表示用四角形の4角を計算
        const displayCorners = this.getRobotDisplayCorners(robot, robot.width, robot.height);
        
        for (let i = 0; i < displayCorners.length; i++) {
            const corner = displayCorners[i];
            
            // 各ターゲットとの衝突チェック
            for (const target of this.targets) {
                const distance = Math.sqrt(
                    Math.pow(corner.x - target.x, 2) + 
                    Math.pow(corner.y - target.y, 2)
                );
                
                if (distance <= target.radius) {
                    // デバッグ用: ターゲット衝突によるゲームオーバーを無効化
                    console.log(`ターゲット${target.id}に衝突検知（デバッグモード: ゲームオーバーなし）`);
                    // this.gameOver = true;
                    // this.gameOverReason = 'target_collision';
                    // return { 
                    //     type: 'target_collision', 
                    //     x: corner.x, 
                    //     y: corner.y, 
                    //     cornerIndex: i,
                    //     targetId: target.id 
                    // };
                }
            }
        }
        
        return null;
    }
    
    checkFallOff(robot) {
        if (this.gameOver) return null;
        
        // 当たり判定用四角形の角を取得
        const corners = robot.getCollisionCorners();
        
        // 各角がフィールド全体から外れていないかチェック
        for (let i = 0; i < corners.length; i++) {
            const corner = corners[i];
            
            if (corner.x < 0 || corner.x >= this.width ||
                corner.y < 0 || corner.y >= this.height) {
                this.gameOver = true;
                this.gameOverReason = 'fall_off';
                return { type: 'fall_off', x: corner.x, y: corner.y, cornerIndex: i };
            }
        }
        
        return null;
    }
    
    checkSafety(robot) {
        const collision = this.checkCollision(robot);
        if (collision) return collision;
        
        const fallOff = this.checkFallOff(robot);
        if (fallOff) return fallOff;
        
        return null;
    }
    
    isGameOver() {
        return this.gameOver;
    }
    
    getGameOverReason() {
        return this.gameOverReason;
    }
    
    reset() {
        this.visitedTargets.clear();
        this.score = 0;
        this.lastVisitedTarget = null;
        this.gameOver = false;
        this.gameOverReason = null;
        for (const target of this.targets) {
            target.discovered = false;
        }
    }
}

// グローバルスコープに公開
window.Field = Field;

// export { Field };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Field;
}