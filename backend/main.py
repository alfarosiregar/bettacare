import io
import os
import time
import logging
import threading
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
import cv2
import json
import urllib.request
import urllib.error
import numpy as np
import base64
import tempfile
from collections import defaultdict, deque
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
try:
    # pyrefly: ignore [missing-import]
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Manual fallback for .env
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    k, v = line.strip().split('=', 1)
                    os.environ[k] = v
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from skimage.feature import graycomatrix, graycoprops

# ── Logging terstruktur (pengganti print) ─────────────────────────────
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("betta")

# ── Konfigurasi via environment ───────────────────────────────────────
MAX_UPLOAD_MB = float(os.environ.get("MAX_UPLOAD_MB", "10"))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)
ALLOWED_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".dng")
OOD_THRESHOLD = float(os.environ.get("OOD_THRESHOLD", "0.63"))
# Ambang keputusan kelas (probabilitas SEHAT dari model sigmoid, 0-1).
# 0.80: kalibrasi pada 226 foto dataset (Okt 2026) — recall TIDAK_SEHAT
# 100% (0/48 foto sakit lolos; ambang lama 0.5 hanya 70.8%). Biayanya
# 13.5% ikan sehat ikut terklasifikasi sakit (24/178) — dapat diterima
# untuk aplikasi kesehatan, di mana ikan sakit yang lolos (false negative)
# lebih berbahaya daripada ikan sehat yang ikut "tersangka".
# Alternatif via env tanpa retraining:
#   HEALTH_THRESHOLD=0.70  (recall sakit 91.7%, salah tuduh 7.3%)
#   HEALTH_THRESHOLD=0.50  (perilaku lama; recall sakit hanya 70.8%)
HEALTH_THRESHOLD = float(os.environ.get("HEALTH_THRESHOLD", "0.80"))
# HATI-HATI: center-crop inference TERBUKTI MEMBURUK di eksperimen
# (recall TIDAK SEHAT 95.8% -> 70.8%) karena penyakit dominan adalah busuk
# sirip, dan sirip berada di tepi gambar — justru terpotong oleh crop.
# Solusi yang benar: retraining dengan augmentasi random-scale di train_model.py
# (sudah ditambahkan). Fitur ini disediakan hanya untuk eksperimen.
CENTER_CROP_FRACTION = float(os.environ.get("INFERENCE_CENTER_CROP", "1.0"))
GROQ_MODEL = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")

try:
    import tensorflow as tf
    # pyrefly: ignore [missing-import]
    from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input

    MODEL_PATH = os.path.join(os.path.dirname(__file__), "betta_model.h5")
    if os.path.exists(MODEL_PATH):
        # Lambda layer 'preprocess_input' tertanam di arsitektur model;
        # sediakan fungsi tersebut via custom_objects agar load berhasil.
        real_model = tf.keras.models.load_model(
            MODEL_PATH,
            custom_objects={"preprocess_input": preprocess_input},
            safe_mode=False,
            compile=False,
        )
        logger.info("TensorFlow model loaded successfully.")
    else:
        real_model = None
        logger.warning("Model file not found.")

    # Load MobileNetV2 sebagai feature extractor untuk OOD detection
    logger.info("Loading MobileNetV2 for object verification...")
    verifier_model = MobileNetV2(weights='imagenet')
    _feat_model = tf.keras.Model(inputs=verifier_model.input, outputs=verifier_model.layers[-2].output)
    logger.info("MobileNetV2 loaded successfully.")

    # Reference embedding ikan (rata-rata embedding seluruh dataset) untuk OOD detection
    REF_EMB_PATH = os.path.join(os.path.dirname(__file__), "fish_reference_emb.npy")
    if os.path.exists(REF_EMB_PATH):
        fish_reference_emb = np.load(REF_EMB_PATH)
        fish_reference_emb = fish_reference_emb / (np.linalg.norm(fish_reference_emb) + 1e-9)
        logger.info("Fish reference embedding loaded.")
    else:
        fish_reference_emb = None
        logger.warning("Fish reference embedding not found; OOD check akan pass-through.")

    # Peta kelas ImageNet → apakah kelas termasuk HEWAN. Dipakai sebagai
    # sinyal ke-2 OOD: foto ikan asli kadang jauh dari centroid dataset
    # (framing/latar/pencahayaan), tapi MobileNetV2 tetap mengenali ada
    # hewan di frame — tidak boleh ditolak sebagai "BUKAN IKAN CUPANG".
    ANIMAL_MAP_PATH = os.path.join(os.path.dirname(__file__), "imagenet_animal.json")
    if os.path.exists(ANIMAL_MAP_PATH):
        with open(ANIMAL_MAP_PATH) as _f:
            _animal_map = json.load(_f)
        _imagenet_labels = _animal_map["labels"]
        _imagenet_is_animal = np.array(_animal_map["animal"], dtype=bool)
        logger.info("ImageNet animal-class map loaded (%d/%d kelas hewan).", int(_imagenet_is_animal.sum()), len(_imagenet_is_animal))
    else:
        _imagenet_labels = None
        _imagenet_is_animal = None
        logger.warning("imagenet_animal.json tidak ada; OOD hanya memakai sinyal similarity.")
    # Kalibrasi pada dataset: ikan min sim=0.684, junk sintetis max sim=0.418
    # (bisa di-override via env OOD_THRESHOLD)

    # Keras .predict() tidak thread-safe; kunci agar inferensi bersamaan aman
    _inference_lock = threading.Lock()

