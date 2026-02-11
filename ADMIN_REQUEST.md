**申请人**：appuser
**服务器 IP**：192.168.8.23 (CentOS 8)
**部署项目**：Helix AutoTest 自动化测试平台
**申请目的**：Python 版本过旧 (3.6) 且缺少开发工具，导致依赖无法编译安装，Nginx 缺失导致无法进行反向代理部署。

### 1. 软件安装/升级需求 (System Requirements)

请协助安装或升级以下软件包：

| 组件名称 | 最低版本要求 | 推荐版本 | 原因 |
| :--- | :--- | :--- | :--- |
| **Python** | 3.8+ | **3.9 或 3.10** | 当前的 3.6 已过时 (EOL)，Pandas/SQLAlchemy 等核心库不再支持。 |
| **Python Devel** | - | - | 必需。提供 `Python.h` 头文件，用于编译依赖库 (如 greenlet)。<br>命令: `yum install python3-devel` |
| **GCC** | - | - | 必需。用于编译 Python 扩展模块。<br>命令: `yum install gcc` |
| **Nginx** | 1.18+ | Latest | 用于作为 Web 服务器和反向代理。<br>命令: `yum install nginx` |

*(注：由于 CentOS 8 已停止维护，yum 源可能需要先修复指向 `vault.centos.org` 才能正常安装)*

### 2. 权限申请 (Permission Request)

希望授予 `appuser` 用户以下操作权限（或由管理员代为执行）：

1.  **Sudo 权限**：允许 `appuser` 执行 `sudo systemctl restart nginx` 和 `sudo systemctl restart helix-backend`，以便发布更新后重启服务。
2.  **目录权限**：确保 `/var/www/helix` 目录归属为 `appuser:appuser`，以便应用写入日志和更新代码。
3.  **防火墙**：开放 **80 (HTTP)** 端口。

### 管理员参考操作 (Reference Commands)

```bash
# 1. 修复 CentOS 8 源 (如果你还没修)
sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*

# 2. 安装基础环境
yum install -y python39 python39-devel gcc nginx

# 3. 设置默认 Python (可选)
alternatives --set python3 /usr/bin/python3.9

# 4. 启动 Nginx
systemctl enable --now nginx
```
