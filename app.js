// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// PWA Install Prompt
let deferredPrompt;
let installButton;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installButton) {
        installButton.style.display = 'inline-block';
    }
});

window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    if (installButton) {
        installButton.style.display = 'none';
    }
});

// Initialize install button after DOM is loaded
function initializeInstallButton() {
    installButton = document.getElementById('install-button');
    
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) {
                return;
            }
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            
            deferredPrompt = null;
            installButton.style.display = 'none';
        });
        
        // Show install button if deferred prompt is already available
        if (deferredPrompt) {
            installButton.style.display = 'inline-block';
        }
    }
}

// DX Diagnosis Tool Logic
let currentSection = 1;
let diagnosticData = {
    basicInfo: {},
    assessmentAnswers: {},
    results: {}
};

// Assessment Questions
const assessmentQuestions = [
    {
        id: "digital_strategy",
        question: "貴社にはデジタル化戦略がありますか？",
        options: [
            { value: 1, text: "明確なデジタル戦略があり、定期的に更新している" },
            { value: 0.7, text: "基本的なデジタル戦略はあるが、あまり更新していない" },
            { value: 0.4, text: "曖昧なデジタル化の方針はある" },
            { value: 0.1, text: "特に戦略はない" }
        ]
    },
    {
        id: "data_utilization",
        question: "データの活用状況はどの程度ですか？",
        options: [
            { value: 1, text: "データを戦略的に分析し、意思決定に活用している" },
            { value: 0.7, text: "基本的なデータ分析を行い、一部で活用している" },
            { value: 0.4, text: "データは収集しているが、あまり活用できていない" },
            { value: 0.1, text: "データの収集・活用はほとんどしていない" }
        ]
    },
    {
        id: "cloud_usage",
        question: "クラウドサービスの利用状況は？",
        options: [
            { value: 1, text: "業務システムの大部分をクラウド化している" },
            { value: 0.7, text: "一部の業務でクラウドサービスを利用している" },
            { value: 0.4, text: "メールやファイル共有程度でクラウドを利用" },
            { value: 0.1, text: "クラウドサービスはほとんど利用していない" }
        ]
    },
    {
        id: "automation",
        question: "業務の自動化・効率化の取り組みは？",
        options: [
            { value: 1, text: "多くの業務プロセスが自動化されている" },
            { value: 0.7, text: "一部の定型業務を自動化している" },
            { value: 0.4, text: "自動化を検討中だが、まだ実装していない" },
            { value: 0.1, text: "手作業中心で、自動化は検討していない" }
        ]
    },
    {
        id: "digital_marketing",
        question: "デジタルマーケティングの活用度は？",
        options: [
            { value: 1, text: "SNS、Web広告、SEO等を戦略的に活用" },
            { value: 0.7, text: "ホームページやSNSを積極的に活用" },
            { value: 0.4, text: "ホームページはあるが、あまり活用していない" },
            { value: 0.1, text: "従来の営業手法のみで、デジタル活用は少ない" }
        ]
    },
    {
        id: "remote_work",
        question: "リモートワーク・テレワークの対応状況は？",
        options: [
            { value: 1, text: "完全にリモートワークに対応、生産性も向上" },
            { value: 0.7, text: "リモートワークは可能だが、一部制約がある" },
            { value: 0.4, text: "緊急時のみリモートワークが可能" },
            { value: 0.1, text: "リモートワークには対応していない" }
        ]
    },
    {
        id: "security",
        question: "ITセキュリティ対策の状況は？",
        options: [
            { value: 1, text: "包括的なセキュリティ対策を実施している" },
            { value: 0.7, text: "基本的なセキュリティ対策は実施している" },
            { value: 0.4, text: "最低限のセキュリティ対策のみ" },
            { value: 0.1, text: "特別なセキュリティ対策は実施していない" }
        ]
    },
    {
        id: "employee_skills",
        question: "従業員のデジタルスキル向上への取り組みは？",
        options: [
            { value: 1, text: "定期的な研修や教育プログラムを実施" },
            { value: 0.7, text: "必要に応じて研修を実施している" },
            { value: 0.4, text: "個人の自主学習に任せている" },
            { value: 0.1, text: "特に取り組んでいない" }
        ]
    },
    {
        id: "customer_digital",
        question: "顧客とのデジタルな接点の充実度は？",
        options: [
            { value: 1, text: "オンライン接客、チャットボット等を活用" },
            { value: 0.7, text: "ホームページやSNSで顧客とコミュニケーション" },
            { value: 0.4, text: "メールでの連絡が中心" },
            { value: 0.1, text: "電話や対面での接客が中心" }
        ]
    },
    {
        id: "digital_investment",
        question: "デジタル化への投資姿勢は？",
        options: [
            { value: 1, text: "積極的に予算を確保し、継続的に投資" },
            { value: 0.7, text: "必要性を感じた分野に投資している" },
            { value: 0.4, text: "コストを抑えながら最小限の投資" },
            { value: 0.1, text: "デジタル化への投資は慎重" }
        ]
    }
];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log('DX診断ツール loaded successfully!');
    
    // Initialize PWA install button
    initializeInstallButton();
    
    // Initialize diagnosis tool
    initializeQuestions();
    updateProgress();
    
    // Initialize chat feature
    initializeChatInterface();
    
    // Initialize button event listeners
    initializeButtonEventListeners();
    
    if (navigator.onLine) {
        console.log('App is online');
    } else {
        console.log('App is offline');
        document.body.classList.add('offline');
    }
});

