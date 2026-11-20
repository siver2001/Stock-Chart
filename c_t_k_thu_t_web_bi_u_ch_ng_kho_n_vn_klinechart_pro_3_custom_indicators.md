# Đặc tả Kỹ thuật: Ứng dụng Biểu đồ Chứng khoán Việt Nam (KLineChart Pro + 3 Custom Indicators)

Tài liệu này cung cấp đầy đủ thông tin kiến trúc, nguồn dữ liệu và công thức toán học chính xác để xây dựng một ứng dụng web theo dõi biểu đồ chứng khoán Việt Nam (giống TradingView), miễn phí, sử dụng **KLineChart + KLineChart Pro** và tích hợp sẵn **3 chỉ báo mã nguồn mở**:
1. **MacD Custom Indicator - Multiple Time Frame** *(ChrisMoody)*
2. **ADX and DI** *(BeikabuOyaji)*
3. **Weis Wave Volume** *(LazyBear)*

---

## 1. Kiến trúc hệ thống & Tech Stack

### 1.1. Tổng quan luồng dữ liệu
`[Browser: React + KLineChart Pro]` $\longleftrightarrow$ `[REST API / Polling: Python FastAPI]` $\longleftrightarrow$ `[vnstock Library (Dữ liệu thị trường VN)]`

### 1.2. Công nghệ đề xuất
* **Frontend:** React + TypeScript + Vite (hoặc Next.js).
  * Thư viện biểu đồ: `klinecharts` (v9/v10) và `@klinecharts/pro`.
  * Styling: Tailwind CSS (cho thanh Watchlist bên phải nếu cần).
* **Backend:** Python 3.10+ với **FastAPI** + `uvicorn`.
  * Thư viện dữ liệu VN: `vnstock` (bản mới nhất hỗ trợ lớp `Market()`).
  * Xử lý dữ liệu & cache: `pandas`, `cachetools` (TTL cache để tránh bị giới hạn tần suất gọi API từ nguồn dữ liệu).

### 1.3. Cấu trúc thư mục dự án
```text
vn-stock-chart/
├── backend/
│   ├── main.py                # FastAPI app, CORS, endpoints
│   ├── data_service.py        # Wrapper gọi vnstock, chuẩn hóa OHLCV & cache
│   └── requirements.txt       # fastapi, uvicorn, vnstock, pandas, cachetools
└── frontend/
    ├── package.json
    └── src/
        ├── App.tsx            # Layout chính (Chart + Watchlist mã VN)
        ├── datafeed/
        │   └── vnDatafeed.ts  # Implement interface Datafeed của KLineChart Pro
        └── indicators/
            ├── index.ts       # Hàm gọi registerIndicator cho cả 3 chỉ báo
            ├── cmMacdMtf.ts   # Chỉ báo 1: CM MACD Custom MTF
            ├── adxDi.ts       # Chỉ báo 2: ADX and DI (BeikabuOyaji)
            └── weisWave.ts    # Chỉ báo 3: Weis Wave Volume (LazyBear)
```

---

## 2. Đặc tả Backend (FastAPI + `vnstock`)

### 2.1. Các API Endpoints cần xây dựng
1. **`GET /api/symbols?q={keyword}`**
   * Trả về danh sách mã chứng khoán Việt Nam (HOSE, HNX, UPCOM, VNINDEX, VN30) khớp với từ khóa `q`.
   * Output JSON (khớp với `SymbolInfo` của KLineChart Pro):
     ```json
     [
       {
         "ticker": "FPT",
         "name": "CTCP FPT",
         "shortName": "FPT",
         "exchange": "HOSE",
         "market": "stocks",
         "priceCurrency": "VND",
         "type": "CS"
       }
     ]
     ```
2. **`GET /api/history?symbol=FPT&interval=1D&from={ms}&to={ms}`**
   * Lấy dữ liệu nến lịch sử OHLCV cho mã `symbol` theo khung `interval` trong khoảng thời gian `[from, to]` (định dạng Unix timestamp milliseconds).
   * Output JSON (khớp với `KLineData` của KLineChart):
     ```json
     [
       {
         "timestamp": 1728432000000,
         "open": 135.5,
         "high": 137.0,
         "low": 134.8,
         "close": 136.2,
         "volume": 3450200
       }
     ]
     ```
3. **`GET /api/latest?symbol=FPT&interval=1D`** *(tùy chọn cho cập nhật trong phiên)*
   * Trả về cây nến mới nhất để Frontend gọi định kỳ (polling mỗi 5–15 giây trong giờ giao dịch 09:00–15:00 giờ VN) qua callback `subscribe`.

