# Helix AutoTest 完整部署指南 (FinalShell 版)

**适用场景**：你已经用 FinalShell 连接上了服务器，现在准备开始部署。

**服务器信息**：
- IP: `192.168.8.23`
- 用户: `appuser` / 密码: `Beaver@2026#`

---

## 第一步：准备文件（在你的电脑上）

请确保你的项目目录里已经有以下 **3个文件夹**：
1.  `backend` (后端代码)
2.  `frontend/dist` (前端构建后的文件) 
    *   *如果没有 `dist`，请先在 VS Code 终端运行：`cd frontend && npm run build`*
3.  `deploy` (包含 setup.sh 等配置)

---

## 第二步：创建服务器目录（在 FinalShell 里）

为了避免权限问题，我们把文件放在你的**家目录**下。

1.  在 FinalShell 下方的 **终端窗口** 输入命令：
    ```bash
    mkdir -p /home/appuser/helix_deploy
    ```
2.  在文件面板中，进入此目录：
    *   点击地址栏输入 `/home/appuser/helix_deploy` 回车。
    *   或者手动点击进入。

---

## 第三步：上传文件（最关键的一步）

把本地的文件夹 **拖拽** 到 FinalShell 的文件面板里：

1.  把本地的 `backend` 文件夹拖进去。
2.  把本地的 `frontend/dist` 文件夹拖进去。
3.  把本地的 `deploy` 文件夹拖进去。

*上传完成后，你应该能在 FinalShell 里看到这三个文件夹。*

---

## 第四步：执行安装脚本

在 FinalShell 的 **终端窗口** 依次执行：

1.  **进入目录**：
    ```bash
    cd /home/appuser/helix_deploy/deploy
    ```

2.  **运行安装助手**：
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```
    *(脚本会自动安装 Python、Nginx。如果中间提示输入密码，请输入 `Beaver@2026#`)*

---

## 第五步：启动服务

脚本跑完后，还需要最后一步来启动网站。直接复制下面整段命令执行：

```bash
# 1. 启动后端
sudo cp ../deploy/helix-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable helix-backend
sudo systemctl restart helix-backend

# 2. 启动前端
sudo cp ../deploy/nginx.conf /etc/nginx/conf.d/helix.conf
# 删除可能存在的默认配置
[ -f /etc/nginx/sites-enabled/default ] && sudo rm /etc/nginx/sites-enabled/default

# 3. 重启 Nginx
sudo systemctl restart nginx
```

---

## 第六步：大功告成

打开浏览器访问：**http://192.168.8.23**

如果看到页面，恭喜你，部署成功！