// Initialize Quiz Questions
function initializeQuestions() {
    const quizContainer = document.getElementById('quiz-container');
    
    if (!quizContainer) {
        console.error('Quiz container not found');
        return;
    }
    
    assessmentQuestions.forEach((q, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.innerHTML = `
            <div class="question-title">${index + 1}. ${q.question}</div>
            <div class="question-options">
                ${q.options.map(option => `
                    <label class="option-item">
                        <input type="radio" name="question_${q.id}" value="${option.value}">
                        <span>${option.text}</span>
                    </label>
                `).join('')}
            </div>
        `;
        quizContainer.appendChild(questionCard);
    });
    
    // Add event listeners for radio buttons
    setTimeout(() => {
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', checkQuizCompletion);
        });
    }, 100);
}

// Navigation Functions
function nextSection() {
    if (currentSection === 1) {
        if (validateBasicInfo()) {
            collectBasicInfo();
            showSection(2);
        }
    }
}

function prevSection() {
    if (currentSection > 1) {
        showSection(currentSection - 1);
    }
}

function showSection(sectionNum) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    document.getElementById(`section-${sectionNum}`).classList.add('active');
    
    // Update progress
    currentSection = sectionNum;
    updateProgress();
    updateStepIndicators();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        const progressPercentage = (currentSection / 4) * 100;
        progressFill.style.width = `${progressPercentage}%`;
    }
}

function updateStepIndicators() {
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index + 1 <= currentSection) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
        
        // Add click functionality to step indicators
        step.addEventListener('click', () => {
            const stepNumber = index + 1;
            if (stepNumber <= currentSection || stepNumber === 4) {
                showSection(stepNumber);
            }
        });
    });
}

// Form Validation
function validateBasicInfo() {
    const companyName = document.getElementById('company-name').value.trim();
    const companySize = document.getElementById('company-size').value;
    const industry = document.getElementById('industry').value;
    
    if (!companyName || !companySize || !industry) {
        alert('すべての基本情報を入力してください。');
        return false;
    }
    return true;
}

function collectBasicInfo() {
    diagnosticData.basicInfo = {
        companyName: document.getElementById('company-name').value.trim(),
        companySize: document.getElementById('company-size').value,
        industry: document.getElementById('industry').value,
        currentTools: Array.from(document.querySelectorAll('#section-1 input[type="checkbox"]:checked'))
            .map(cb => cb.value)
    };
}

function checkQuizCompletion() {
    const totalQuestions = assessmentQuestions.length;
    const answeredQuestions = document.querySelectorAll('input[type="radio"]:checked').length;
    
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        if (answeredQuestions === totalQuestions) {
            calculateBtn.disabled = false;
        } else {
            calculateBtn.disabled = true;
        }
    }
}

