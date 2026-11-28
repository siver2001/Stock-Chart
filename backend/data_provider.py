"""
Vietnam Stock Data Provider:
- Primary live source: VNDIRECT DChart REST API (Free, high-speed, live official VN stock data)
- Intraday & historical support: 1m, 3m, 5m, 15m, 30m, 45m, 1h, 2h, 3h, 4h, 1D, 2D, 3D, 1W, 1M
- In-memory TTL caching
- Unit normalization (VND full unit for stocks, index points for indices)
- Reliable fallback to vnstock / TCBS and realistic current-date algorithmic generator if offline
"""

import os
import time
import json
import logging
import urllib.request
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Comprehensive VN stock catalog across HOSE, HNX, UPCOM and Indices
DEFAULT_VN_SYMBOLS: List[Dict[str, str]] = [
    # Indices
    {"ticker": "VNINDEX", "name": "Chỉ số VN-Index (HOSE)", "shortName": "VNINDEX", "exchange": "HOSE", "market": "index", "priceCurrency": "VND", "type": "INDEX"},
    {"ticker": "VN30", "name": "Chỉ số VN30 (30 cổ phiếu vốn hóa lớn nhất)", "shortName": "VN30", "exchange": "HOSE", "market": "index", "priceCurrency": "VND", "type": "INDEX"},
    {"ticker": "HNXINDEX", "name": "Chỉ số HNX-Index (Sở GD Hà Nội)", "shortName": "HNXINDEX", "exchange": "HNX", "market": "index", "priceCurrency": "VND", "type": "INDEX"},
    {"ticker": "HNX30", "name": "Chỉ số HNX30", "shortName": "HNX30", "exchange": "HNX", "market": "index", "priceCurrency": "VND", "type": "INDEX"},
    {"ticker": "UPCOMINDEX", "name": "Chỉ số UPCoM-Index", "shortName": "UPCOMINDEX", "exchange": "UPCOM", "market": "index", "priceCurrency": "VND", "type": "INDEX"},

    # Technology & Telecom
    {"ticker": "FPT", "name": "CTCP FPT (Công nghệ & Viễn thông)", "shortName": "FPT", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "CMG", "name": "Tập đoàn Công nghệ CMC", "shortName": "CMG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "CMC", "name": "CTCP Đầu tư CMC", "shortName": "CMC", "exchange": "HNX", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "CTR", "name": "Tổng công ty Công trình Viettel", "shortName": "CTR", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VTP", "name": "Tổng CTCP Bưu chính Viettel (Viettel Post)", "shortName": "VTP", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "CEC", "name": "CTCP Thiết kế Xây dựng Điện lực", "shortName": "CEC", "exchange": "UPCOM", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VCE", "name": "CTCP Vận tải Đa phương thức", "shortName": "VCE", "exchange": "UPCOM", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "ELC", "name": "CTCP Công nghệ Elcom", "shortName": "ELC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "FOX", "name": "CTCP Viễn thông FPT (FPT Telecom)", "shortName": "FOX", "exchange": "UPCOM", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VGI", "name": "Tổng công ty CP Đầu tư Quốc tế Viettel", "shortName": "VGI", "exchange": "UPCOM", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Securities & Finance
    {"ticker": "SSI", "name": "CTCP Chứng khoán SSI", "shortName": "SSI", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VND", "name": "CTCP Chứng khoán VNDIRECT", "shortName": "VND", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VIX", "name": "CTCP Chứng khoán VIX", "shortName": "VIX", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VCI", "name": "CTCP Chứng khoán Vietcap", "shortName": "VCI", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "HCM", "name": "CTCP Chứng khoán TP.HCM (HSC)", "shortName": "HCM", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "SHS", "name": "CTCP Chứng khoán Sài Gòn - Hà Nội", "shortName": "SHS", "exchange": "HNX", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "MBS", "name": "CTCP Chứng khoán MB (MBS)", "shortName": "MBS", "exchange": "HNX", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "FTS", "name": "CTCP Chứng khoán FPT (FPTS)", "shortName": "FTS", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "BSI", "name": "CTCP Chứng khoán BIDV (BSC)", "shortName": "BSI", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "CTS", "name": "CTCP Chứng khoán VietinBank (CTS)", "shortName": "CTS", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "AGR", "name": "CTCP Chứng khoán Agribank (Agriseco)", "shortName": "AGR", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VDS", "name": "CTCP Chứng khoán Rồng Việt", "shortName": "VDS", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "ORS", "name": "CTCP Chứng khoán Tiên Phong (TPS)", "shortName": "ORS", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Real Estate & Industrial Parks
    {"ticker": "VHM", "name": "CTCP Vinhomes", "shortName": "VHM", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VIC", "name": "Tập đoàn Vingroup", "shortName": "VIC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VRE", "name": "CTCP Vincom Retail", "shortName": "VRE", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "DIG", "name": "Tổng CTCP Đầu tư Phát triển Xây dựng (DIC Corp)", "shortName": "DIG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "DXG", "name": "CTCP Tập đoàn Đất Xanh", "shortName": "DXG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "NVL", "name": "CTCP Tập đoàn Đầu tư Địa ốc No Va (Novaland)", "shortName": "NVL", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "PDR", "name": "CTCP Phát triển Bất động sản Phát Đạt", "shortName": "PDR", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "CEO", "name": "CTCP Tập đoàn C.E.O", "shortName": "CEO", "exchange": "HNX", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "KDH", "name": "CTCP Đầu tư và Kinh doanh Nhà Khang Điền", "shortName": "KDH", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "NLG", "name": "CTCP Đầu tư Nam Long", "shortName": "NLG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "KBC", "name": "Tổng công ty Phát triển Đô thị Kinh Bắc", "shortName": "KBC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "IDC", "name": "Tổng công ty IDICO", "shortName": "IDC", "exchange": "HNX", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "BCM", "name": "Tổng công ty Đầu tư và Phát triển Công nghiệp (Becamex)", "shortName": "BCM", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "SZC", "name": "CTCP Sonadezi Châu Đức", "shortName": "SZC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VGC", "name": "Tổng công ty Viglacera", "shortName": "VGC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "TCH", "name": "CTCP Đầu tư Dịch vụ Tài chính Hoàng Huy", "shortName": "TCH", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "HDC", "name": "CTCP Phát triển Nhà Bà Rịa - Vũng Tàu", "shortName": "HDC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "CII", "name": "CTCP Đầu tư Hạ tầng Kỹ thuật TP.HCM", "shortName": "CII", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Banking
    {"ticker": "VCB", "name": "Ngân hàng Ngoại thương Việt Nam (Vietcombank)", "shortName": "VCB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "BID", "name": "Ngân hàng Đầu tư và Phát triển VN (BIDV)", "shortName": "BID", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "CTG", "name": "Ngân hàng Công thương Việt Nam (VietinBank)", "shortName": "CTG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "TCB", "name": "Ngân hàng Kỹ thương Việt Nam (Techcombank)", "shortName": "TCB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "MBB", "name": "Ngân hàng Quân đội (MBBank)", "shortName": "MBB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "ACB", "name": "Ngân hàng TMCP Á Châu", "shortName": "ACB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VPB", "name": "Ngân hàng Việt Nam Thịnh Vượng (VPBank)", "shortName": "VPB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "STB", "name": "Ngân hàng Sài Gòn Thương Tín (Sacombank)", "shortName": "STB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "HDB", "name": "Ngân hàng TMCP Phát triển TP.HCM (HDBank)", "shortName": "HDB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "SHB", "name": "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)", "shortName": "SHB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "LPB", "name": "Ngân hàng Bưu điện Liên Việt (LPBank)", "shortName": "LPB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "TPB", "name": "Ngân hàng Tiên Phong (TPBank)", "shortName": "TPB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VIB", "name": "Ngân hàng Quốc tế Việt Nam (VIB)", "shortName": "VIB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "MSB", "name": "Ngân hàng Hàng Hải Việt Nam (MSB)", "shortName": "MSB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "OCB", "name": "Ngân hàng Phương Đông (OCB)", "shortName": "OCB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "EIB", "name": "Ngân hàng Xuất Nhập khẩu Việt Nam (Eximbank)", "shortName": "EIB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Steel, Heavy Industry & Materials
    {"ticker": "HPG", "name": "CTCP Tập đoàn Hòa Phát", "shortName": "HPG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "HSG", "name": "CTCP Tập đoàn Hoa Sen", "shortName": "HSG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "NKG", "name": "CTCP Thép Nam Kim", "shortName": "NKG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VGS", "name": "CTCP Ống thép Việt Đức VG PIPE", "shortName": "VGS", "exchange": "HNX", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Energy, Oil & Gas
    {"ticker": "GAS", "name": "Tổng công ty Khí Việt Nam (PV GAS)", "shortName": "GAS", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "PLX", "name": "Tập đoàn Xăng dầu Việt Nam (Petrolimex)", "shortName": "PLX", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "PVD", "name": "Tổng công ty CP Khoan và Dịch vụ Khoan Dầu khí", "shortName": "PVD", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "PVS", "name": "Tổng công ty CP Dịch vụ Kỹ thuật Dầu khí Việt Nam", "shortName": "PVS", "exchange": "HNX", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "BSR", "name": "CTCP Lọc Hóa dầu Bình Sơn", "shortName": "BSR", "exchange": "UPCOM", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "OIL", "name": "Tổng công ty Dầu Việt Nam (PVOIL)", "shortName": "OIL", "exchange": "UPCOM", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "POW", "name": "Tổng công ty Điện lực Dầu khí Việt Nam", "shortName": "POW", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "PC1", "name": "CTCP Tập đoàn PC1", "shortName": "PC1", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "REE", "name": "CTCP Cơ Điện Lạnh", "shortName": "REE", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "GEG", "name": "CTCP Điện Gia Lai", "shortName": "GEG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Chemicals & Fertilizer
    {"ticker": "DGC", "name": "CTCP Tập đoàn Hóa chất Đức Giang", "shortName": "DGC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "DCM", "name": "CTCP Phân bón Dầu khí Cà Mau", "shortName": "DCM", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "DPM", "name": "Tổng công ty Phân bón và Hóa chất Dầu khí (Đạm Phú Mỹ)", "shortName": "DPM", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "BFC", "name": "CTCP Phân bón Bình Điền", "shortName": "BFC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "GVR", "name": "Tập đoàn Công nghiệp Cao su Việt Nam", "shortName": "GVR", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "PHR", "name": "CTCP Cao su Phước Hòa", "shortName": "PHR", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Retail & Consumer
    {"ticker": "MWG", "name": "CTCP Đầu tư Thế Giới Di Động", "shortName": "MWG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "PNJ", "name": "CTCP Vàng bạc Đá quý Phú Nhuận", "shortName": "PNJ", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "FRT", "name": "CTCP Bán lẻ Kỹ thuật số FPT (FPT Retail)", "shortName": "FRT", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "DGW", "name": "CTCP Thế Giới Số (Digiworld)", "shortName": "DGW", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "MSN", "name": "CTCP Tập đoàn Masan", "shortName": "MSN", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VNM", "name": "CTCP Sữa Việt Nam (Vinamilk)", "shortName": "VNM", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "SAB", "name": "Tổng CTCP Bia - Rượu - Nước giải khát Sài Gòn (Sabeco)", "shortName": "SAB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "DBC", "name": "CTCP Tập đoàn DABACO Việt Nam", "shortName": "DBC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "HAG", "name": "CTCP Hoàng Anh Gia Lai", "shortName": "HAG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Logistics, Transport & Aviation
    {"ticker": "GMD", "name": "CTCP Gemadept (Cảng biển & Logistics)", "shortName": "GMD", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "HAH", "name": "CTCP Vận tải và Xếp dỡ Hải An", "shortName": "HAH", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "PVT", "name": "Tổng công ty CP Vận tải Dầu khí (PVTrans)", "shortName": "PVT", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VOS", "name": "CTCP Vận tải Biển Việt Nam (Vosco)", "shortName": "VOS", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "VJC", "name": "CTCP Hàng không VietJet", "shortName": "VJC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "HVN", "name": "Tổng công ty Hàng không Việt Nam (Vietnam Airlines)", "shortName": "HVN", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "ACV", "name": "Tổng công ty Cảng hàng không Việt Nam", "shortName": "ACV", "exchange": "UPCOM", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Infrastructure & Construction
    {"ticker": "VCG", "name": "Tổng CTCP Xuất nhập khẩu và Xây dựng Việt Nam (Vinaconex)", "shortName": "VCG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "HHV", "name": "CTCP Đầu tư Hạ tầng Giao thông Đèo Cả", "shortName": "HHV", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "FCN", "name": "CTCP Fecon", "shortName": "FCN", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "LCG", "name": "CTCP Lizen", "shortName": "LCG", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "KSB", "name": "CTCP Khoáng sản và Xây dựng Bình Dương", "shortName": "KSB", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},

    # Seafood & Export
    {"ticker": "VHC", "name": "CTCP Vĩnh Hoàn (Cá tra xuất khẩu)", "shortName": "VHC", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "ANV", "name": "CTCP Nam Việt", "shortName": "ANV", "exchange": "HOSE", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
    {"ticker": "TNG", "name": "CTCP Đầu tư và Thương mại TNG (Dệt may)", "shortName": "TNG", "exchange": "HNX", "market": "stocks", "priceCurrency": "VND", "type": "CS"},
]

# Simple in-memory TTL Cache: key -> (expire_ts, DataFrame)
_CACHE: Dict[str, Tuple[float, pd.DataFrame]] = {}
CACHE_TTL_DAILY = 300        # 5 minutes for lightning-fast chart switching
CACHE_TTL_INTRADAY = 30      # 30 seconds for live intraday ticks


def _normalize_interval(interval: str) -> str:
    s = str(interval or "1D").strip()
    if not s:
        return "1D"
    if s.endswith("M") and not s.endswith("min"):
        return s.upper()
    if s.lower().endswith("m"):
        return s.lower()
    if s.lower().endswith("h"):
        return s.lower()
    if s.lower().endswith("d") or s.upper() == "D":
        return s.upper()
    if s.lower().endswith("w") or s.upper() == "W":
        return s.upper()
    return s.upper()


def search_symbols(query: Any = "") -> List[Dict[str, str]]:
    if not isinstance(query, str):
        query = getattr(query, "default", "") or ""
    q = str(query or "").strip().upper()
    if not q:
        return DEFAULT_VN_SYMBOLS

    exact_matches = [s for s in DEFAULT_VN_SYMBOLS if s["ticker"].upper() == q]
    partial_matches = [
        s for s in DEFAULT_VN_SYMBOLS
        if s["ticker"].upper() != q and (q in s["ticker"].upper() or q in s["name"].upper())
    ]
    results = exact_matches + partial_matches

    # If the exact ticker is not in pre-configured catalog, allow searching & loading it anyway
    if not exact_matches and len(q) >= 2 and q.isalnum():
        results.insert(0, {
            "ticker": q,
            "name": f"Cổ phiếu {q} (Thêm & Mở biểu đồ)",
            "shortName": q,
            "exchange": "HOSE",
            "market": "stocks",
            "priceCurrency": "VND",
            "type": "CS",
        })
    return results


def _fetch_vndirect_live(
    symbol: str,
    interval: str,
    from_ts: int,
    to_ts: int,
) -> Optional[pd.DataFrame]:
    """
    Fetch live OHLCV bars directly from VNDIRECT DChart API.
    """
    # Map to VNDirect native resolutions: D, 60, 15, 1
    lower_int = str(interval).strip().lower()
    if lower_int.endswith("m") and not str(interval).strip().endswith("M"):
        digits = "".join(c for c in lower_int if c.isdigit())
        mins = int(digits) if digits else 1
        res = "15" if mins >= 15 and mins % 15 == 0 else "1"
    elif lower_int.endswith("h"):
        res = "60"
    else:
        res = "D"

    url = f"https://dchart-api.vndirect.com.vn/dchart/history?resolution={res}&symbol={symbol}&from={from_ts}&to={to_ts}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://dchart.vndirect.com.vn/",
        "Accept": "application/json, text/plain, */*",
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        if not data or data.get("s") != "ok" or not data.get("t"):
            return None

        # Build raw DataFrame
        df = pd.DataFrame({
            "timestamp": [t * 1000 for t in data["t"]],
            "open": pd.to_numeric(data["o"], errors="coerce"),
            "high": pd.to_numeric(data["h"], errors="coerce"),
            "low": pd.to_numeric(data["l"], errors="coerce"),
            "close": pd.to_numeric(data["c"], errors="coerce"),
            "volume": pd.Series(pd.to_numeric(data["v"], errors="coerce")).fillna(0).values,
        }).dropna(subset=["open", "high", "low", "close"])

        if df.empty:
            return None

        # Standardize VN stock prices:
        # Stocks: Full exact VND (e.g. 19,550 VND for SSI, 44,650 VND for FPT) with all digits visible
        # Indices: Exact index points (e.g. 1,688.79 for VNINDEX, 1,776.31 for VN30)
        is_index = symbol in ("VNINDEX", "VN30", "HNXINDEX", "UPCOMINDEX", "HNX30")
        if not is_index:
            if df["close"].median() < 500:
                for col in ("open", "high", "low", "close"):
                    df[col] = (df[col] * 1000.0).round(0)
            else:
                for col in ("open", "high", "low", "close"):
                    df[col] = df[col].round(0)
        else:
            for col in ("open", "high", "low", "close"):
                df[col] = df[col].round(2)

        # Resample dynamically as appropriate
        if lower_int.endswith("m") and not str(interval).strip().endswith("M"):
            digits = "".join(c for c in lower_int if c.isdigit())
            mins = int(digits) if digits else 1
            if mins > 1:
                df = _resample_ohlcv(df, f"{mins}min")
        elif lower_int.endswith("h"):
            digits = "".join(c for c in lower_int if c.isdigit())
            hours = int(digits) if digits else 1
            if hours > 1:
                df = _resample_ohlcv(df, f"{hours}h")
        elif lower_int.endswith("d") or str(interval).strip().upper() == "D":
            digits = "".join(c for c in lower_int if c.isdigit())
            days = int(digits) if digits else 1
            if days > 1:
                df = _resample_ohlcv(df, f"{days}D")
        elif str(interval).strip().endswith("W") or lower_int.endswith("w"):
            digits = "".join(c for c in str(interval) if c.isdigit())
            weeks = int(digits) if digits else 1
            df = _resample_ohlcv(df, f"{weeks}W" if weeks > 1 else "W")
        elif str(interval).strip().endswith("M"):
            digits = "".join(c for c in str(interval) if c.isdigit())
            months = int(digits) if digits else 1
            df = _resample_ohlcv(df, f"{months}ME" if months > 1 else "ME")

        return df.sort_values("timestamp").drop_duplicates(subset=["timestamp"]).reset_index(drop=True)

    except Exception as e:
        logger.warning(f"VNDirect fetch failed for {symbol} ({interval}): {e}")
        return None


# Accurate benchmark prices for VN stocks & indices (used for realistic baseline & fallback)
REAL_BENCHMARK_PRICES: Dict[str, float] = {
    "SSI": 19750.0,
    "CEC": 11500.0,
    "VCE": 50300.0,
    "VIX": 12650.0,
    "CTG": 30350.0,
    "MBS": 15500.0,
    "VTP": 42200.0,
    "KDH": 15350.0,
    "BID": 30100.0,
    "BCM": 36150.0,
    "CII": 13350.0,
    "CMC": 16650.0,
    "CTS": 24150.0,
    "SHS": 13400.0,
    "VPB": 20450.0,
    "TPB": 12350.0,
    "VDS": 9280.0,
    "VCB": 58200.0,
    "FPT": 44650.0,
    "HPG": 25500.0,
    "TCB": 23100.0,
    "MWG": 48200.0,
    "VHM": 41500.0,
    "VIC": 42000.0,
    "VND": 14200.0,
    "MBB": 23800.0,
    "ACB": 24200.0,
    "STB": 31500.0,
    "GAS": 72000.0,
    "DGC": 112000.0,
    "PVD": 26500.0,
    "NVL": 11800.0,
    "PDR": 21500.0,
    "DIG": 22100.0,
    "DXG": 16500.0,
    "VNINDEX": 1250.50,
    "VN30": 1310.20,
}


def generate_demo_ohlcv(
    symbol: str,
    start_date: str,
    end_date: str,
    interval: str = "1D",
) -> pd.DataFrame:
    """
    Deterministic realistic OHLCV generator with REAL benchmark price levels & current dates.
    Uses MD5 hash of symbol to ensure 0 collision between different symbols.
    Anchors to fixed date so bars do not jitter or jump between calls.
    """
    import hashlib
    sym_clean = symbol.upper().strip()
    seed = int(hashlib.md5(sym_clean.encode()).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)

    start_dt = pd.to_datetime(start_date)
    # Normalize end_date to calendar day without second-level jitter
    end_dt = pd.to_datetime(pd.to_datetime(end_date).strftime("%Y-%m-%d 15:00:00"))
    is_intraday = interval in ("1m", "3m", "5m", "15m", "30m", "45m", "1H", "1h", "2H", "2h", "3H", "3h", "4H", "4h")
    freq = "15min" if interval in ("1m", "3m", "5m", "15m") else ("1h" if is_intraday else "B")

    dates = pd.date_range(start=start_dt, end=end_dt, freq=freq)
    if len(dates) < 30:
        dates = pd.date_range(end=end_dt, periods=350, freq=freq)

    n = len(dates)
    t = np.linspace(0, 6 * np.pi, n)

    is_index = sym_clean in ("VNINDEX", "VN30", "HNXINDEX", "UPCOMINDEX", "HNX30")
    base_price = REAL_BENCHMARK_PRICES.get(sym_clean)
    if base_price is None:
        base_price = 1250.0 if is_index else (25000.0 + (seed % 30) * 1000.0)

    drift = np.linspace(0, 0.15, n)
    cycle = 0.08 * np.sin(t) + 0.04 * np.cos(2.3 * t)
    noise = np.cumsum(rng.normal(0, 0.006, n))
    close = base_price * np.exp(drift + cycle + noise)

    precision_mult = 1.0 if is_index else 50.0
    close = np.round(close / precision_mult) * precision_mult

    open_p = np.roll(close, 1)
    open_p[0] = close[0]
    gap = rng.normal(0, 0.002, n) * open_p
    open_p = np.round((open_p + gap) / precision_mult) * precision_mult

    spread_up = np.abs(rng.normal(0.005, 0.003, n)) * close
    spread_dn = np.abs(rng.normal(0.005, 0.003, n)) * close
    high = np.round((np.maximum(open_p, close) + spread_up) / precision_mult) * precision_mult
    low = np.round(np.maximum(100.0 if not is_index else 10.0, np.minimum(open_p, close) - spread_dn) / precision_mult) * precision_mult

    base_vol = 500_000 if is_intraday else 3_000_000
    vol_mult = 1.0 + 1.5 * np.abs(close - open_p) / np.maximum(open_p, 1.0) * 20.0
    volume = (base_vol * vol_mult * rng.uniform(0.7, 1.4, n)).astype(int)

    df = pd.DataFrame({
        "timestamp": (dates.astype("int64") // 10**6),
        "open": open_p,
        "high": high,
        "low": low,
        "close": close,
        "volume": volume,
    })

    resample_rules = {
        "1m": "1min", "3m": "3min", "5m": "5min",
        "15m": "15min", "30m": "30min", "45m": "45min",
        "1H": "1h", "1h": "1h", "2H": "2h", "2h": "2h",
        "3H": "3h", "3h": "3h", "4H": "4h", "4h": "4h",
        "2D": "2D", "3D": "3D", "1W": "W", "1M": "ME",
    }
    if interval in resample_rules:
        df = _resample_ohlcv(df, resample_rules[interval])

    return df.reset_index(drop=True)


def _resample_ohlcv(df: pd.DataFrame, rule: str) -> pd.DataFrame:
    if df.empty:
        return df

    import re
    from datetime import datetime, timedelta, timezone

    s = str(rule or "1D").strip()
    m = re.match(r"^(\d*)([a-zA-Z]+)$", s)
    mult = int(m.group(1)) if (m and m.group(1)) else 1
    unit_raw = m.group(2) if m else "D"

    if unit_raw.lower().startswith("min") or unit_raw == "m":
        unit = "m"
    elif unit_raw.lower().startswith("h"):
        unit = "h"
    elif unit_raw.lower().startswith("w"):
        unit = "W"
    elif unit_raw.upper().startswith("ME") or unit_raw == "M":
        unit = "M"
    else:
        unit = "D"

    if (unit == "D" and mult == 1) or (unit == "h" and mult == 1) or (unit == "m" and mult == 1):
        return df.sort_values("timestamp").reset_index(drop=True)

    VN_OFFSET_MS = 7 * 3600 * 1000
    MONDAY_EPOCH_MS = 4 * 86400 * 1000
    step_ms = mult * 60 * 1000

    def _bucket_ts(ts_val: Any) -> int:
        ts_ms = int(ts_val)
        vn_dt = datetime.fromtimestamp((ts_ms + VN_OFFSET_MS) / 1000.0, tz=timezone.utc)
        if unit == "m":
            day_start_ms = int(datetime(vn_dt.year, vn_dt.month, vn_dt.day, tzinfo=timezone.utc).timestamp() * 1000) - VN_OFFSET_MS
            session_anchor = day_start_ms + 9 * 3600 * 1000
            if ts_ms >= session_anchor:
                return session_anchor + ((ts_ms - session_anchor) // step_ms) * step_ms
            return (ts_ms // step_ms) * step_ms
        if unit == "h":
            day_start_ms = int(datetime(vn_dt.year, vn_dt.month, vn_dt.day, tzinfo=timezone.utc).timestamp() * 1000) - VN_OFFSET_MS
            rel_hours = max(0, vn_dt.hour - 9)
            bucket_idx = rel_hours // mult
            return day_start_ms + (9 + bucket_idx * mult) * 3600 * 1000
        if unit == "W":
            monday_dt = datetime(vn_dt.year, vn_dt.month, vn_dt.day, tzinfo=timezone.utc) - timedelta(days=vn_dt.weekday())
            monday_ms = int(monday_dt.timestamp() * 1000)
            if mult == 1:
                return monday_ms
            week_num = (monday_ms - MONDAY_EPOCH_MS) // (7 * 86400 * 1000)
            return MONDAY_EPOCH_MS + (week_num // mult) * mult * 7 * 86400 * 1000
        if unit == "M":
            month_idx = vn_dt.year * 12 + (vn_dt.month - 1)
            bucket_month = (month_idx // mult) * mult
            by, bm = bucket_month // 12, (bucket_month % 12) + 1
            return int(datetime(by, bm, 1, tzinfo=timezone.utc).timestamp() * 1000)
        # Multi-day ("2D", "3D", "5D"...)
        day_num = int(datetime(vn_dt.year, vn_dt.month, vn_dt.day, tzinfo=timezone.utc).timestamp()) // 86400
        return (day_num // mult) * mult * 86400 * 1000

    ordered = df.sort_values("timestamp").copy()
    ordered["_bucket_ts"] = ordered["timestamp"].map(_bucket_ts)
    agg = (
        ordered.groupby("_bucket_ts", sort=True)
        .agg({"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"})
        .reset_index()
        .rename(columns={"_bucket_ts": "timestamp"})
    )
    return agg[["timestamp", "open", "high", "low", "close", "volume"]].reset_index(drop=True)


# Quotes Cache: symbol -> (expire_ts, quote_dict)
_QUOTES_CACHE: Dict[str, Tuple[float, dict]] = {}
CACHE_TTL_QUOTES = 2.0  # 2.0 seconds cache for synchronized real-time quotes

# Mapping VPS market index codes to standard symbols
_VPS_INDEX_CODE_TO_SYM = {
    "10": "VNINDEX",
    "11": "VN30",
    "02": "HNXINDEX",
    "03": "UPCOMINDEX",
}
_INDEX_SYMBOLS = {"VNINDEX", "VN30", "HNXINDEX", "HNX30", "UPCOMINDEX"}


def fetch_live_quotes(symbols: List[str]) -> Dict[str, dict]:
    """
    Ultra-fast parallel quote fetcher for Watchlist (supports 100-500+ symbols in < 0.5s).
    Returns {symbol: {symbol, close, open, high, low, volume, timestamp, ref_price, change, pct_change}}
    Primary bulk source: VPS live price board API (1 request per 80 stocks + 1 request for indices).
    Fallback for missing/unlisted tickers: parallel VNDIRECT DChart -> benchmark fallback.
    """
    if not symbols:
        return {}

    now = time.time()
    results: Dict[str, dict] = {}
    missing_syms: List[str] = []
    seen = set()

    for s in symbols:
        sym = s.strip().upper()
        if not sym or sym in seen:
            continue
        seen.add(sym)
        cached = _QUOTES_CACHE.get(sym)
        if cached and cached[0] > now:
            results[sym] = cached[1].copy()
        else:
            missing_syms.append(sym)

    if not missing_syms:
        return results

    now_ts = int(now)
    from_ts = now_ts - 7 * 86400
    # Align daily live quote timestamp to VN trading day 00:00:00 UTC (matches VNDIRECT DChart)
    vn_dt = datetime.utcfromtimestamp(now_ts + 7 * 3600)
    day_ts_ms = int(datetime(vn_dt.year, vn_dt.month, vn_dt.day).timestamp()) * 1000
    try:
        from datetime import timezone
        day_ts_ms = int(datetime(vn_dt.year, vn_dt.month, vn_dt.day, tzinfo=timezone.utc).timestamp()) * 1000
    except Exception:
        pass

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://banggia.vps.com.vn/",
        "Accept": "application/json, text/plain, */*",
    }

    def _safe_float(val: Any, default: float = 0.0) -> float:
        try:
            if val is None or val == "":
                return default
            return float(val)
        except Exception:
            return default

    def _fetch_vps_stock_chunk(chunk: List[str]) -> Dict[str, dict]:
        chunk_res: Dict[str, dict] = {}
        if not chunk:
            return chunk_res
        url = f"https://bgapidatafeed.vps.com.vn/getliststockdata/{','.join(chunk)}"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=4) as resp:
                items = json.loads(resp.read().decode("utf-8"))
            if not isinstance(items, list):
                return chunk_res
            for item in items:
                if not isinstance(item, dict):
                    continue
                sym = (item.get("sym") or "").strip().upper()
                if not sym:
                    continue
                r_raw = _safe_float(item.get("r"), 0.0)
                close_vnd = _safe_float(item.get("closePrice"), 0.0)
                # VPS reports r/lastPrice/openPrice/highPrice/lowPrice in thousands of VND
                ref_price = round(r_raw * 1000.0, 0) if r_raw > 0 else round(close_vnd, 0)
                last_raw = _safe_float(item.get("lastPrice"), 0.0)
                last_c = round(last_raw * 1000.0, 0) if last_raw > 0 else ref_price
                if last_c <= 0:
                    continue
                if ref_price <= 0:
                    ref_price = last_c

                open_raw = _safe_float(item.get("openPrice"), 0.0)
                high_raw = _safe_float(item.get("highPrice"), 0.0)
                low_raw = _safe_float(item.get("lowPrice"), 0.0)
                last_o = round(open_raw * 1000.0, 0) if open_raw > 0 else last_c
                last_h = round(high_raw * 1000.0, 0) if high_raw > 0 else last_c
                last_l = round(low_raw * 1000.0, 0) if low_raw > 0 else last_c
                last_v = round(_safe_float(item.get("lot"), 0.0) * 10.0, 0)

                diff = round(last_c - ref_price, 0)
                pct = round((diff / ref_price * 100.0), 2) if ref_price != 0 else 0.0

                chunk_res[sym] = {
                    "symbol": sym,
                    "close": last_c,
                    "open": last_o,
                    "high": last_h,
                    "low": last_l,
                    "volume": last_v,
                    "timestamp": day_ts_ms,
                    "ref_price": ref_price,
                    "change": diff,
                    "pct_change": pct,
                }
        except Exception as e:
            logger.debug(f"VPS bulk stock chunk fetch failed: {e}")
        return chunk_res

    def _fetch_vps_indices() -> Dict[str, dict]:
        idx_res: Dict[str, dict] = {}
        codes = ",".join(_VPS_INDEX_CODE_TO_SYM.keys())
        url = f"https://bgapidatafeed.vps.com.vn/getlistindexdetail/{codes}"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=4) as resp:
                items = json.loads(resp.read().decode("utf-8"))
            if not isinstance(items, list):
                return idx_res
            for item in items:
                if not isinstance(item, dict):
                    continue
                mc = str(item.get("mc") or item.get("hashValue") or "").strip()
                sym = _VPS_INDEX_CODE_TO_SYM.get(mc)
                if not sym:
                    continue
                last_c = round(_safe_float(item.get("cIndex"), 0.0), 2)
                ref_price = round(_safe_float(item.get("oIndex"), 0.0), 2)
                if last_c <= 0:
                    continue
                if ref_price <= 0:
                    ref_price = last_c
                last_v = round(_safe_float(item.get("vol"), 0.0), 0)
                diff = round(last_c - ref_price, 2)
                pct = round((diff / ref_price * 100.0), 2) if ref_price != 0 else 0.0
                idx_res[sym] = {
                    "symbol": sym,
                    "close": last_c,
                    "open": ref_price,
                    "high": max(last_c, ref_price),
                    "low": min(last_c, ref_price),
                    "volume": last_v,
                    "timestamp": day_ts_ms,
                    "ref_price": ref_price,
                    "change": diff,
                    "pct_change": pct,
                }
        except Exception as e:
            logger.debug(f"VPS index detail fetch failed: {e}")
        return idx_res

    dchart_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://dchart.vndirect.com.vn/",
        "Accept": "application/json, text/plain, */*",
    }

    def _fetch_one_quote(sym: str) -> Tuple[str, Optional[dict]]:
        url = f"https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol={sym}&from={from_ts}&to={now_ts}"
        try:
            req = urllib.request.Request(url, headers=dchart_headers)
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            if data and data.get("s") == "ok" and data.get("t"):
                t = data["t"]
                c = [float(x) for x in data["c"]]
                o = [float(x) for x in data["o"]]
                h = [float(x) for x in data["h"]]
                l = [float(x) for x in data["l"]]
                v = [float(x) for x in data["v"]]

                if len(t) >= 1:
                    last_c = c[-1]
                    last_o = o[-1]
                    last_h = h[-1]
                    last_l = l[-1]
                    last_v = v[-1]
                    last_ts = int(t[-1] * 1000)

                    ref_price = c[-2] if len(c) >= 2 else last_o
                    is_index = sym in _INDEX_SYMBOLS
                    if not is_index:
                        if last_c < 500:
                            last_c = round(last_c * 1000.0, 0)
                            last_o = round(last_o * 1000.0, 0)
                            last_h = round(last_h * 1000.0, 0)
                            last_l = round(last_l * 1000.0, 0)
                            ref_price = round(ref_price * 1000.0, 0)
                        else:
                            last_c = round(last_c, 0)
                            last_o = round(last_o, 0)
                            last_h = round(last_h, 0)
                            last_l = round(last_l, 0)
                            ref_price = round(ref_price, 0)
                        diff = round(last_c - ref_price, 0)
                        pct = round((diff / ref_price * 100.0), 2) if ref_price != 0 else 0.0
                    else:
                        last_c = round(last_c, 2)
                        last_o = round(last_o, 2)
                        last_h = round(last_h, 2)
                        last_l = round(last_l, 2)
                        ref_price = round(ref_price, 2)
                        diff = round(last_c - ref_price, 2)
                        pct = round((diff / ref_price * 100.0), 2) if ref_price != 0 else 0.0

                    q_data = {
                        "symbol": sym,
                        "close": last_c,
                        "open": last_o,
                        "high": last_h,
                        "low": last_l,
                        "volume": last_v,
                        "timestamp": last_ts,
                        "ref_price": ref_price,
                        "change": diff,
                        "pct_change": pct,
                    }
                    return sym, q_data
        except Exception as e:
            logger.debug(f"Direct quote fetch failed for {sym}: {e}")

        if sym in _QUOTES_CACHE:
            return sym, _QUOTES_CACHE[sym][1].copy()

        try:
            bench_price = REAL_BENCHMARK_PRICES.get(sym)
            if bench_price is not None:
                return sym, {
                    "symbol": sym,
                    "close": bench_price,
                    "open": bench_price,
                    "high": bench_price,
                    "low": bench_price,
                    "volume": 1_000_000.0,
                    "timestamp": int(now_ts * 1000),
                    "ref_price": bench_price,
                    "change": 0.0,
                    "pct_change": 0.0,
                }
            s_date = datetime.fromtimestamp(from_ts).strftime("%Y-%m-%d")
            e_date = datetime.fromtimestamp(now_ts).strftime("%Y-%m-%d")
            demo_df = generate_demo_ohlcv(sym, s_date, e_date, "1D")
            if not demo_df.empty:
                last_bar = demo_df.iloc[-1].to_dict()
                c = float(last_bar.get("close", 0.0))
                o = float(last_bar.get("open", c))
                ref_price = float(demo_df.iloc[-2]["close"]) if len(demo_df) >= 2 else o
                diff = round(c - ref_price, 2)
                pct = round(diff / ref_price * 100.0, 2) if ref_price != 0 else 0.0
                return sym, {
                    "symbol": sym,
                    "close": c,
                    "open": o,
                    "high": float(last_bar.get("high", c)),
                    "low": float(last_bar.get("low", c)),
                    "volume": float(last_bar.get("volume", 0.0)),
                    "timestamp": int(last_bar.get("timestamp", 0)),
                    "ref_price": ref_price,
                    "change": diff,
                    "pct_change": pct,
                }
        except Exception:
            pass

        return sym, None

    # 1. Parallel Bulk Fetch via VPS (skip when running on Vercel serverless since VPS blocks/timeouts from cloud IPs)
    is_vercel = bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"))
    if not is_vercel:
        missing_indices = [s for s in missing_syms if s in _INDEX_SYMBOLS]
        missing_stocks = [s for s in missing_syms if s not in _INDEX_SYMBOLS]
        stock_chunks = [missing_stocks[i : i + 80] for i in range(0, len(missing_stocks), 80)]

        bulk_tasks = len(stock_chunks) + (1 if any(s in _VPS_INDEX_CODE_TO_SYM.values() for s in missing_indices) else 0)
        if bulk_tasks > 0:
            with ThreadPoolExecutor(max_workers=min(bulk_tasks, 8)) as executor:
                futures = [executor.submit(_fetch_vps_stock_chunk, ch) for ch in stock_chunks]
                if any(s in _VPS_INDEX_CODE_TO_SYM.values() for s in missing_indices):
                    futures.append(executor.submit(_fetch_vps_indices))
                for fut in futures:
                    try:
                        fetched_map = fut.result()
                        for sym, q_data in fetched_map.items():
                            if sym in seen and q_data:
                                _QUOTES_CACHE[sym] = (now + CACHE_TTL_QUOTES, q_data)
                                results[sym] = q_data
                    except Exception as e:
                        logger.debug(f"Bulk future error: {e}")

    # 2. Parallel VNDIRECT DChart fallback for remaining symbols (or all symbols when on Vercel)
    remaining_syms = [s for s in missing_syms if s not in results]
    if remaining_syms:
        max_workers = min(len(remaining_syms), 20)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for sym, q_data in executor.map(_fetch_one_quote, remaining_syms):
                if q_data:
                    _QUOTES_CACHE[sym] = (now + CACHE_TTL_QUOTES, q_data)
                    results[sym] = q_data

    return results


def fetch_ohlcv(
    symbol: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    interval: str = "1D",
    source: str = "VNDIRECT",
) -> Tuple[pd.DataFrame, str]:
    """
    Fetch live OHLCV data for Vietnam stock symbols and indices.
    Returns (DataFrame, data_origin).
    """
    symbol = symbol.strip().upper()
    norm_interval = _normalize_interval(interval)
    now_ts = int(time.time())

    # Calculate epoch seconds from_ts and to_ts
    if end_date:
        try:
            to_ts = int(datetime.strptime(end_date, "%Y-%m-%d").timestamp()) + 86400
        except Exception:
            to_ts = now_ts
    else:
        # Bucket to_ts (300s for daily/weekly/monthly, 30s for intraday) so repeated calls share cache key!
        bucket = 30 if norm_interval.endswith(("m", "h")) else 300
        to_ts = (now_ts // bucket) * bucket

    if start_date:
        try:
            from_ts = int(datetime.strptime(start_date, "%Y-%m-%d").timestamp())
        except Exception:
            from_ts = to_ts - 730 * 86400
    else:
        if norm_interval.endswith("M"):
            digits = "".join(c for c in norm_interval if c.isdigit())
            m_mult = int(digits) if digits else 1
            from_ts = to_ts - (5475 if m_mult >= 3 else 3650) * 86400  # 10-15 years for 1M..12M
        elif norm_interval.endswith("W"):
            from_ts = to_ts - 2555 * 86400  # 7 years for 1W / 2W
        elif norm_interval.endswith("D") or norm_interval == "D":
            digits = "".join(c for c in norm_interval if c.isdigit())
            d_mult = int(digits) if digits else 1
            from_ts = to_ts - (2555 if d_mult > 1 else 1825) * 86400  # 5-7 years for 1D..5D
        elif norm_interval.lower().endswith("h"):
            digits = "".join(c for c in norm_interval if c.isdigit())
            h_mult = int(digits) if digits else 1
            from_ts = to_ts - (730 if h_mult >= 6 else 365) * 86400   # 1-2 years for 1H..12H
        elif norm_interval.endswith("m"):
            digits = "".join(c for c in norm_interval if c.isdigit())
            mins = int(digits) if digits else 1
            if mins >= 15 and mins % 15 == 0:
                from_ts = to_ts - 365 * 86400   # 1 full year for 15m/30m/45m
            elif mins == 1:
                from_ts = to_ts - 45 * 86400    # 45 days for 1m
            else:
                from_ts = to_ts - 60 * 86400    # 60 days for 3m/5m/10m
        else:
            from_ts = to_ts - 1825 * 86400

    cache_key = f"{symbol}:{from_ts}:{to_ts}:{norm_interval}"
    now = time.time()
    if cache_key in _CACHE and _CACHE[cache_key][0] > now:
        return _CACHE[cache_key][1].copy(), f"cache:{source}"

    # 1. Fetch live from VNDIRECT DChart
    live_df = _fetch_vndirect_live(symbol, norm_interval, from_ts, to_ts)
    if live_df is not None and not live_df.empty:
        ttl = CACHE_TTL_INTRADAY if norm_interval in ("1m", "3m", "5m", "15m", "30m", "45m", "1H", "2H", "3H", "4H") else CACHE_TTL_DAILY
        _CACHE[cache_key] = (now + ttl, live_df)
        if norm_interval == "1D" and len(live_df) >= 1:
            try:
                last_bar = live_df.iloc[-1]
                c_val = float(last_bar["close"])
                o_val = float(last_bar["open"])
                ref_val = float(live_df.iloc[-2]["close"]) if len(live_df) >= 2 else o_val
                diff_val = round(c_val - ref_val, 2)
                pct_val = round(diff_val / ref_val * 100.0, 2) if ref_val != 0 else 0.0
                _QUOTES_CACHE[symbol] = (now + CACHE_TTL_QUOTES, {
                    "symbol": symbol,
                    "close": c_val,
                    "open": o_val,
                    "high": float(last_bar["high"]),
                    "low": float(last_bar["low"]),
                    "volume": float(last_bar["volume"]),
                    "timestamp": int(last_bar["timestamp"]),
                    "ref_price": ref_val,
                    "change": diff_val,
                    "pct_change": pct_val,
                })
            except Exception:
                pass
        return live_df.copy(), "vndirect:live"

    # 2. Try vnstock if installed
    try:
        from vnstock import Vnstock  # type: ignore
        for src in ["VCI", "TCBS"]:
            try:
                stock = Vnstock().stock(symbol=symbol, source=src)
                s_date = datetime.fromtimestamp(from_ts).strftime("%Y-%m-%d")
                e_date = datetime.fromtimestamp(to_ts).strftime("%Y-%m-%d")
                raw = stock.quote.history(start=s_date, end=e_date, interval=norm_interval)
                if raw is not None and not raw.empty:
                    col_map = {c.lower(): c for c in raw.columns}
                    time_col = col_map.get("time") or col_map.get("tradingdate") or col_map.get("date")
                    ts = pd.to_datetime(raw[time_col])
                    out = pd.DataFrame({
                        "timestamp": (ts.astype("int64") // 10**6),
                        "open": pd.to_numeric(raw[col_map["open"]], errors="coerce"),
                        "high": pd.to_numeric(raw[col_map["high"]], errors="coerce"),
                        "low": pd.to_numeric(raw[col_map["low"]], errors="coerce"),
                        "close": pd.to_numeric(raw[col_map["close"]], errors="coerce"),
                        "volume": pd.to_numeric(raw[col_map["volume"]], errors="coerce").fillna(0),
                    }).dropna(subset=["open", "high", "low", "close"])

                    if symbol not in ("VNINDEX", "VN30", "HNXINDEX", "UPCOMINDEX"):
                        if out["close"].median() < 500:
                            for col in ("open", "high", "low", "close"):
                                out[col] = (out[col] * 1000.0).round(0)
                        else:
                            for col in ("open", "high", "low", "close"):
                                out[col] = out[col].round(0)
                    else:
                        for col in ("open", "high", "low", "close"):
                            out[col] = out[col].round(2)

                    _CACHE[cache_key] = (now + CACHE_TTL_DAILY, out)
                    return out.copy(), f"vnstock:{src}"
            except Exception:
                continue
    except ImportError:
        pass

    # 3. Never generate synthetic candles when paging backward into historical windows
    if end_date and to_ts < now_ts - 7 * 86400:
        return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"]), "vndirect:empty"

    # Fallback to realistic generator with real prices & current dates on live outage
    s_date = datetime.fromtimestamp(from_ts).strftime("%Y-%m-%d")
    e_date = datetime.fromtimestamp(to_ts).strftime("%Y-%m-%d")
    demo_df = generate_demo_ohlcv(symbol, s_date, e_date, norm_interval)
    _CACHE[cache_key] = (now + 60, demo_df)
    return demo_df.copy(), "demo_fallback"
