const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com"]
        }
    }
}));

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.RENDER_EXTERNAL_URL || 'https://dx-diagnosis-pwa.onrender.com'] // Will be set by Render automatically
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for API endpoints
const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
    keyPrefix: 'middleware',
    points: 10, // 10 requests
    duration: 60, // Per 60 seconds
});

const rateLimiterMiddleware = (req, res, next) => {
    rateLimiter.consume(req.ip)
        .then(() => {
            next();
        })
        .catch(() => {
            res.status(429).json({
                error: 'Too many requests. Please try again later.',
                message: 'レート制限に達しました。しばらく待ってからもう一度お試しください。'
            });
        });
};

// Static files middleware with MIME type configuration
app.use(express.static(path.join(__dirname, '.'), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript; charset=utf-8');
        } else if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css; charset=utf-8');
        } else if (path.endsWith('.html')) {
            res.set('Content-Type', 'text/html; charset=utf-8');
        } else if (path.endsWith('.json')) {
            res.set('Content-Type', 'application/json; charset=utf-8');
        }
    }
}));

// API Routes
app.use('/api', rateLimiterMiddleware);

// AI Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, context } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                error: 'Invalid message',
                message: '有効なメッセージを入力してください。'
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY not configured');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'サーバーの設定エラーです。管理者にお問い合わせください。'
            });
        }

        const response = await callGeminiAPI(message.trim(), context);
        
        res.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat API error:', error);
        
        let errorMessage = 'サーバーエラーが発生しました。しばらく待ってからもう一度お試しください。';
        let statusCode = 500;

        if (error.message.includes('API key')) {
            errorMessage = 'APIキーの設定に問題があります。管理者にお問い合わせください。';
            statusCode = 500;
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
            errorMessage = 'APIの利用制限に達しました。しばらく待ってからもう一度お試しください。';
            statusCode = 429;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            statusCode = 503;
        }

        res.status(statusCode).json({
            error: 'Chat request failed',
            message: errorMessage
        });
    }
});

// Gemini API call function
async function callGeminiAPI(message, context = {}) {
    // ユーザーの基本情報に基づいてsystemPromptを動的に構築
    const basicInfo = context.basicInfo || {};
    const companySize = basicInfo.companySize || '';
    const industry = basicInfo.industry || '';
    const companyName = basicInfo.companyName || '';
    
    // 従業員数に応じた企業規模の設定
    let companySizeText = '中小企業';
    if (companySize === '1-5') {
        companySizeText = '従業員数1-5名の小規模企業';
    } else if (companySize === '6-20') {
        companySizeText = '従業員数6-20名の小規模企業';
    } else if (companySize === '21-50') {
        companySizeText = '従業員数21-50名の中小企業';
    } else if (companySize === '51-100') {
        companySizeText = '従業員数51-100名の中小企業';
    } else if (companySize === '101-300') {
        companySizeText = '従業員数101-300名の中小企業';
    }
    
    // 業種マッピング
    const industryMap = {
        'manufacturing': '製造業',
        'retail': '小売業',
        'service': 'サービス業',
        'construction': '建設業',
        'healthcare': '医療・介護業',
        'education': '教育業',
        'it': 'IT・通信業',
        'finance': '金融業',
        'other': 'その他の業種'
    };
    
    // 業種に応じた業界固有のアドバイス
    let industryContext = '';
    if (industry) {
        const industryName = industryMap[industry] || industry;
        industryContext = `特に${industryName}の特性を考慮したアドバイスを心がけてください。`;
    }
    
    const systemPrompt = `あなたは「いろはTECのピット」です。中小企業向けDX（デジタルトランスフォーメーション）専門コンサルタントです。

【相談者情報】
${companyName ? `- 会社名: ${companyName}` : ''}
- 企業規模: ${companySizeText}
${industry ? `- 業種: ${industryMap[industry] || industry}` : ''}

以下の点を重視して回答してください：
- ${companySizeText}に特化したアドバイス
- 実践的で具体的な提案
- コストを抑えた解決策
- 段階的な導入方法
- 日本の中小企業の実情に合った内容
- 技術的な詳細よりも経営観点での価値を重視
${industryContext}

回答は以下の形式で構成してください：
1. 質問の要点整理
2. 具体的な推奨アクション（3つ程度）
3. 期待される効果
4. 次のステップ

回答は親しみやすく、専門用語は分かりやすく説明してください。いろはTECとして、お客様に寄り添った提案を心がけてください。`;

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: systemPrompt + "\n\n質問: " + message
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        }
    };

    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, 
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        
        if (response.status === 400) {
            throw new Error('Invalid API key or request format');
        } else if (response.status === 403) {
            throw new Error('API key does not have permission or quota exceeded');
        } else if (response.status === 429) {
            throw new Error('API rate limit exceeded');
        } else {
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error('No valid response from Gemini API');
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Serve PWA files
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'サーバー内部エラーが発生しました。'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 DX診断ツール server running on port ${PORT}`);
    console.log(`📱 PWA available at: http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 Gemini API configured: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});