// Results Calculation
function calculateResults() {
    collectAssessmentAnswers();
    const score = calculateScore();
    const level = getDXLevel(score);
    const recommendations = getRecommendations(level, diagnosticData.basicInfo);
    
    diagnosticData.results = {
        score: Math.round(score * 100),
        level: level,
        recommendations: recommendations
    };
    
    displayResults();
    showSection(3);
}

function collectAssessmentAnswers() {
    assessmentQuestions.forEach(q => {
        const selectedOption = document.querySelector(`input[name="question_${q.id}"]:checked`);
        if (selectedOption) {
            diagnosticData.assessmentAnswers[q.id] = parseFloat(selectedOption.value);
        }
    });
}

function calculateScore() {
    const answers = Object.values(diagnosticData.assessmentAnswers);
    return answers.reduce((sum, value) => sum + value, 0) / answers.length;
}

function getDXLevel(score) {
    if (score >= 0.8) return { name: "DX先進企業", color: "#2e7d32", description: "デジタル変革が高度に進んでいます" };
    if (score >= 0.6) return { name: "DX推進中", color: "#1976d2", description: "デジタル化が順調に進んでいます" };
    if (score >= 0.4) return { name: "DX初期段階", color: "#f57c00", description: "デジタル化の基盤ができています" };
    return { name: "DX準備段階", color: "#d32f2f", description: "デジタル化の取り組みを始めましょう" };
}

function getRecommendations(level, basicInfo) {
    const recommendations = [];
    
    if (level.name === "DX準備段階") {
        recommendations.push({
            title: "基本的なデジタルツールの導入",
            description: "クラウドメール、ファイル共有サービス、会計ソフトなど基本的なツールから始めましょう。"
        });
        recommendations.push({
            title: "従業員のデジタルリテラシー向上",
            description: "基本的なPC操作やオンラインツールの使い方の研修を実施しましょう。"
        });
        recommendations.push({
            title: "セキュリティ対策の強化",
            description: "ウイルス対策ソフトの導入とパスワード管理の徹底から始めましょう。"
        });
    } else if (level.name === "DX初期段階") {
        recommendations.push({
            title: "業務プロセスのデジタル化",
            description: "紙ベースの業務をデジタル化し、効率化を図りましょう。"
        });
        recommendations.push({
            title: "顧客管理システムの導入",
            description: "CRMシステムを導入して、顧客情報を一元管理しましょう。"
        });
        recommendations.push({
            title: "オンライン販売・マーケティング",
            description: "ホームページの充実やSNS活用で、デジタルマーケティングを始めましょう。"
        });
    } else if (level.name === "DX推進中") {
        recommendations.push({
            title: "データ分析の活用",
            description: "蓄積されたデータを分析し、ビジネス戦略に活用しましょう。"
        });
        recommendations.push({
            title: "業務自動化の推進",
            description: "RPAツールなどを活用して、定型業務の自動化を進めましょう。"
        });
        recommendations.push({
            title: "リモートワーク環境の整備",
            description: "場所を選ばない働き方を実現する環境を整備しましょう。"
        });
    } else {
        recommendations.push({
            title: "AI・IoTの活用検討",
            description: "次世代技術の活用で、さらなる競争優位性を築きましょう。"
        });
        recommendations.push({
            title: "デジタル人材の育成",
            description: "社内でデジタル変革をリードする人材を育成しましょう。"
        });
        recommendations.push({
            title: "他社との連携・協業",
            description: "DXエコシステムの構築で、新たなビジネス機会を創出しましょう。"
        });
    }
    
    return recommendations;
}

function displayResults() {
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }
    
    const { score, level, recommendations } = diagnosticData.results;
    
    resultsContainer.innerHTML = `
        <div class="score-display">
            <div class="score-circle" style="background: linear-gradient(135deg, ${level.color}, ${level.color}dd);">
                ${score}点
            </div>
            <div class="score-label">${level.name}</div>
            <div class="score-description">${level.description}</div>
        </div>
        
        <div class="recommendations">
            <h3 style="color: var(--primary-blue); margin-bottom: 1.5rem; text-align: center;">おすすめのアクション</h3>
            ${recommendations.map(rec => `
                <div class="recommendation-card">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// Utility Functions
