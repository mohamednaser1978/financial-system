# package_python.ps1
# This script bundles the Python backend into a 32-bit executable.

Write-Host "--- Financial System: Python 32-bit Packaging ---" -ForegroundColor Cyan

# 1. Check Python Architecture (Using Launcher for 32-bit)
$pythonCmd = "py -3.10-32"
Write-Host "Trying to use: $pythonCmd"

$pyArch = iex "$pythonCmd -c 'import platform; print(platform.architecture()[0])'"
Write-Host "Detected Python Architecture: $pyArch"

if ($pyArch -ne "32bit") {
    Write-Host "ERROR: Could not find or use 32-bit Python 3.10." -ForegroundColor Red
    Write-Host "Please ensure 'py -3.10-32' works in your terminal."
    exit 1
}

# 2. Check/Install PyInstaller
Write-Host "Checking for PyInstaller..."
iex "$pythonCmd -m pip install pyinstaller -r backend/requirements.txt"

# 3. Build the executable
Write-Host "Building backend.exe..."
iex "$pythonCmd -m PyInstaller --onefile --noconsole --name backend backend/main.py"

Write-Host "--- Build Complete! ---" -ForegroundColor Green
Write-Host "Copying backend.exe to root..."
Copy-Item "dist/backend.exe" "." -Force
Write-Host "Ready for final packaging."