### 2.2. Lưu ý kỹ thuật quan trọng với `vnstock`
* **Cú pháp `vnstock` mới:** Ưu tiên dùng lớp `Market()` (ví dụ `mkt = Market()`, truy vấn `.ohlcv(start=..., end=..., interval=...)`) thay vì lớp `Vnstock()` cũ đã ngừng hỗ trợ.
* **Ánh xạ khung thời gian (`Period` $\rightarrow$ `interval`):**
  * `{ multiplier: 1, timespan: 'minute' }` $\rightarrow$ `"1m"`
  * `{ multiplier: 5, timespan: 'minute' }` $\rightarrow$ `"5m"`
  * `{ multiplier: 15, timespan: 'minute' }` $\rightarrow$ `"15m"`
  * `{ multiplier: 30, timespan: 'minute' }` $\rightarrow$ `"30m"`
  * `{ multiplier: 1, timespan: 'hour' }` $\rightarrow$ `"1H"`
  * `{ multiplier: 1, timespan: 'day' }` $\rightarrow$ `"1D"`
  * `{ multiplier: 1, timespan: 'week' }` $\rightarrow$ `"1W"`
  * `{ multiplier: 1, timespan: 'month' }` $\rightarrow$ `"1M"`
* **Đơn vị giá & Thời gian:**
  * Cổ phiếu VN từ `vnstock` thường trả về đơn vị **nghìn đồng** (ví dụ `57.9` tương đương $57,900$ VND), trong khi chỉ số (`VNINDEX`, `VN30`) tính bằng điểm. Giữ nguyên đơn vị nghìn đồng để gọn trục Y (set `pricePrecision: 2`) hoặc nhân $1000$ đồng bộ cho cổ phiếu.
  * Chuyển cột `time` sang **Unix timestamp (milliseconds)** và sắp xếp tăng dần theo `timestamp`, loại bỏ bản ghi trùng lặp trước khi trả về KLineChart.
* **Caching:** Dùng `TTLCache` (ví dụ 60 giây cho khung ngày, 10 giây cho khung phút) để tránh bị rate-limit khi người dùng cuộn biểu đồ hoặc đổi mã liên tục.

---

## 3. Đặc tả Frontend (KLineChart + KLineChart Pro)

### 3.1. Implement `Datafeed` Interface
Trong `vnDatafeed.ts`, tạo class `VNStockDatafeed` implement đúng interface `Datafeed` của `@klinecharts/pro`:
```typescript
interface Datafeed {
  searchSymbols(search?: string): Promise<SymbolInfo[]>
  getHistoryKLineData(symbol: SymbolInfo, period: Period, from: number, to: number): Promise<KLineData[]>
  subscribe(symbol: SymbolInfo, period: Period, callback: DatafeedSubscribeCallback): void
  unsubscribe(symbol: SymbolInfo, period: Period): void
}
```

### 3.2. Khởi tạo `KLineChartPro` và đăng ký chỉ báo
* Gọi `registerIndicator(...)` từ `klinecharts` **trước** khi khởi tạo `new KLineChartPro({...})`.
* Khai báo tên 3 chỉ báo mới vào tùy chọn `subIndicators` của `KLineChartPro` (ví dụ: `['VOL', 'CM_MACD_MTF', 'ADX_DI', 'WEIS_WAVE', 'MACD', 'RSI']`) để người dùng bật/tắt trực tiếp trên thanh công cụ Indicators của KLineChart Pro.
* Cấu hình mặc định khi mở web:
  * `symbol`: `VNINDEX` hoặc `FPT`
  * `period`: `{ multiplier: 1, timespan: 'day', text: '1D' }`
  * `timezone`: `'Asia/Ho_Chi_Minh'`
  * Tự động tạo sẵn 3 sub-pane hiển thị 3 chỉ báo này (hoặc cho phép bật nhanh từ preset).

---

## 4. Đặc tả Thuật toán 3 Chỉ báo Custom (`registerIndicator`)

> **Yêu cầu chung cho AI khi code:** Toàn bộ 3 chỉ báo đều là **sub-indicator** (hiển thị ở khung phụ bên dưới biểu đồ nến). Phải đảm bảo tính toán chính xác theo đúng logic Pine Script gốc dưới đây, **không** thay thế bằng công thức mặc định của các thư viện khác nếu có sự sai khác.

---

