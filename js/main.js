// main.js - アプリケーションエントリーポイント
// 依存関係の明確化とアプリケーション初期化を担当

/**
 * アプリケーションの初期化とモジュール間の依存関係管理
 */
class Application {
    constructor() {
        this.simulator = null;
        this.isInitialized = false;
    }
    
    /**
     * アプリケーションの初期化
     * 必要なモジュールがすべて読み込まれた後に実行
     */
    async initialize() {
        try {
            console.log('Denden Robot Simulator - アプリケーション初期化開始');
            
            // 必要なクラスの存在確認
            this.validateDependencies();
            
            // 定数の初期化確認
            this.validateConstants();
            
            // シミュレーターの初期化（非同期）
            this.simulator = new Simulator();
            
            // Simulatorの非同期初期化を明示的に実行
            await this.simulator.initializeAsync();
            
            this.isInitialized = true;
            console.log('Denden Robot Simulator - 初期化完了');
            
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * 依存モジュールの存在確認
     */
    validateDependencies() {
        const requiredClasses = [
            'Simulator',
            'Robot', 
            'Field',
            'RobotSensors',
            'ConfigLoader',
            'ConfigManager',
            'ExplorationPrograms'
        ];
        
        const missingClasses = [];
        
        for (const className of requiredClasses) {
            if (typeof window[className] === 'undefined') {
                missingClasses.push(className);
            }
        }
        
        if (missingClasses.length > 0) {
            throw new Error(`必要なクラスが見つかりません: ${missingClasses.join(', ')}`);
        }
        
        console.log('依存関係チェック完了');
    }
    
    /**
     * 定数の初期化確認
     */
    validateConstants() {
        if (typeof window.CONST === 'undefined') {
            throw new Error('定数オブジェクト(CONST)が初期化されていません');
        }
        
        const requiredConstGroups = ['SCORING', 'ROBOT_CONTROL', 'EXPLORATION', 'SENSORS', 'FIELD', 'UI', 'TIMING'];
        const missingGroups = [];
        
        for (const group of requiredConstGroups) {
            if (!window.CONST[group]) {
                missingGroups.push(group);
            }
        }
        
        if (missingGroups.length > 0) {
            throw new Error(`必要な定数グループが見つかりません: ${missingGroups.join(', ')}`);
        }
        
        console.log('定数チェック完了');
    }
    
    /**
     * 初期化エラーの処理
     */
    handleInitializationError(error) {
        // エラーメッセージをユーザーに表示
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                background-color: #ffebee;
                color: #c62828;
                padding: 20px;
                border-radius: 10px;
                margin: 20px;
                border: 1px solid #ef5350;
                text-align: center;
            `;
            errorDiv.innerHTML = `
                <h2>初期化エラー</h2>
                <p>アプリケーションの初期化に失敗しました。</p>
                <p><strong>エラー詳細:</strong> ${error.message}</p>
                <p>ページを再読み込みしてください。</p>
            `;
            container.prepend(errorDiv);
        }
    }
    
    /**
     * アプリケーションの状態取得
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            simulator: this.simulator ? 'ready' : 'not_ready'
        };
    }
}

// グローバルなアプリケーションインスタンス
window.app = new Application();

/**
 * DOM読み込み完了後にアプリケーションを初期化
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM読み込み完了 - アプリケーション初期化開始');
    window.app.initialize();
});

/**
 * ページ読み込み完了後の最終チェック
 */
window.addEventListener('load', () => {
    console.log('ページ読み込み完了');
    
    // 初期化状態の確認
    setTimeout(() => {
        const status = window.app.getStatus();
        console.log('アプリケーション状態:', status);
        
        if (!status.initialized) {
            console.warn('アプリケーションの初期化が完了していません');
        }
    }, 1000);
});

// デバッグ用：グローバルエラーハンドリング
window.addEventListener('error', (event) => {
    console.error('グローバルエラー:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未処理のPromise拒否:', event.reason);
});