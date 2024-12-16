FROM oven/bun

WORKDIR /usr/src/app
# 复制应用程序文件
COPY bundle.js bundle.js

# 暴露端口
EXPOSE 9588

# 启动命令
CMD ["bun", "bundle.js"]
