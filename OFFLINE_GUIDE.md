# Helix AutoTest - FinalShell 离线部署指南

本指南将指导您如何使用 **FinalShell** 将项目上传并通过脚本在离线服务器上完成部署。

---

## 第一步：准备本地文件

在开始之前，请确保您的本地项目目录 `d:\codespace\helix_autotest` 中包含以下内容：

1.  **代码文件**: `backend`, `frontend`, `deploy` 等文件夹齐全。
2.  **离线安装包**: 检查 `deploy/offline_packages` 目录，需包含：
    *   `miniconda.sh` (或类似 .sh 安装包)
    *   `nginx-xxxx.rpm` (CentOS) 或 `nginx-xxxx.deb` (Ubuntu)
    *   `node-xxxx.tar.xz` (Node.js 安装包)
    *   `bak` 目录或其他子目录（可选）

> **注意**: 如果缺少上述安装包，请参考 `doc/MANUAL_DEPLOY_GUIDE_CN.md` 手动下载并放入该目录。

---

## 第二步：使用 FinalShell 上传文件

1.  打开 **FinalShell** 并连接到您的服务器。
2.  在下方的 **文件管理** 窗口中，进入目标目录（例如 `/home/appuser`）。
3.  创建一个新文件夹，命名为 `helix`。
4.  进入 `/home/appuser/helix` 目录。
5.  将本地 `d:\codespace\helix_autotest` 文件夹下的**所有内容**（全选）拖入 FinalShell 的文件窗口中进行上传。
    *   *提示：如果文件较多，您可以先在本地将整个目录打包成 `helix.zip`，上传后再在服务器解压 (`unzip helix.zip`)，这样速度更快。*

---

## 第三步：执行离线安装脚本

在 FinalShell 的 **终端** 窗口中，执行以下命令：

### 1. 进入部署目录
```bash
cd ~/helix/deploy
```
*(如果您上传到了其他位置，请修改路径)*

### 2. 赋予脚本执行权限
我们需要给安装脚本添加可执行权限：
```bash
chmod +x install_offline_full.sh
chmod +x setup.sh
```

### 3. 运行全量离线安装
这个脚本会自动检测并安装 Python、Node.js、Nginx 和相关依赖：
```bash
./install_offline_full.sh
```
*   脚本执行过程中可能会提示输入 `sudo` 密码，请按提示输入。
*   等待脚本显示 "全量离线安装完成！"。

### 4. 运行服务初始化 (最后一步)
```bash
./setup.sh
```
此步骤会配置 Nginx 代理并启动后端服务。

---

## 第四步：验证部署

部署完成后，打开浏览器访问服务器 IP（默认端口 80）：

*   **访问地址**: `http://<服务器IP>`
*   如果看到登录页面或系统界面，说明部署成功！

---

## 常见问题

**Q: 提示 "Permission denied"?**
A: 请确保执行了 `chmod +x *.sh` 给脚本添加执行权限。

**Q: 脚本提示找不到 rpm/sh 文件?**
A: 请检查 `deploy/offline_packages` 目录是否上传完整，且文件名后缀是否正确（脚本会自动搜索 `.rpm`, `.sh`, `.tar.xz`）。
