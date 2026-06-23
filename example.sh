#!/bin/bash

# 示例用法

# 1. 设置 API 密钥
echo "设置 API 密钥..."
./cli.js --set-key YOUR_API_KEY_HERE

# 2. 基本使用
echo "基本使用..."
./cli.js "Hello, how are you today?"

# 3. 带自定义提示词
echo "带自定义提示词..."
./cli.js "Welcome to our service" --prompt "Professional and friendly"

# 4. 自定义输出
echo "自定义输出..."
./cli.js "Thank you" -o thank-you.mp3

# 5. 高质量模式
echo "高质量模式..."
./cli.js "Important announcement" --iterations 10 --quality 95

echo "完成！"
