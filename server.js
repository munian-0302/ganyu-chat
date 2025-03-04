const express = require('express');
const axios = require('axios');
require('dotenv').config();
const cors = require('cors');
const https = require('https'); // 添加 HTTPS 模块
const LRU = require('lru-cache');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 创建一个简单的内存缓存
const cacheOptions = {
    max: 500,
    maxAge: 1000 * 60 * 60, // 缓存有效期为 1 小时
};
const cache = new LRU(cacheOptions);

app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    console.log(`Received message: ${userMessage}`);

    // 构造完整的对话历史
    const conversationHistory = [
        { role: 'system', content: "你好，我是璃月七星之一的甘雨。有什么可以帮忙的吗？" },
        ...req.body.conversationHistory || [],
        { role: 'user', content: userMessage }
    ];

    // 构造唯一的缓存键
    const cacheKey = JSON.stringify({
        model: "deepseek-chat", // 使用正确的模型名称
        messages: conversationHistory,
        temperature: 0.7
    });

    // 检查缓存中是否有响应
    if (cache.has(cacheKey)) {
        console.log("Returning cached response");
        return res.json({ reply: cache.get(cacheKey), conversationHistory });
    }

    try {
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions', // 假设的 DeepSeek API 端点
            {
                model: "deepseek-chat", // 替换为有效的模型名称
                messages: conversationHistory,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 增加超时时间为 30 秒
            }
        );

        const reply = response.data.choices[0].message.content.trim();
        console.log(`Generated reply: ${reply}`);
        cache.set(cacheKey, reply); // 存储响应到缓存
        res.json({ reply: reply, conversationHistory: [...conversationHistory, { role: 'assistant', content: reply }] });
    } catch (error) {
        console.error('Error generating response:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error generating response' });
    }
});

app.use(express.static('public')); // 提供静态文件

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