function downloadResults() {
    if (!diagnosticData.basicInfo || !diagnosticData.results) {
        alert('診断結果がありません。診断を完了してください。');
        return;
    }
    
    const { basicInfo, results } = diagnosticData;
    const content = `
DX推進診断結果

企業情報:
- 会社名: ${basicInfo.companyName || '未入力'}
- 従業員数: ${basicInfo.companySize || '未入力'}
- 業種: ${basicInfo.industry || '未入力'}
- 使用ツール: ${basicInfo.currentTools ? basicInfo.currentTools.join(', ') : '未選択'}

診断結果:
- スコア: ${results.score}点
- レベル: ${results.level.name}
- 評価: ${results.level.description}

推奨アクション:
${results.recommendations.map((rec, index) => `${index + 1}. ${rec.title}\n   ${rec.description}`).join('\n\n')}

診断日時: ${new Date().toLocaleString('ja-JP')}
    `;
    
    try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DX診断結果_${basicInfo.companyName || 'company'}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download failed:', error);
        alert('ダウンロードに失敗しました。もう一度お試しください。');
    }
}

function restartDiagnosis() {
    // Reset data
    diagnosticData = {
        basicInfo: {},
        assessmentAnswers: {},
        results: {}
    };
    
    // Reset form with null checks
    const companyName = document.getElementById('company-name');
    const companySize = document.getElementById('company-size');
    const industry = document.getElementById('industry');
    const calculateBtn = document.getElementById('calculate-btn');
    
    if (companyName) companyName.value = '';
    if (companySize) companySize.value = '';
    if (industry) industry.value = '';
    
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
    
    // Reset UI
    if (calculateBtn) calculateBtn.disabled = true;
    showSection(1);
}

// AI Chat Variables
let chatHistory = [];
let isApiKeyConfigured = true; // Server handles API key

// Initialize Button Event Listeners
function initializeButtonEventListeners() {
    // Section navigation buttons
    const startDiagnosisBtn = document.getElementById('start-diagnosis-btn');
    if (startDiagnosisBtn) {
        startDiagnosisBtn.addEventListener('click', nextSection);
    }
    
    const prevSection1Btn = document.getElementById('prev-section-1-btn');
    if (prevSection1Btn) {
        prevSection1Btn.addEventListener('click', prevSection);
    }
    
    const prevSection2Btn = document.getElementById('prev-section-2-btn');
    if (prevSection2Btn) {
        prevSection2Btn.addEventListener('click', prevSection);
    }
    
    const prevSection3Btn = document.getElementById('prev-section-3-btn');
    if (prevSection3Btn) {
        prevSection3Btn.addEventListener('click', prevSection);
    }
    
    // Calculate results button
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateResults);
    }
    
    // Results buttons
    const downloadResultsBtn = document.getElementById('download-results-btn');
    if (downloadResultsBtn) {
        downloadResultsBtn.addEventListener('click', downloadResults);
    }
    
    const showChatBtn = document.getElementById('show-chat-btn');
    if (showChatBtn) {
        showChatBtn.addEventListener('click', () => showSection(4));
    }
    
    const restartDiagnosis1Btn = document.getElementById('restart-diagnosis-1-btn');
    if (restartDiagnosis1Btn) {
        restartDiagnosis1Btn.addEventListener('click', restartDiagnosis);
    }
    
    const restartDiagnosis2Btn = document.getElementById('restart-diagnosis-2-btn');
    if (restartDiagnosis2Btn) {
        restartDiagnosis2Btn.addEventListener('click', restartDiagnosis);
    }
    
    // Chat buttons
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearChat);
    }
    
    // Sample question buttons
    const questionChips = document.querySelectorAll('.question-chip');
    questionChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            const question = e.target.getAttribute('data-question');
            if (question) {
                sendSampleQuestion(question);
            }
        });
    });
}

// Initialize Chat Interface
function initializeChatInterface() {
    // Initialize chat input listeners immediately
    initializeChatInput();
}