### Chỉ báo 1: `CM_MACD_MTF` (MacD Custom Indicator - Multiple Time Frame by ChrisMoody)

#### A. Tham số đầu vào (`calcParams`)
* `fastLength`: mặc định `12`
* `slowLength`: mặc định `26`
* `signalLength`: mặc định `9`
* *(Tùy chọn MTF)* `mtfMultiplier`: mặc định `1` (bằng khung hiện tại; nếu $> 1$, ví dụ `5` hoặc khung lớn hơn, thực hiện gom nến / resample trước khi tính rồi ánh xạ lại theo từng cây nến gốc).

#### B. Công thức toán học (Chuẩn theo code gốc ChrisMoody)
Với chuỗi giá đóng cửa $C_t$:
1. Đường EMA nhanh và EMA chậm:
   $$\text{fastMA}_t = \text{EMA}(C, \text{fastLength})_t$$
   $$\text{slowMA}_t = \text{EMA}(C, \text{slowLength})_t$$
   *(Công thức EMA chuẩn với hệ số $\alpha = \frac{2}{N+1}$: $\text{EMA}_t = \alpha \cdot C_t + (1 - \alpha) \cdot \text{EMA}_{t-1}$).*
2. Đường MACD:
   $$\text{macd}_t = \text{fastMA}_t - \text{slowMA}_t$$
3. **Đường Signal (Lưu ý quan trọng):** Code gốc của ChrisMoody dùng **SMA** (Simple Moving Average), không phải EMA:
   $$\text{signal}_t = \text{SMA}(\text{macd}, \text{signalLength})_t = \frac{1}{N} \sum_{i=0}^{N-1} \text{macd}_{t-i}$$
4. Histogram:
   $$\text{hist}_t = \text{macd}_t - \text{signal}_t$$

#### C. Quy tắc hiển thị & Màu sắc (Vẽ bằng `figures` + `draw` trong KLineChart)
1. **Histogram 4 màu** (trục cơ sở `baseValue: 0`):
   * `histA_IsUp` ($\text{hist}_t > \text{hist}_{t-1}$ và $\text{hist}_t > 0$): **Xanh lá sáng** (`#00E676` / Aqua)
   * `histA_IsDown` ($\text{hist}_t < \text{hist}_{t-1}$ và $\text{hist}_t > 0$): **Xanh dương đậm / Xanh lá nhạt** (`#2962FF` hoặc `#81C784`)
   * `histB_IsDown` ($\text{hist}_t < \text{hist}_{t-1}$ và $\text{hist}_t \le 0$): **Đỏ đậm** (`#FF1744`)
   * `histB_IsUp` ($\text{hist}_t > \text{hist}_{t-1}$ và $\text{hist}_t \le 0$): **Đỏ nhạt / Nâu đỏ** (`#B71C1C` hoặc `#FF8A80`)
2. **Đường MACD đổi màu động:**
   * Nếu $\text{macd}_t \ge \text{signal}_t$: màu **Xanh lá** (`#00C853`).
   * Nếu $\text{macd}_t < \text{signal}_t$: màu **Đỏ** (`#D50000`).
3. **Đường Signal:** Màu **Vàng** (`#FFD600`).
4. **Chấm tròn giao cắt (Crossover/Crossunder Dot):**
   * Khi đường MACD cắt lên hoặc cắt xuống đường Signal (tức $(\text{macd}_{t-1} - \text{signal}_{t-1}) \times (\text{macd}_t - \text{signal}_t) \le 0$ và không đồng thời bằng 0):
   * Dùng hàm `draw()` của KLineChart để vẽ một hình tròn (`circle`) tại tọa độ `(x, y(signal_t))`, màu **Xanh lá** nếu cắt lên ($\text{macd}_t > \text{signal}_t$) và màu **Đỏ** nếu cắt xuống.
5. **Đường trục 0:** Vẽ đường ngang nét đứt tại mức $0$.

---

### Chỉ báo 2: `ADX_DI` (ADX and DI by BeikabuOyaji)

#### A. Tham số đầu vào (`calcParams`)
* `len`: mặc định `14`
* `th`: ngưỡng tham chiếu, mặc định `20`

#### B. Công thức toán học (Chuẩn theo code gốc BeikabuOyaji)
Với mỗi cây nến thứ $t$ có giá cao nhất $H_t$, thấp nhất $L_t$, đóng cửa $C_t$:
1. **True Range ($TR_t$):**
   $$TR_t = \max\left(H_t - L_t,\ |H_t - C_{t-1}|,\ |L_t - C_{t-1}|\right)$$
