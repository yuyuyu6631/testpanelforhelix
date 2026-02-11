# Helix AutoTest 离线包准备脚本
# 作用：在本地下载 Miniconda 安装包和所有 Python 依赖包
# 用法：右键 -> 使用 PowerShell 运行

$ErrorActionPreference = "Stop"
$DownloadDir = "offline_packages"
$MinicondaUrl = "https://repo.anaconda.com/miniconda/Miniconda3-py39_23.5.2-0-Linux-x86_64.sh"
$ReqFile = "backend\requirements.txt"

# 1. 创建下载目录
if (-not (Test-Path $DownloadDir)) {
    New-Item -ItemType Directory -Path $DownloadDir | Out-Null
}

Write-Host "=== [1/3] 开始制作离线安装包 ===" -ForegroundColor Cyan
Write-Host "保存路径: $(Resolve-Path $DownloadDir)"

# 2. 下载 Miniconda (Linux版)
$MinicondaFile = Join-Path $DownloadDir "miniconda.sh"
Write-Host "`n[2/3] 正在下载 Miniconda (Linux x86_64)..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $MinicondaUrl -OutFile $MinicondaFile -UseBasicParsing
    Write-Host "Miniconda 下载成功。" -ForegroundColor Green
}
catch {
    Write-Host "Miniconda 下载失败: $_" -ForegroundColor Red
    exit 1
}

# 3. 下载 Python 依赖包 (Linux whl)
Write-Host "`n[3/3] 正在下载 Python 依赖包 (manylinux_x86_64)..." -ForegroundColor Cyan
Write-Host "提示：需要本地已安装 Python 和 pip"

# 确保 pip 存在
if (-not (Get-Command pip -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 请先在 Windows 上安装 Python/pip 才能下载依赖包。" -ForegroundColor Red
    exit 1
}

# 使用 pip download 下载 Linux 平台的包
# 注意：这里模拟 Linux 环境下载，可能需要较长时间
pip download -r $ReqFile `
    --dest $DownloadDir `
    --platform manylinux2014_x86_64 `
    --only-binary=:all: `
    --python-version 3.9 `
    --implementation cp `
    -i https://pypi.tuna.tsinghua.edu.cn/simple

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== 离线包制作完成！ ===" -ForegroundColor Green
    Write-Host "请将 '$DownloadDir' 文件夹(包含miniconda.sh和.whl文件) 上传到服务器的 ~/helix/deploy/ 目录下。"
}
else {
    Write-Host "`n依赖包下载部分失败，请检查错误信息。" -ForegroundColor Yellow
}

Pause
