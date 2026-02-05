import subprocess
import time
import sys
import os
import webbrowser
import socket
import signal

def check_port(port):
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('localhost', port)) == 0

def install_dependencies():
    """检查并安装依赖"""
    print("[1/4] 正在检查并安装后端依赖...")
    req_file = os.path.join("backend", "requirements.txt")
    if os.path.exists(req_file):
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", req_file, "-q"], check=True)
            print("      后端依赖检查完成。")
        except subprocess.CalledProcessError:
            print(" 错误: 安装后端依赖失败。请检查网络连接或手动运行 'pip install -r backend/requirements.txt'")
    
    print("[2/4] 正在检查前端依赖...")
    if not os.path.exists(os.path.join("frontend", "node_modules")):
        print("      未发现 node_modules，正在执行 npm install (这可能需要几分钟)...")
        npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
        try:
            subprocess.run([npm_cmd, "install"], cwd="frontend", check=True, shell=True)
            print("      前端依赖安装完成。")
        except Exception as e:
            print(f" 警告: 前端依赖安装可能失败 ({e})。如果后续启动报错，请手动在 frontend 目录运行 npm install")
    else:
        print("      前端依赖已存在。")

def main():
    print("==========================================")
    print("      Helix AutoTest 系统一键启动器       ")
    print("==========================================")
    
    # 获取脚本所在目录并切换
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # 强制安装/检查依赖
    install_dependencies()
    
    # 检查端口占用
    if check_port(8001):
        print("! 警告: 端口 8001 已被占用。后端可能启动失败。")
        print("  建议：请检查是否有旧的后端进程未关闭，或端口被其他程序占用。")
        
    if check_port(3000):
        print("! 提示: 端口 3000 已被占用。Vite 可能会自动切换到 3001 端口。")

    # 启动命令
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
    npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]
    
    processes = []
    
    try:
        print("\n[3/4] 正在启动服务...")
        
        # 启动后端
        print("  > 启动后端服务 (端口 8001)...")
        # 使用 shell=True 在 Windows 上能更好地处理命令行环境
        backend_proc = subprocess.Popen(backend_cmd, cwd=script_dir, shell=True)
        processes.append(backend_proc)
        
        # 启动前端
        print("  > 启动前端界面...")
        frontend_dir = os.path.join(script_dir, "frontend")
        frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir, shell=True)
        processes.append(frontend_proc)
        
        print("\n[4/4] 正在打开浏览器...")
        time.sleep(5) # 给服务一点启动时间
        
        # 注意：如果端口被占用，前端可能在 3001
        url = "http://localhost:3000"
        print(f"  > 尝试访问 {url}")
        webbrowser.open(url)
        
        print("\n------------------------------------------")
        print("系统已尝试启动！")
        print("如果浏览器没有自动打开或显示错误，请手动访问：")
        print("前端地址: http://localhost:3000 (或 3001/3002)")
        print("后端文档: http://localhost:8001/docs")
        print("------------------------------------------")
        print("按 Ctrl+C 停止所有服务。\n")

        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("! 后端进程已意外退出，退出代码:", backend_proc.returncode)
                break
            if frontend_proc.poll() is not None:
                print("! 前端进程已意外退出，退出代码:", frontend_proc.returncode)
                break
                
    except KeyboardInterrupt:
        print("\n正在停止服务...")
    except Exception as e:
        print(f"\n! 启动过程中发生错误: {e}")
    finally:
        for p in processes:
            if p.poll() is None:
                print(f"  > 正在关闭进程 {p.pid}...")
                p.terminate()
                try:
                    p.wait(timeout=3)
                except:
                    p.kill()
        print("服务已停止。")

if __name__ == "__main__":
    main()