2. **Directional Movement ($+DM_t, -DM_t$):**
   $$+DM_t = \begin{cases} H_t - H_{t-1} & \text{nếu } (H_t - H_{t-1}) > (L_{t-1} - L_t) \text{ và } (H_t - H_{t-1}) > 0 \\ 0 & \text{ngược lại} \end{cases}$$
   $$-DM_t = \begin{cases} L_{t-1} - L_t & \text{nếu } (L_{t-1} - L_t) > (H_t - H_{t-1}) \text{ và } (L_{t-1} - L_t) > 0 \\ 0 & \text{ngược lại} \end{cases}$$
3. **Wilder's Smoothing (làm mượt theo chuẩn code gốc):**
   $$STR_t = STR_{t-1} - \frac{STR_{t-1}}{\text{len}} + TR_t$$
   $$S_{+DM,t} = S_{+DM,t-1} - \frac{S_{+DM,t-1}}{\text{len}} + (+DM_t)$$
   $$S_{-DM,t} = S_{-DM,t-1} - \frac{S_{-DM,t-1}}{\text{len}} + (-DM_t)$$
   *(Khởi tạo ban đầu tại $t = 0$ bằng chính giá trị hiện tại hoặc tổng $\text{len}$ phiên đầu tiên).*
4. **Chỉ số hướng ($+DI_t, -DI_t$) và $DX_t$:**
   $$+DI_t = \frac{S_{+DM,t}}{STR_t} \times 100, \qquad -DI_t = \frac{S_{-DM,t}}{STR_t} \times 100$$
   $$DX_t = \frac{|(+DI_t) - (-DI_t)|}{(+DI_t) + (-DI_t)} \times 100$$
   *(Xử lý chia cho 0: nếu mẫu số bằng 0 thì kết quả bằng 0).*
5. **Đường ADX (Lưu ý sống còn để khớp TradingView):**
   * Tác giả `BeikabuOyaji` dùng **SMA** của $DX$, **KHÔNG** dùng RMA/Wilder smoothing:
   $$ADX_t = \text{SMA}(DX, \text{len})_t = \frac{1}{\text{len}} \sum_{i=0}^{\text{len}-1} DX_{t-i}$$

#### C. Quy tắc hiển thị & Màu sắc
* Đường **`+DI`**: màu **Xanh lá** (`#00C853`), nét liền.
* Đường **`-DI`**: màu **Đỏ** (`#FF1744`), nét liền.
* Đường **`ADX`**: màu **Xanh dương / Trắng** (`#2979FF` hoặc `#FFFFFF` trên nền tối), độ dày nét lớn hơn (`size: 2`).
* Đường ngưỡng **`th` (`20`)**: vẽ đường ngang nét đứt màu xám (`#787B86`) tại giá trị `th`.

---

### Chỉ báo 3: `WEIS_WAVE` (Indicator: Weis Wave Volume by LazyBear)

#### A. Tham số đầu vào (`calcParams`)
* `trendDetectionLength`: mặc định `2` (số nến liên tiếp đóng cửa cùng chiều để xác nhận đảo chiều sóng).
* `showDistributionBelowZero`: mặc định `0` (`0` = `false`: vẽ tất cả cột ở phía dương; `1` = `true`: vẽ cột sóng giảm ở phía âm dưới trục 0).

#### B. Công thức toán học (Chuẩn theo code gốc LazyBear)
Với giá đóng cửa $C_t$ và khối lượng $V_t$:
1. **Hướng di chuyển từng cây nến ($\text{mov}_t$):**
   $$\text{mov}_t = \begin{cases} 1 & \text{nếu } C_t > C_{t-1} \\ -1 & \text{nếu } C_t < C_{t-1} \\ 0 & \text{nếu } C_t = C_{t-1} \end{cases}$$
2. **Xu hướng tức thời ($\text{trend}_t$):**
   $$\text{trend}_t = \begin{cases} \text{mov}_t & \text{nếu } \text{mov}_t \ne 0 \text{ và } \text{mov}_t \ne \text{mov}_{t-1} \\ \text{trend}_{t-1} & \text{ngược lại} \end{cases}$$
   *(Tại $t=0$, khởi tạo $\text{trend}_0 = 1$ hoặc $0$).*
