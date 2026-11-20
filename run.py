"""
Single-command launcher for VN Stock Pro (Backend FastAPI + Frontend Vite)
Usage:
    python run.py
"""

import os
import sys
import subprocess
import signal
import time

def find_python_executable():
    venv_py_win = os.path.join("backend", ".venv", "Scripts", "python.exe")
    venv_py_unix = os.path.join("backend", ".venv", "bin", "python")
    if os.path.exists(venv_py_win):
        return venv_py_win
    if os.path.exists(venv_py_unix):
        return venv_py_unix
    return sys.executable

def main():
    root_dir = os.path.abspath(os.path.dirname(__file__))
    os.chdir(root_dir)

    python_exe = find_python_executable()
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    print("=" * 70)
    print("  KHỞI ĐỘNG VN STOCK KLINECHART PRO (1 LỆNH DUY NHẤT)")
    print("  Backend API:  http://127.0.0.1:8000")
    print("  Frontend Web: http://localhost:5173")
    print("  Nhấn Ctrl+C để dừng cả 2 tiến trình.")
    print("=" * 70)

    # 1. Start Backend
    backend_cmd = [
        python_exe,
        "-m",
        "uvicorn",
        "main:app",
        "--reload",
        "--port",
        "8000",
        "--app-dir",
        "backend",
    ]
    print(f"[1/2] Đang khởi động Backend: {' '.join(backend_cmd)}")
    backend_proc = subprocess.Popen(backend_cmd)

    # 2. Start Frontend
    frontend_dir = os.path.join(root_dir, "frontend")
    frontend_cmd = [npm_cmd, "run", "dev"]
    print(f"[2/2] Đang khởi động Frontend: {' '.join(frontend_cmd)} (trong {frontend_dir})")
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

    print("\n>>> Hệ thống đã sẵn sàng! Mở trình duyệt tại: http://localhost:5173 <<<\n")

    def handle_exit(sig=None, frame=None):
        print("\nĐang dừng Backend và Frontend...")
        for proc in (frontend_proc, backend_proc):
            try:
                proc.terminate()
            except Exception:
                pass
        time.sleep(1)
        for proc in (frontend_proc, backend_proc):
            try:
                proc.kill()
            except Exception:
                pass
        print("Đã tắt xong toàn bộ.")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, handle_exit)

    try:
        while True:
            # Check if any process died unexpectedly
            if backend_proc.poll() is not None:
                print("Backend đã dừng.")
                break
            if frontend_proc.poll() is not None:
                print("Frontend đã dừng.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        handle_exit()

if __name__ == "__main__":
    main()
