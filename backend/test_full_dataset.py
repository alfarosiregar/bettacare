"""
Script uji menyeluruh untuk memeriksa bias prediksi model BettaCare.

Penggunaan:
    ../.venv/bin/python test_full_dataset.py [port]

Asumsi server sudah berjalan di http://127.0.0.1:<port> (default 8001).
Menguji SELURUH gambar di dataset/SEHAT dan dataset/TIDAK_SEHAT,
lalu merangkum recall per kelas + daftar semua kesalahan prediksi.
"""
import glob
import json
import subprocess
import sys
import urllib.request

PORT = sys.argv[1] if len(sys.argv) > 1 else "8001"
BASE = f"http://127.0.0.1:{PORT}"


def predict(path: str) -> dict:
    """Kirim satu gambar ke /predict via multipart."""
    boundary = "----bettauitest"
    with open(path, "rb") as f:
        data = f.read()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{path}"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        BASE + "/predict",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"result": f"ERROR: {e}", "confidence": 0}


def evaluate(folder: str, expected: str) -> dict:
    files = sorted(
        p for p in glob.glob(folder + "/*")
        if p.lower().endswith((".jpg", ".jpeg", ".png", ".heic", ".dng"))
    )
    correct = 0
    mistakes = []
    for f in files:
        r = predict(f)
        res, conf = r.get("result"), r.get("confidence")
        if res == expected:
            correct += 1
        else:
            mistakes.append((f, res, conf))
    n = len(files)
    recall = 100.0 * correct / n if n else 0.0
    return {"n": n, "correct": correct, "recall": recall, "mistakes": mistakes}


def main() -> None:
    # Health check dulu
    try:
        with urllib.request.urlopen(BASE + "/health", timeout=10) as r:
            h = json.loads(r.read().decode())
        print(f"Server OK: model_loaded={h.get('model_loaded')} ood={h.get('ood_check_enabled')}")
    except Exception as e:
        print(f"Server tidak merespons di {BASE}: {e}")
        sys.exit(1)

    print("\nMenguji SELURUH dataset (bukan hanya sampel)...\n")

    sehat = evaluate("dataset/SEHAT", "SEHAT")
    print(f"=== KELAS SEHAT ===")
    print(f"  Benar: {sehat['correct']}/{sehat['n']} (recall {sehat['recall']:.1f}%)")
    for f, res, conf in sehat["mistakes"]:
        print(f"  MISS: {f} -> {res} ({conf}%)")

    sakit = evaluate("dataset/TIDAK_SEHAT", "TIDAK SEHAT")
    print(f"\n=== KELAS TIDAK_SEHAT ===")
    print(f"  Benar: {sakit['correct']}/{sakit['n']} (recall {sakit['recall']:.1f}%)")
    for f, res, conf in sakit["mistakes"]:
        print(f"  MISS: {f} -> {res} ({conf}%)")

    total_n = sehat["n"] + sakit["n"]
    total_ok = sehat["correct"] + sakit["correct"]
    print(f"\n=== RINGKASAN ===")
    print(f"  Akurasi keseluruhan : {total_ok}/{total_n} = {100*total_ok/total_n if total_n else 0:.1f}%")
    print(f"  Recall SEHAT        : {sehat['recall']:.1f}%")
    print(f"  Recall TIDAK SEHAT  : {sakit['recall']:.1f}%")
    if sakit["recall"] < 70:
        print("\n  ⚠️  Recall TIDAK SEHAT rendah -> model cenderung bias ke SEHAT")
        print("      pada data yang mirip dengan ini. Lihat daftar MISS di atas")


if __name__ == "__main__":
    main()
