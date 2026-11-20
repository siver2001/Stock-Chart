# VN Stock Pro — KLineChart Pro + 3 Custom TradingView Indicators + Backtest Engine

Ứng dụng phân tích kỹ thuật và backtest chứng khoán Việt Nam hoàn toàn miễn phí, không giới hạn số lượng chỉ báo.

## Tính năng chính
1. **Biểu đồ chuyên nghiệp (`KLineChart Pro`)**:
   - Tích hợp chuẩn **`klinecharts`** + **`@klinecharts/pro`**.
   - Timezone chuẩn Việt Nam: `'Asia/Ho_Chi_Minh'`.
   - Lưu trạng thái: Tự động ghi nhớ mã CP gần nhất, khung thời gian và theme vào `localStorage`.
   - Chế độ **Dark Mode** mặc định + Nút chuyển **Dark / Light** dịu mắt.
   - Thanh **Watchlist bên phải** (có thể ẩn/hiện): hiển thị sẵn `VNINDEX, VN30, FPT, HPG, VCB, SSI, MWG, TCB`, hỗ trợ thêm/xóa mã trực quan và click để đổi biểu đồ tức thì.

2. **3 chỉ báo open-source chuẩn xác 100% theo TradingView**:
   - **`CM_MACD_MTF`** (*ChrisMoody*): Signal dùng **SMA(9)**, Histogram 4 màu động lượng (`histA_IsUp`: `#00E676`, `histA_IsDown`: `#2962FF`, `histB_IsDown`: `#FF1744`, `histB_IsUp`: `#FF8A80`), đường MACD đổi màu xanh/đỏ (`#00C853` / `#D50000`), chấm tròn điểm giao cắt xanh/đỏ, trục 0 nét đứt, hỗ trợ MTF không lookahead.
   - **`ADX_DI`** (*BeikabuOyaji*): DI+ (`#00C853`), DI- (`#FF1744`) chuẩn Wilder, đường ADX (`#2979FF`, size 2) dùng **SMA(DX, 14)** thay vì RMA, kèm đường ngưỡng tham chiếu 20 (`#787B86` nét đứt).
   - **`WEIS_WAVE`** (*LazyBear*): Thuật toán cộng dồn volume theo sóng (`trendDetectionLength = 2`), định dạng số lớn `shouldFormatBigNumber: true` (dạng `1.5M`, `250K`), màu xanh `#00C853` (sóng tăng) và đỏ `#FF1744` (sóng giảm).

3. **Backend API đầy đủ chuẩn đặc tả**:
   - `GET /api/symbols?q={keyword}`: Trả về mảng `SymbolInfo` chuẩn KLineChart Pro.
   - `GET /api/history?symbol=FPT&interval=1D&from={ms}&to={ms}`: Trả về mảng nến lịch sử OHLCV Unix timestamp ms.
   - `GET /api/latest?symbol=FPT&interval=1D`: Cây nến mới nhất phục vụ polling / subscribe.
   - `POST /api/backtest`: API chạy kiểm thử chiến lược.

4. **Backtest Engine chuẩn TTCK Việt Nam**:
   - **Không Lookahead Bias**: Tín hiệu tính ở cuối nến `T`, khớp lệnh ở giá **Open nến `T+1`**.
   - **Luật TTCK VN**: Lô chẵn `100` cổ phiếu, quy định **T+2.5** (giữ tối thiểu 2 phiên mới được bán), phí mua `0.15%`, phí bán `0.15%`, thuế TNCN bán `0.1%`, trượt giá `0.1%`.
   - **Quản trị rủi ro**: Cắt lỗ (SL) & Chốt lời (TP) kiểm tra theo giá High/Low trong phiên.

---

## Cách chạy hệ thống trong 1 lệnh duy nhất (Unified Launcher)

Bạn có thể chạy cả **Backend (FastAPI)** và **Frontend (React Vite)** cùng lúc chỉ với **1 lệnh duy nhất**:

### Cách 1: Dùng lệnh `npm start` hoặc `python run.py` (Khuyên dùng)
```bash
# Chạy 1 lệnh khởi động cả Backend và Frontend:
python run.py
# hoặc
npm start
```

### Cách 2: Chạy file script launcher Windows
- Mở PowerShell:
  ```powershell
  .\start_windows.ps1
  ```
- Hoặc double-click vào file **`start.bat`**.

Sau khi chạy, mở trình duyệt tại: **http://localhost:5173** (API backend chạy tại: **http://127.0.0.1:8000**).

---

## Chạy Backtest qua dòng lệnh (CLI Backtester)
Để chạy kiểm thử nhanh hiệu suất chiến lược trên rổ cổ phiếu VN:
```bash
python backend/run_backtest_cli.py
```
Hoặc chạy unit test kiểm tra công thức 3 chỉ báo:
```bash
python backend/test_engine.py
```