except ImportError:
    real_model = None
    verifier_model = None
    _feat_model = None
    fish_reference_emb = None
    _imagenet_labels = None
    _imagenet_is_animal = None
    _inference_lock = threading.Lock()
    logger.warning("TensorFlow not installed.")

app = FastAPI(title="BettaCare Health Classifier API")

# ── CORS: origin harus di-whitelist via env di produksi ──────────────
# Contoh: ALLOWED_ORIGINS="http://localhost:19006,https://app.example.com"
_origins_env = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
if _origins_env:
    _allow_credentials = True
    _allow_origins = _origins_env
else:
    # Mode development: wildcard TANPA credentials (kombinasi "*" + credentials
    # tidak valid menurut spesifikasi CORS dan berbahaya di produksi).
    _allow_credentials = False
    _allow_origins = ["*"]
    logger.warning("ALLOWED_ORIGINS tidak di-set; CORS terbuka tanpa credentials (DEV ONLY).")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Rate limiter sederhana (sliding window, in-memory, per-IP) ────────
class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_prune = time.monotonic()

    def check(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            self._prune_if_needed(now)
            q = self._hits[key]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.max_requests:
                return False
            q.append(now)
            return True

    def _prune_if_needed(self, now: float) -> None:
        # Cegah kebocoran memori: buang entri kosong/stale secara berkala
        if now - self._last_prune < 300:
            return
        self._last_prune = now
        stale = [k for k, q in self._hits.items() if not q or now - q[-1] > self.window]
        for k in stale:
            del self._hits[k]

# /predict: 30 request/menit per IP — /analyze_features: 10/menit per IP
PREDICT_LIMITER = SlidingWindowRateLimiter(
    int(os.environ.get("RATE_LIMIT_PREDICT", "30")), 60
)
ANALYZE_LIMITER = SlidingWindowRateLimiter(
    int(os.environ.get("RATE_LIMIT_ANALYZE", "10")), 60
)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def _sniff_image_ext(contents: bytes, filename: str) -> str | None:
    """Deteksi format gambar dari magic bytes.

    Ekstensi & Content-Type dari client bisa hilang atau salah (tergantung
    OS/plugin yang mengirim), sedangkan isi file tidak bisa bohong.
    """
    if contents[:3] == b"\xff\xd8\xff":
        return ".jpg"  # JPEG
    if contents[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"  # PNG
    if contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return ".webp"  # WebP
    if contents[4:8] == b"ftyp" and contents[8:12] in (
        b"heic", b"heix", b"mif1", b"msf1", b"hevc", b"heim", b"heis",
    ):
        return ".heic"  # HEIC/HEIF (ISO BMFF)
    if contents[:4] in (b"II*\x00", b"MM\x00*"):
        # TIFF: hanya diperlakukan sebagai DNG bila nama file menyebut .dng
        return ".dng" if filename.endswith(".dng") else None
    return None


def _read_upload(file: UploadFile) -> tuple[bytes, str]:
    """Validasi ukuran & tipe file upload; kembalikan (isi, filename efektif)."""
    filename = (file.filename or "").lower()
    content_type = file.content_type or ""

    if file.size is not None and file.size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Ukuran file melebihi {MAX_UPLOAD_MB:g} MB.")

    contents = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Ukuran file melebihi {MAX_UPLOAD_MB:g} MB.")
    if not contents:
        raise HTTPException(status_code=400, detail="File kosong.")

    # PENTING: sebagian client mobile (mis. FileSystem.uploadAsync di Android)
    # mengambil nama file multipart dari basename URI cache yang bisa TANPA
    # ekstensi, dan content-type bisa terlewat. Karena itu format divalidasi
    # dari isi file (magic bytes), bukan sekadar nama/ekstensi yang terkirim.
    sniffed = _sniff_image_ext(contents, filename)
    if sniffed is not None:
        if not filename.endswith(ALLOWED_EXTENSIONS):
            # Perbaiki nama agar pipeline decode (cv2/rawpy/pillow_heif)
            # tahu formatnya; isi file tidak diubah sama sekali.
            filename = "upload" + sniffed
        return contents, filename

    # Isi file tidak dikenali sebagai format yang didukung. Bila client
    # mengaku mengirim gambar (ekstensi & content-type valid), biarkan
    # melewati — decode akan gagal dengan pesan "gambar rusak" (400).
    ext_ok = filename.endswith(ALLOWED_EXTENSIONS)
    ct_ok = content_type.startswith("image/") or content_type == "application/octet-stream"
    if ext_ok and ct_ok:
        return contents, filename

    raise HTTPException(
        status_code=415,
        detail=(
            "Format file tidak didukung. Gunakan: "
            f"{', '.join(ALLOWED_EXTENSIONS)} "
            f"(diterima: filename='{filename or '(kosong)'}', "
            f"content-type='{content_type or '(kosong)'}')"
        ),
    )


class PredictBase64Request(BaseModel):
    """Body untuk /predict_base64 (transport JSON — bypass masalah native
    uploadAsync di Expo Go/Android yang gagal membaca file cache kamera)."""
    image: str
    mime_type: str | None = None
    filename: str | None = None


def _run_prediction_pipeline(contents: bytes, filename: str) -> dict:
    """Pipeline prediksi lengkap: decode → OOD → klasifikasi → fitur.

    Dipakai bersama oleh /predict (multipart) dan /predict_base64 (JSON)
    agar kedua transport selalu menghasilkan hasil identik.
    """
    _t_start = time.monotonic()  # untuk meta.latency_ms
    img = _load_image(contents, filename)

    # 2. Preprocessing
    # Kurangi latar akuarium di sekeliling ikan (lihat CENTER_CROP_FRACTION)
    img = _center_crop(img, CENTER_CROP_FRACTION)

    # Resize to standardized dimension (224x224)
    resized_img = cv2.resize(img, (224, 224))

    # Convert to Grayscale for GLCM
    gray_img = cv2.cvtColor(resized_img, cv2.COLOR_BGR2GRAY)

    # Convert to RGB (OpenCV uses BGR by default)
    rgb_img = cv2.cvtColor(resized_img, cv2.COLOR_BGR2RGB)

    # === Verifikasi Objek: OOD dua sinyal ===
    # Sinyal 1 — Embedding similarity: kemiripan kosinus embedding MobileNetV2
    #   (avg-pool 1280-d) gambar vs rata-rata embedding dataset ikan.
    #   Kalibrasi dataset: foto ikan min=0.694, junk sintetis max=0.418.
    # Sinyal 2 — Animal detection: top-k kelas ImageNet penuh; bila ADA hewan
    #   dikenali, gambar TIDAK ditolak walau similarity rendah (foto ikan asli
    #   bisa jauh dari centroid dataset karena framing/latar/pencahayaan).
    # Keputusan: tolak hanya bila sim < threshold DAN tidak ada hewan →
    # menyisakan keyboard/laptop/cangkir di terdeteksi, tanpa false-reject
    # foto ikan asli.
    ood_info: dict | None = None  # skor verifikasi objek — selalu dilampirkan
    if _feat_model is not None and fish_reference_emb is not None:
        try:
            x = preprocess_input(np.expand_dims(rgb_img.astype(np.float32), axis=0))
            with _inference_lock:
                emb = _feat_model.predict(x, verbose=0)[0]
                probs = verifier_model.predict(x, verbose=0)[0]
            sim = float(
                np.dot(emb, fish_reference_emb)
                / (np.linalg.norm(emb) * np.linalg.norm(fish_reference_emb) + 1e-9)
            )

            # Top-10 kelas ImageNet: cukup satu kelas hewan → ada hewan di frame
            top_animal = False
            if _imagenet_is_animal is not None and verifier_model is not None:
                top_idx = np.argsort(probs)[::-1][:10]
                top_animal = bool(_imagenet_is_animal[top_idx].any())

            logger.info(
                "OOD similarity: %.3f (threshold %s); animal_detected=%s",
                sim, OOD_THRESHOLD, top_animal,
            )
            # Selalu sertakan skor verifikasi objek agar tampil di layar hasil
            # (transparansi proses — kebutuhan skripsi), bukan hanya saat reject.
            ood_info = {
                "similarity": round(sim, 3),
                "threshold": OOD_THRESHOLD,
                "animal_detected": top_animal,
                "passed": bool(sim >= OOD_THRESHOLD or top_animal),
            }
            if sim < OOD_THRESHOLD and not top_animal:
                # Objek bukan ikan/hewan (misal: keyboard, laptop, cangkir)
                return {
                    "status": "success",
                    "result": "BUKAN IKAN CUPANG",
                    "confidence": 0,
                    "extracted_features": None,
                    "ood": ood_info,
                }
        except Exception as e:
            logger.warning(f"Object verification failed: {e}")
    # ==========================================

    result = _classify(resized_img, rgb_img, gray_img)
    if ood_info is not None:
        result["ood"] = ood_info
    # Latensi total pipeline (decode + OOD + inferensi + render visualisasi)
    meta = result.get("meta")
    if isinstance(meta, dict):
        meta["latency_ms"] = int((time.monotonic() - _t_start) * 1000)
    return result


def _center_crop(img: np.ndarray, fraction: float) -> np.ndarray:
    """Potong bagian tengah gambar sebesar `fraction` (0 < fraction <= 1)."""
    if fraction >= 1.0:
        return img
    h, w = img.shape[:2]
    ch, cw = int(h * fraction), int(w * fraction)
    y0, x0 = (h - ch) // 2, (w - cw) // 2
    return img[y0:y0 + ch, x0:x0 + cw]


def _load_image(contents: bytes, filename: str) -> np.ndarray:
    """Decode bytes upload menjadi gambar BGR (mendukung JPG/PNG/HEIC/DNG)."""
    if filename.endswith('.dng'):
        import rawpy
        with tempfile.NamedTemporaryFile(suffix='.dng', delete=True) as temp_file:
            temp_file.write(contents)
            temp_file.flush()
            with rawpy.imread(temp_file.name) as raw:
                rgb_img_raw = raw.postprocess()
        # rawpy outputs RGB, convert to BGR so the rest of the pipeline works seamlessly
        return cv2.cvtColor(rgb_img_raw, cv2.COLOR_RGB2BGR)

    if filename.endswith(('.heic', '.heif')):
        import pillow_heif
        from PIL import Image
        pillow_heif.register_heif_opener()
        pil_img = Image.open(io.BytesIO(contents)).convert('RGB')
        rgb_arr = np.array(pil_img)
        return cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)

    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Gambar tidak valid atau rusak.")
    return img


def _render_feature_visualizations(
    rgb_img: np.ndarray,
    gray_img: np.ndarray,
    glcm: np.ndarray,
    thumb_size: int = 160,
) -> dict:
    """Render visualisasi proses ekstraksi fitur sebagai data URI JPEG.

    Nilai balik (semua data URI, siap ditampilkan langsung oleh <Image> di
    aplikasi dan aman disimpan di RTDB sebagai string):
      - grayscale            : citra abu-abu (input perhitungan GLCM)
      - channel_r/g/b        : dekomposisi kanal R, G, B + rata-rata kanal
      - glcm_heatmap         : matriks co-occurrence 256x256 (skala log karena
                               nilai sangat tersebar — 99% sel ~0, puncak di
                               diagonal), dikuantisasi ke uint8 utk disimpan
      - histogram_rgb        : distribusi intensitas per kanal warna

    Dipanggil dari threadpool (pemanggil _classify sinkron) sehingga biaya
    encoding JPEG tidak memblokir event loop.
    """
    def _to_data_uri(img_u8: np.ndarray, quality: int = 70) -> str:
        ok, buf = cv2.imencode(".jpg", img_u8, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        if not ok:
            raise ValueError("Encoding JPEG visualisasi gagal")
        return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("ascii")

    def _thumb(img_gray: np.ndarray) -> np.ndarray:
        return cv2.resize(img_gray, (thumb_size, thumb_size), interpolation=cv2.INTER_AREA)

    # 1) Grayscale (input GLCM) — ukuran penuh 224px untuk kejelasan teks/tekstur
    grayscale_uri = _to_data_uri(gray_img, quality=75)

    # 2) Dekomposisi kanal RGB — tiap kanal dirender grayscale; nilai rata-rata
    #    kanal sudah dikirim terpisah di rgb_averages (label angka dibuat di app).
    rgb_small = cv2.resize(rgb_img, (thumb_size, thumb_size), interpolation=cv2.INTER_AREA)
    channels = cv2.split(rgb_small)  # (R, G, B)
    channel_uris = []
    for ch in channels:
        channel_uris.append(_to_data_uri(ch))

    # 3) Heatmap GLCM 256x256 — normalisasi log agar struktur off-diagonal
    #    terlihat; kuantisasi ke uint8 untuk encoding JPEG.
    # graycomatrix mengembalikan shape (256, 256, 1, 1) — ambil slice [0, 0]
    # agar menjadi 2D (applyColorMap & normalisasi butuh matriks 2D).
    g = np.asarray(glcm, dtype=np.float64)[:, :, 0, 0]
    g_sum = float(g.sum())
    if g_sum <= 0:
        g = np.full_like(g, 1.0 / g.size)
        g_sum = 1.0
    g_log = np.log1p(g / g_sum * 1e6)
    g_log -= g_log.min()
    g_max = float(g_log.max())
    if g_max <= 0:
        g_max = 1.0
    glcm_u8 = (g_log / g_max * 255).astype(np.uint8)
    # Perbesar biar detail matriks terlihat; colormap JET supaya kontras jelas.
    glcm_color = cv2.applyColorMap(glcm_u8, cv2.COLORMAP_JET)  # BGR
    glcm_color = cv2.resize(glcm_color, (thumb_size, thumb_size), interpolation=cv2.INTER_NEAREST)
    glcm_uri = _to_data_uri(glcm_color)

    # 4) Histogram RGB — digambar manual ke kanvas (tanpa dependensi matplotlib):
    #    sumbu X = intensitas 0..255, sumbu Y = frekuensi ternormalisasi.
    HIST_W, HIST_H = thumb_size * 2, thumb_size  # landscape 320x160
    PAD = 4
    canvas = np.full((HIST_H, HIST_W, 3), 255, dtype=np.uint8)  # latar putih (BGR putih)
    hist_colors_bgr = [(255, 0, 0), (0, 200, 0), (0, 0, 255)]  # R, G, B
    max_freq = 1.0
    hists = []
    for ch in channels:
        h = cv2.calcHist([ch], [0], None, [256], [0, 256]).ravel()
        hists.append(h)
        max_freq = max(max_freq, float(h.max()))
    plot_h = HIST_H - PAD * 2
    bar_w = max(1, (HIST_W - 2 * PAD) // 256)
    for h, color in zip(hists, hist_colors_bgr):
        for x in range(256):
            px0 = PAD + int(x * (HIST_W - 2 * PAD) / 255.0)
            bar_h = int(float(h[x]) / max_freq * plot_h)
            if bar_h <= 0:
                continue
            px1 = min(HIST_W - PAD, px0 + bar_w)
            y0 = HIST_H - PAD - bar_h
            y1 = HIST_H - PAD
            # Overwrite langsung per kanal (bukan alpha-blend) agar tiap kanal
            # tetap terbaca; overlap antar kanal jarang signifikan.
            canvas[y0:y1, px0:px1] = np.array(color, dtype=np.uint8)
    hist_uri = _to_data_uri(canvas, quality=80)

    return {
        "grayscale": grayscale_uri,
        "channel_r": channel_uris[0],
        "channel_g": channel_uris[1],
        "channel_b": channel_uris[2],
        "glcm_heatmap": glcm_uri,
        "histogram_rgb": hist_uri,
    }


def _classify(resized_img: np.ndarray, rgb_img: np.ndarray, gray_img: np.ndarray) -> dict:
    """Ekstraksi fitur + inferensi model (dipanggil dari threadpool)."""
    # Extract RGB averages
    r_avg = np.mean(rgb_img[:, :, 0])
    g_avg = np.mean(rgb_img[:, :, 1])
    b_avg = np.mean(rgb_img[:, :, 2])

    # Extract REAL GLCM features using skimage
    # distance = 1, angle = 0 (horizontal)
    glcm = graycomatrix(gray_img, distances=[1], angles=[0], levels=256, symmetric=True, normed=True)

    glcm_contrast = float(graycoprops(glcm, 'contrast')[0, 0])
    glcm_correlation = float(graycoprops(glcm, 'correlation')[0, 0])
    glcm_energy = float(graycoprops(glcm, 'energy')[0, 0])
    glcm_homogeneity = float(graycoprops(glcm, 'homogeneity')[0, 0])

    if real_model is None:
        # Model tidak tersedia: jangan pernah mengembalikan prediksi acak (mock)
        # karena menyesatkan pengguna. Return 503 agar aplikasi menampilkan error.
        raise HTTPException(status_code=503, detail="Model klasifikasi tidak tersedia di server.")

    # Pass float32 RGB image (0-255 range); preprocess_input layer inside the model will handle scaling
    input_tensor = np.expand_dims(rgb_img.astype(np.float32), axis=0)

    # Prepare GLCM tensor (1, 4)
    glcm_tensor = np.array(
        [[glcm_contrast, glcm_correlation, glcm_energy, glcm_homogeneity]], dtype=np.float32
    )

    # Multi-input prediction (dilindungi lock: Keras predict tidak thread-safe)
    with _inference_lock:
        predictions = real_model.predict([input_tensor, glcm_tensor])
    pred = predictions[0]

    # Binary classification handling (Supports both 1-node Sigmoid and 2-node Softmax models)
    if not hasattr(pred, "__len__") or len(pred) == 1:
        prob_healthy_raw = float(pred[0] if hasattr(pred, "__len__") else pred)
    else:
        # Softmax → probabilitas keduanya tersedia langsung
        prob_healthy_raw = float(pred[1])

    # Threshold-calibrated probability (Piecewise Threshold Calibration):
    # Memetakan probabilitas raw seputar HEALTH_THRESHOLD (0.80) secara proporsional.
    # Memastikan bahwa kelas yang divonis selalu memiliki probabilitas dan confidence
    # mayoritas (>= 50%), sekaligus mempertahankan sensitivitas tinggi deteksi ikan sakit.
    if prob_healthy_raw >= HEALTH_THRESHOLD:
        # Di atas ambang: Vonis SEHAT (dikalibrasikan ke rentang 50% - 100%)
        norm_healthy = 0.5 + 0.5 * ((prob_healthy_raw - HEALTH_THRESHOLD) / max(1e-7, 1.0 - HEALTH_THRESHOLD))
        result_class = "SEHAT"
        result_confidence = round(min(100.0, max(50.0, norm_healthy * 100)), 2)
        prob_healthy_display = result_confidence
        prob_sick_display = round(100.0 - result_confidence, 2)
    else:
        # Di bawah ambang: Vonis TIDAK SEHAT (dikalibrasikan ke rentang 50% - 100%)
        norm_sick = 0.5 + 0.5 * ((HEALTH_THRESHOLD - prob_healthy_raw) / max(1e-7, HEALTH_THRESHOLD))
        result_class = "TIDAK SEHAT"
        result_confidence = round(min(100.0, max(50.0, norm_sick * 100)), 2)
        prob_sick_display = result_confidence
        prob_healthy_display = round(100.0 - result_confidence, 2)

    # Visualisasi proses ekstraksi (untuk layar Detail Analisis aplikasi —
    # kebutuhan skripsi). Kegagalan render TIDAK boleh menggagalkan prediksi.
    visualizations: dict | None = None
    try:
        visualizations = _render_feature_visualizations(rgb_img, gray_img, glcm)
    except Exception as e:
        logger.warning(f"Gagal render visualisasi fitur: {e}")

    return {
        "status": "success",
        "result": result_class,
        "confidence": result_confidence,
        # Probabilitas terkalibrasi per kelas — konsisten dengan vonis akhir
        "probabilities": {
            "SEHAT": prob_healthy_display,
            "TIDAK SEHAT": prob_sick_display,
        },
        # Metadata scan — traceability untuk dokumentasi skripsi.
        # latency_ms diisi pemanggil (_run_prediction_pipeline) agar mencakup
        # seluruh pipeline, bukan hanya inferensi.
        "meta": {
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "model": "MobileNetV2 + GLCM (multi-input, 224×224)",
            "backend": "TensorFlow/Keras — betta_model.h5",
            "health_threshold": HEALTH_THRESHOLD,
            "raw_prob_healthy": round(prob_healthy_raw * 100, 2),
            "features": "RGB mean + GLCM (contrast, correlation, energy, homogeneity)",
        },
        "extracted_features": {
            "rgb_averages": {"r": float(r_avg), "g": float(g_avg), "b": float(b_avg)},
            "glcm": {
                "contrast": glcm_contrast,
                "correlation": glcm_correlation,
                "energy": glcm_energy,
                "homogeneity": glcm_homogeneity,
            },
            # Data URI JPEG — sengaja di dalam extracted_features agar otomatis
            # ikut tersimpan ke riwayat (satu jalur penyimpanan, tidak perlu
            # perubahan di addHistory).
            "visualizations": visualizations,
        },
    }


@app.post("/predict")
def predict_health(request: Request, file: UploadFile = File(...)):
    # Endpoint sengaja dibuat sinkron (`def`, bukan `async def`) agar FastAPI
    # menjalankan seluruh proses berat (decode + inferensi) di threadpool dan
    # event loop tetap responsif terhadap request lain.
    client_ip = get_client_ip(request)
    if not PREDICT_LIMITER.check(client_ip):
        raise HTTPException(status_code=429, detail="Terlalu banyak permintaan. Coba lagi sebentar.")

    contents, filename = _read_upload(file)
    return _run_prediction_pipeline(contents, filename)


@app.post("/predict_base64")
def predict_health_base64(request: Request, data: PredictBase64Request):
    """Alternatif transport JSON untuk /predict.

    Dibuat karena `FileSystem.uploadAsync` di Expo Go/Android (SDK 57)
    gagal membaca file cache kamera (`java.io.IOException: Location ...
    isn't readable`) — error native yang terjadi SEBELUM request HTTP
    dikirim. Dengan base64 JSON, JS cukup mengirim string sehingga tidak
    ada pembacaan file native yang bisa gagal.

    Catatan: base64 menambah ukuran ±33% di atas biner; gunakan kualitas
    foto wajar (0.5-0.8) agar payload tetap di bawah MAX_UPLOAD_MB.
    """
    client_ip = get_client_ip(request)
    if not PREDICT_LIMITER.check(client_ip):
        raise HTTPException(status_code=429, detail="Terlalu banyak permintaan. Coba lagi sebentar.")

    raw_b64 = data.image.strip()
    # Terima format data URI "data:image/jpeg;base64,...." maupun base64 murni
    if raw_b64.startswith("data:") and "," in raw_b64:
        header, raw_b64 = raw_b64.split(",", 1)
        if not data.mime_type and ";" in header:
            data.mime_type = header[5:].split(";", 1)[0] or None

    try:
        contents = base64.b64decode(raw_b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Payload base64 tidak valid.")

    if not contents:
        raise HTTPException(status_code=400, detail="File kosong.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Ukuran file melebihi {MAX_UPLOAD_MB:g} MB.")

    # Tentukan nama file efektif: prioritas dari client, lalu magic bytes,
    # terakhir fallback dari mime_type. (Sniffing magic bytes lebih dapat
    # dipercaya daripada ekstensi yang dikirim client.)
    filename = (data.filename or "").lower()
    if not filename.endswith(ALLOWED_EXTENSIONS):
        filename = "upload" + (
            _sniff_image_ext(contents, filename)
            or (".heic" if (data.mime_type or "").startswith("image/he") else ".jpg")
        )

    return _run_prediction_pipeline(contents, filename)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": real_model is not None,
        "ood_check_enabled": _feat_model is not None and fish_reference_emb is not None,
        "animal_check_enabled": _imagenet_is_animal is not None and verifier_model is not None,
        "ood_threshold": OOD_THRESHOLD,
        "health_threshold": HEALTH_THRESHOLD,
        "max_upload_mb": MAX_UPLOAD_MB,
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
    }


class FeatureAnalysisRequest(BaseModel):
    classification: str
    features: dict


@app.post("/analyze_features")
def analyze_features(request: Request, data: FeatureAnalysisRequest):
    # Sinkron (`def`) agar pemanggilan Groq yang blocking berjalan di threadpool.
    client_ip = get_client_ip(request)
    if not ANALYZE_LIMITER.check(client_ip):
        raise HTTPException(status_code=429, detail="Terlalu banyak permintaan analisis. Coba lagi sebentar.")

    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(
            status_code=503,
            detail="API Key Groq belum diatur di backend server. Silakan tambahkan GROQ_API_KEY di file .env backend.",
        )

    try:
        prompt = f"Sebagai ahli ikan cupang, berikan kesimpulan singkat dan mudah dipahami (maksimal 3 kalimat) mengenai kesehatan ikan berdasarkan hasil klasifikasi dan fitur berikut:\nKlasifikasi: {data.classification}\n"

        features = data.features
        if "rgb_averages" in features:
            rgb = features["rgb_averages"]
            prompt += f"Rata-rata RGB: Merah ({rgb.get('r', 0):.1f}), Hijau ({rgb.get('g', 0):.1f}), Biru ({rgb.get('b', 0):.1f})\n"
        if "glcm" in features:
            glcm = features["glcm"]
            prompt += f"Tekstur GLCM: Kontras ({glcm.get('contrast', 0):.3f}), Korelasi ({glcm.get('correlation', 0):.3f}), Energi ({glcm.get('energy', 0):.3f}), Homogenitas ({glcm.get('homogeneity', 0):.3f})\n"

        prompt += f"Jelaskan apakah nilai-nilai ini mendukung kesimpulan ikan {'sehat' if data.classification == 'SEHAT' else 'sakit'}."

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "BettaCare/1.0"
        }
        payload = {
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 500
        }

        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=30) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return {"analysis": res_data['choices'][0]['message']['content']}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        logger.error(f"Groq API HTTP Error: {e.code} - {error_body}")
        # Jangan bocorkan isi respons upstream (bisa mengandung info sensitif)
        if e.code == 429:
            raise HTTPException(status_code=429, detail="Layanan analisis AI sedang sibuk. Coba lagi nanti.")
        raise HTTPException(status_code=502, detail=f"Layanan analisis AI gagal (HTTP {e.code}).")
    except Exception as e:
        logger.error(f"Groq API Exception: {str(e)}")
        raise HTTPException(status_code=502, detail="Terjadi kesalahan saat memanggil layanan analisis AI.")
