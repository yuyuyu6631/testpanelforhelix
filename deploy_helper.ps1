# Helix AutoTest Deployment Helper
# Requires PowerShell and OpenSSH
# Note: You will need to enter the password manually for SCP/SSH commands.
# Password: Beaver@2026#

$SERVER_IP = "192.168.8.23"
$USER = "appuser"
$REMOTE_DIR = "~/helix_deploy_temp"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "      Helix AutoTest Deploy Helper        " -ForegroundColor Green
Write-Host "=========================================="
Write-Host "Server: $SERVER_IP"
Write-Host "User:   $USER"
Write-Host "NOTE:   Prepare to enter password 'Beaver@2026#' multiple times."
Write-Host "------------------------------------------"

$confirm = Read-Host "Start deployment? (y/n)"
if ($confirm -ne 'y') { exit }

# 1. Build Frontend
Write-Host "`n[1/5] Building Frontend..." -ForegroundColor Cyan
Set-Location frontend
npm.cmd run build
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 
}
Set-Location ..

# 2. Prepare Remote Directory
Write-Host "`n[2/5] Creating remote directory (Enter Password)..." -ForegroundColor Cyan
ssh ${USER}@${SERVER_IP} "mkdir -p $REMOTE_DIR"
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Connection failed." -ForegroundColor Red
    exit 
}

# 3. Upload Files
Write-Host "`n[3/5] Uploading files (Enter Password)..." -ForegroundColor Cyan

# Upload Backend
Write-Host "  > Uploading backend..."
$dest = "${USER}@${SERVER_IP}:${REMOTE_DIR}/"
scp -r backend $dest

# Upload Frontend Dist
Write-Host "  > Uploading frontend/dist..."
scp -r frontend/dist $dest

# Upload Deploy Scripts
Write-Host "  > Uploading deploy..."
scp -r deploy $dest

# 4. Remote Install
Write-Host "`n[4/5] Running remote installation (Enter Password)..." -ForegroundColor Cyan

# Flatten command to single line to avoid Windows CRLF issues
$REMOTE_CMD_FMT = 'echo "--- Starting Installation ---"; sudo mkdir -p /var/www/helix; sudo chown {0}:{0} /var/www/helix; echo "--- Copying Files ---"; cp -r {1}/backend /var/www/helix/; cp -r {1}/dist /var/www/helix/; cp -r {1}/deploy /var/www/helix/; echo "--- Running Setup Script ---"; cd /var/www/helix/deploy; chmod +x setup.sh; ./setup.sh; echo "--- Configuring Services ---"; sudo cp /var/www/helix/deploy/helix-backend.service /etc/systemd/system/; sudo systemctl daemon-reload; sudo systemctl enable helix-backend; sudo systemctl restart helix-backend; sudo cp /var/www/helix/deploy/nginx.conf /etc/nginx/conf.d/helix.conf; [ -f /etc/nginx/sites-enabled/default ] && sudo rm /etc/nginx/sites-enabled/default; sudo systemctl restart nginx; echo "--- Deployment Complete ---";'

$REMOTE_CMD = $REMOTE_CMD_FMT -f $USER, $REMOTE_DIR

# Use -t to force pseudo-terminal for sudo password prompt visibility if needed
ssh -t ${USER}@${SERVER_IP} $REMOTE_CMD

Write-Host "`n[5/5] Finished." -ForegroundColor Green
Write-Host "Please check: http://$SERVER_IP"
Write-Host "If sudo asked for password, it might be hidden."
Pause
