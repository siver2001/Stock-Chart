-- ==============================================================================
-- BẢNG DỮ LIỆU ĐỒNG BỘ CLOUD CHO VN STOCK PRO (CHẾ ĐỘ ANONYMOUS DEVICE ID)
-- Hướng dẫn: Copy toàn bộ nội dung file này, vào Supabase Dashboard -> SQL Editor
-- và bấm "RUN" (chỉ mất ~5 giây).
-- ==============================================================================

-- 1. Bảng lưu trữ nét vẽ phân tích kỹ thuật (Trendline, Fibonacci, Kênh giá, Box...)
CREATE TABLE IF NOT EXISTS public.chart_drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(64) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    overlays JSONB NOT NULL DEFAULT '[]'::jsonb,
    drawings_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_device_symbol UNIQUE(device_id, symbol)
);

-- Index tăng tốc truy vấn theo mã cổ phiếu và thiết bị
CREATE INDEX IF NOT EXISTS idx_drawings_symbol ON public.chart_drawings(symbol);
CREATE INDEX IF NOT EXISTS idx_drawings_device_id ON public.chart_drawings(device_id);

-- 2. Bảng lưu danh mục theo dõi (Watchlist) & cờ màu đánh dấu
CREATE TABLE IF NOT EXISTS public.user_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(64) NOT NULL,
    watchlist_name VARCHAR(50) DEFAULT 'default',
    symbols JSONB NOT NULL DEFAULT '["VNINDEX", "VN30", "FPT", "HPG", "VCB", "SSI", "MWG", "TCB"]'::jsonb,
    flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_device_watchlist UNIQUE(device_id, watchlist_name)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_device_id ON public.user_watchlists(device_id);

-- 3. Bảng lưu cấu hình biểu đồ cá nhân (Theme, chu kỳ ưa thích, chỉ báo)
CREATE TABLE IF NOT EXISTS public.user_chart_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(64) NOT NULL,
    theme VARCHAR(10) DEFAULT 'dark',
    chart_type VARCHAR(20) DEFAULT 'candle_solid',
    favorite_periods JSONB DEFAULT '["1m", "5m", "15m", "1H", "1D", "1W"]'::jsonb,
    active_indicators JSONB DEFAULT '["MA", "VOL"]'::jsonb,
    indicator_params JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_device_settings UNIQUE(device_id)
);

CREATE INDEX IF NOT EXISTS idx_settings_device_id ON public.user_chart_settings(device_id);

-- ==============================================================================
-- BẢO MẬT: Bật Row Level Security (RLS) với quyền truy cập ẩn danh (Anon Key)
-- ==============================================================================
ALTER TABLE public.chart_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chart_settings ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc / ghi / sửa / xóa thông qua anon key (dựa vào device_id)
DROP POLICY IF EXISTS "Anon Access Chart Drawings" ON public.chart_drawings;
CREATE POLICY "Anon Access Chart Drawings" ON public.chart_drawings
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Access User Watchlists" ON public.user_watchlists;
CREATE POLICY "Anon Access User Watchlists" ON public.user_watchlists
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Access User Settings" ON public.user_chart_settings;
CREATE POLICY "Anon Access User Settings" ON public.user_chart_settings
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);