// Initialize Chat Input
function initializeChatInput() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    
    if (chatInput && sendButton) {
        chatInput.addEventListener('input', () => {
            const hasText = chatInput.value.trim().length > 0;
            sendButton.disabled = !hasText || !isApiKeyConfigured;
        });
        
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendButton.disabled) {
                    sendMessage();
                }
            }
        });
        
        // Auto-resize textarea
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
        });
    }
}

// Send Message
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message || !isApiKeyConfigured) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Send to server API
        const response = await callChatAPI(message);
        hideTypingIndicator();
        addMessageToChat(response, 'ai');
    } catch (error) {
        hideTypingIndicator();
        console.error('Chat error:', error);
        
        // More specific error messages based on error type
        let errorMessage = '申し訳ございません。一時的にエラーが発生しました。しばらくしてからもう一度お試しください。';
        
        if (error.message.includes('403') || error.message.includes('permission')) {
            errorMessage = 'APIキーの権限に問題があります。管理者に確認してください。';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            errorMessage = 'APIの利用制限に達しました。しばらく待ってからもう一度お試しください。';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
        }
        
        addMessageToChat(errorMessage, 'ai');
    }
    
    // Update send button state
    document.getElementById('send-button').disabled = true;
}

// Send Sample Question
function sendSampleQuestion(question) {
    document.getElementById('chat-input').value = question;
    document.getElementById('send-button').disabled = false;
    sendMessage();
}

// Call Server API for chat
async function callChatAPI(message) {
    const requestBody = {
        message: message,
        context: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            basicInfo: diagnosticData.basicInfo || {}
        }
    };

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
        // Handle different error types
        if (response.status === 429) {
            throw new Error(data.message || 'レート制限に達しました。しばらく待ってからお試しください。');
        } else if (response.status === 400) {
            throw new Error(data.message || '無効なリクエストです。');
        } else if (response.status === 500) {
            throw new Error(data.message || 'サーバーエラーが発生しました。');
        } else if (response.status === 503) {
            throw new Error(data.message || 'サービスが一時的に利用できません。');
        } else {
            throw new Error(data.message || '予期しないエラーが発生しました。');
        }
    }

    if (data.success && data.response) {
        return data.response;
    } else {
        throw new Error('応答を取得できませんでした。');
    }
}

// Render Markdown to HTML
function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        // Configure marked options for better rendering
        marked.setOptions({
            breaks: true,
            gfm: true,
            sanitize: false,
            headerIds: false
        });
        return marked.parse(text);
    } else {
        // Fallback to simple text formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^\d+\.\s+(.*$)/gm, '<li>$1</li>')
            .replace(/^-\s+(.*$)/gm, '<li>$1</li>')
            .replace(/\n/g, '<br>');
    }
}

// Add Message to Chat
function addMessageToChat(message, type) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatar = type === 'user' ? '👤' : '🤖';
    const label = type === 'user' ? new Date().toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
    }) : 'いろはTEC';
    
    // Process message content based on type
    let processedMessage;
    if (type === 'ai') {
        processedMessage = renderMarkdown(message);
    } else {
        processedMessage = message.replace(/\n/g, '<br>');
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-bubble">${processedMessage}</div>
            <div class="message-time">${label}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Store in chat history
    chatHistory.push({
        message: message,
        type: type,
        timestamp: new Date().toISOString()
    });
}

// Show Typing Indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message ai-message';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span>回答を作成中</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    
    // Scroll to bottom
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Hide Typing Indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Clear Chat
function clearChat() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    if (confirm('チャット履歴をクリアしますか？')) {
        // Keep only the welcome message
        chatMessages.innerHTML = `
            <div class="message ai-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="message-bubble">
                        こんにちは！いろはTECのDX専門コンサルタントです。<br>
                        中小企業のデジタル化やITツール導入について、実践的なアドバイスをいたします。<br>
                        上記のサンプル質問をクリックするか、直接ご質問を入力してください。
                    </div>
                    <div class="message-time">いろはTEC</div>
                </div>
            </div>
        `;
        
        chatHistory = [];
    }
}

// Functions are now attached via event listeners instead of global window exports

// Global Error Handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Online/Offline Status
window.addEventListener('online', () => {
    console.log('App is back online');
    document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
    console.log('App is offline');
    document.body.classList.add('offline');
});