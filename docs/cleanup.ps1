# cleanup.ps1
$root = "d:\codespace\helix_autotest\apiautotest"
$archive = "$root\_archive"
$docs = "$root\docs"

# Create archive directory
if (!(Test-Path $archive)) { New-Item -ItemType Directory -Path $archive }

# Function to move item safely
function Move-ToArchive {
    param($path)
    if (Test-Path $path) {
        Write-Host "Archiving $path..."
        Move-Item -Path $path -Destination $archive -Force
    }
}

function Move-ToDocs {
    param($path)
    if (Test-Path $path) {
        Write-Host "Moving $path to docs..."
        Move-Item -Path $path -Destination $docs -Force
    }
}

# 1. Archives (Redundant Code)
Move-ToArchive "$root\frontend_backup"
Move-ToArchive "$root\src"
Move-ToArchive "$root\run_batch_test.py"
Move-ToArchive "$root\main.py" 
Move-ToArchive "$root\create_test_data.py"
Move-ToArchive "$root\requirements.txt"  # Root requirements (old), backend has its own
Move-ToArchive "$root\__pycache__"
Move-ToArchive "$root\.pytest_cache"

# 2. Documentation
Move-ToDocs "$root\修改记录_V3.0.md"
Move-ToDocs "$root\需求"  # Move entire requirement folder to docs

# 3. Data files (Move loose files to data/archive or just archive them if they are temp results)
# '测试报告_Result.xlsx' is an old result, archive it
Move-ToArchive "$root\测试报告_Result.xlsx"

# 'auto_generated_cases_db.csv' and 'test_import.csv' seem like data source files.
# Check if they are in 'data' already?
# Config says: D:\apiautotest\data\sqltocase\auto_generated_cases_db.csv
# This file is at root? 'd:\codespace\helix_autotest\apiautotest\auto_generated_cases_db.csv'
# If it's at root, it might be misplaced. Let's move them to data root for now to clean up, or archive if duplicates.
if (Test-Path "$root\auto_generated_cases_db.csv") {
    Move-Item -Path "$root\auto_generated_cases_db.csv" -Destination "$root\data\" -Force
}
if (Test-Path "$root\test_import.csv") {
    Move-Item -Path "$root\test_import.csv" -Destination "$root\data\" -Force
}

# 4. Check if '新前端' exists (it might have been deleted or skipped, but check)
Move-ToArchive "$root\新前端"

Write-Host "Cleanup Complete."