3. **Kiểm tra chuỗi nến cùng chiều ($\text{isTrending}_t$):**
   * Tính số nến liên tiếp (tính cả nến hiện tại) mà giá đóng cửa đi cùng chiều với hướng tăng hoặc giảm.
   * Cụ thể trong Pine Script gốc: `isTrending = rising(close, trendDetectionLength) or falling(close, trendDetectionLength)` — tức $C_t > C_{t-1} > \dots > C_{t-L}$ hoặc $C_t < C_{t-1} < \dots < C_{t-L}$ với $L = \text{trendDetectionLength}$.
4. **Hướng sóng chính thức ($\text{wave}_t$):**
   $$\text{wave}_t = \begin{cases} \text{trend}_t & \text{nếu } \text{trend}_t \ne \text{wave}_{t-1} \text{ và } \text{isTrending}_t = \text{true} \\ \text{wave}_{t-1} & \text{ngược lại} \end{cases}$$
5. **Khối lượng sóng cộng dồn ($\text{vol}_t$):**
   $$\text{vol}_t = \begin{cases} \text{vol}_{t-1} + V_t & \text{nếu } \text{wave}_t = \text{wave}_{t-1} \\ V_t & \text{nếu } \text{wave}_t \ne \text{wave}_{t-1} \end{cases}$$
6. **Giá trị cột hiển thị:**
   * Nếu `showDistributionBelowZero == 1` và $\text{wave}_t = -1$: giá trị vẽ là $-\text{vol}_t$.
   * Ngược lại: giá trị vẽ là $+\text{vol}_t$.

#### C. Quy tắc hiển thị & Màu sắc
* Kiểu vẽ: Histogram cột (`bar`), `baseValue: 0`, bật `shouldFormatBigNumber: true` (để hiển thị gọn dạng `1.5M`, `250K`).
* **Màu sắc:**
  * Sóng tăng ($\text{wave}_t = 1$): **Xanh lá** (`#26A69A` / `#00C853`).
  * Sóng giảm ($\text{wave}_t = -1$): **Đỏ** (`#EF5350` / `#FF1744`).

---

## 5. Yêu cầu UI/UX bổ sung (Để trải nghiệm giống TradingView)

1. **Thanh Watchlist bên phải (có thể ẩn/hiện):**
   * Hiển thị sẵn một số mã tiêu biểu của VN (`VNINDEX`, `VN30`, `FPT`, `HPG`, `VCB`, `SSI`, `MWG`, `TCB`).
   * Cho phép người dùng tự thêm/xóa mã vào Watchlist và lưu xuống `localStorage`.
   * Bấm vào mã trên Watchlist sẽ gọi `chart.setSymbol(...)` để đổi biểu đồ ngay lập tức.
2. **Dark Mode mặc định:** Giao diện nền tối (`theme: 'dark'`) dịu mắt khi phân tích kỹ thuật, có nút chuyển Dark/Light.
3. **Lưu trạng thái:** Tự động lưu mã đang xem gần nhất và khung thời gian vào `localStorage`.

---

## 6. Hướng dẫn Prompt cho AI triển khai theo từng bước

Khi đưa file `.md` này cho AI lập trình (Cursor, Claude Code, v.v.), bạn nên chia thành **3 bước nhỏ** để đảm bảo code chạy sạch và không bị lỗi:

* **Bước 1 (Backend):** *"Đọc mục 1 và mục 2 của file `VN_Stock_KLineChart_Spec.md`. Hãy tạo thư mục `backend/` với FastAPI và `vnstock`, viết đầy đủ các endpoint `/api/symbols`, `/api/history`, `/api/latest` có kèm TTL cache và test thử lấy dữ liệu mã `FPT` khung `1D`."*
* **Bước 2 (Frontend + Datafeed):** *"Đọc mục 3 và mục 5 của file `VN_Stock_KLineChart_Spec.md`. Khởi tạo dự án Vite + React + TypeScript trong `frontend/`, cài `klinecharts` và `@klinecharts/pro`, viết `vnDatafeed.ts` kết nối với Backend ở Bước 1 và dựng giao diện có Watchlist."*
* **Bước 3 (3 Custom Indicators):** *"Đọc kỹ mục 4 của file `VN_Stock_KLineChart_Spec.md`. Viết 3 file chỉ báo `cmMacdMtf.ts`, `adxDi.ts`, `weisWave.ts` dùng `registerIndicator` của KLineChart tuân thủ tuyệt đối công thức toán học và màu sắc đã mô tả (đặc biệt lưu ý SMA ở Signal của MACD và SMA ở ADX), sau đó đăng ký vào KLineChart Pro."*