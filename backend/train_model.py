import os
import glob
import argparse
# pyrefly: ignore [missing-import]
import cv2
import numpy as np
import tensorflow as tf
from skimage.feature import graycomatrix, graycoprops
# pyrefly: ignore [missing-import]
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import confusion_matrix, classification_report
# pyrefly: ignore [missing-import]
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input

# ============================================================================
# PROTOKOL PENGUJIAN (untuk dokumentasi skripsi)
# ----------------------------------------------------------------------------
# 1. Uji AKURASI (domain konsisten): foto dengan kondisi serupa dataset latih
#    — foto akuarium, ikan mengisi ±1/4 frame, latar gelap/berwarna, pencahayaan
#    akuarium. Angka akurasi laporan (±91%) SAH hanya untuk domain ini.
#
# 2. Uji ROBUSTNESS (dilaporkan terpisah sebagai analisis keterbatasan):
#    foto internet/jurnalistik/studio (latar putih, ikan ±8% frame). Hasil uji
#    30 Sep 2026: foto ikan sakit gaya jurnalistik (artikel Kompas) vonis
#    SEHAT 97.65% — domain shift: RGB mean 200-211 vs dataset 121-125,
#    kontras GLCM 229 vs maks dataset 137, OOD similarity 0.621 (di bawah
#    ambang 0.63, lolos karena sinyal animal-detected).
#    KESIMPULAN: model TIDAK dijamin di luar domain foto akuarium; peringatan
#    in-app ditambahkan (OOD similarity < 0.63) dan augmentasi latih diperlebar
#    (scale 0.5-1.0, brightness 0.5-2.0) untuk pelatihan ulang berikutnya.
# ============================================================================

class HybridDataGenerator(tf.keras.utils.Sequence):
    """
    Custom Data Generator yang membaca gambar secara real-time,
    mengekstrak tekstur GLCM dari gambar asli (sebelum augmentasi warna),
    melakukan Data Augmentation pada gambar RGB, 
    lalu menyuapkannya ke model Multi-Input (RGB + GLCM).
    """
    def __init__(self, image_paths, labels, batch_size=8, augment=False, img_size=(224, 224), shuffle=True, **kwargs):
        super().__init__(**kwargs)
        self.image_paths = image_paths
        self.labels = np.array(labels)
        self.batch_size = batch_size
        self.augment = augment
        self.img_size = img_size
        self.shuffle = shuffle
        self.indices = np.arange(len(self.image_paths))
        self.on_epoch_end()

    def __len__(self):
        return int(np.ceil(len(self.image_paths) / float(self.batch_size)))

    def __getitem__(self, idx):
        batch_indices = self.indices[idx * self.batch_size:(idx + 1) * self.batch_size]
        batch_paths = [self.image_paths[i] for i in batch_indices]
        batch_labels = self.labels[batch_indices]
        
        batch_images = []
        batch_glcm = []
        valid_labels = []

        for i, img_path in enumerate(batch_paths):
            img = None
            # Membaca gambar
            if img_path.lower().endswith('.dng'):
                try:
                    # pyrefly: ignore [missing-import]
                    import rawpy
                    with rawpy.imread(img_path) as raw:
                        img = raw.postprocess() # rawpy menghasilkan format RGB
                    img = cv2.resize(img, self.img_size)
                except Exception:
                    pass
                
                # Fallback jika rawpy gagal membaca DNG
                if img is None:
                    try:
                        # pyrefly: ignore [missing-import]
                        import imageio.v3 as iio
                        img_raw = iio.imread(img_path)
                        img = cv2.resize(img_raw, self.img_size)
                        if len(img.shape) == 2:
                            img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
                        elif img.shape[2] == 4:
                            img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
                    except Exception as e:
                        print(f"Error reading DNG {img_path}: {e}")
                        continue
            elif img_path.lower().endswith('.heic'):
                try:
                    import pillow_heif
                    from PIL import Image
                    pillow_heif.register_heif_opener()
                    pil_img = Image.open(img_path).convert('RGB')
                    img = np.array(pil_img)
                    img = cv2.resize(img, self.img_size)
                except Exception as e:
                    print(f"Error reading HEIC {img_path}: {e}")
                    continue
            else:
                img = cv2.imread(img_path)
                if img is None:
                    continue # Skip gambar rusak
                
                # 1. Resize & Konversi BGR -> RGB
                img = cv2.resize(img, self.img_size)
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # 2. Augmentasi GEOMETRI dilakukan SEBELUM ekstraksi GLCM agar cabang
            #    tekstur ikut belajar invariansi framing — konsisten dengan
            #    inference, di mana GLCM dihitung dari foto pengguna apa adanya.
            #
            #    PELAJARAN DARI PENGUJIAN ROBUSTNESS (foto ikan sakit gaya
            #    jurnalistik/studio, latar putih, ikan ±8% frame): model vonis
            #    SEHAT 97.65% karena citra begitu jauh dari distribusi latih
            #    (dataset: latar gelap, ikan ±24% frame; GLCM kontras foto
            #    jurnalistik 229 vs maks dataset 137; OOD sim 0.621 di bawah
            #    ambang 0.63 tapi lolos karena sinyal "animal detected").
            #    Range augmentasi di bawah diperlebar agar model belajar
            #    invariansi framing & pencahayaan ekstrem.
            if self.augment:
                # Random scale: crop area tengah 50-100% lalu resize kembali
                # (70% chance). Simulasi ikan kecil di frame besar — kasus foto
                # jurnalistik/studio yang sebelumnya membuat model salah.
                if np.random.rand() < 0.7:
                    scale = np.random.uniform(0.5, 1.0)
                    h, w = img.shape[:2]
                    ch, cw = int(h * scale), int(w * scale)
                    y0, x0 = (h - ch) // 2, (w - cw) // 2
                    img = cv2.resize(img[y0:y0 + ch, x0:x0 + cw], (w, h))
                
                # 50% chance untuk di-flip horizontal
                if np.random.rand() > 0.5:
                    img = cv2.flip(img, 1) 

            # 3. Ekstraksi GLCM (setelah augmentasi geometri, sebelum augmentasi warna)
            gray_img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            glcm = graycomatrix(gray_img, distances=[1], angles=[0], levels=256, symmetric=True, normed=True)
            
            contrast = float(graycoprops(glcm, 'contrast')[0, 0])
            correlation = float(graycoprops(glcm, 'correlation')[0, 0])
            energy = float(graycoprops(glcm, 'energy')[0, 0])
            homogeneity = float(graycoprops(glcm, 'homogeneity')[0, 0])

            # 4. Augmentasi WARNA (hanya jalur RGB; tidak memengaruhi GLCM)
            if self.augment:
                # 70% chance untuk mengubah kecerahan secara acak dalam range
                # lebar 50-200% — mencakup foto studio/jurnalistik berlatar putih
                # (rata-rata kecerahan 2x dataset akuarium) yang sebelumnya
                # berada di luar distribusi latih.
                if np.random.rand() < 0.7:
                    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
                    value = np.random.uniform(0.5, 2.0) # 50% s/d 200% brightness
                    hsv[:,:,2] = np.clip(hsv[:,:,2] * value, 0, 255).astype(np.uint8)
                    img = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)

            batch_images.append(img.astype(np.float32))
            batch_glcm.append([contrast, correlation, energy, homogeneity])
            valid_labels.append(batch_labels[i])

        if len(batch_images) == 0:
            return (np.zeros((0, 224, 224, 3), dtype=np.float32), np.zeros((0, 4), dtype=np.float32)), np.zeros((0,), dtype=np.float32)

        return (np.array(batch_images, dtype=np.float32), np.array(batch_glcm, dtype=np.float32)), np.array(valid_labels, dtype=np.float32)
        
    def on_epoch_end(self):
        if self.shuffle:
            np.random.shuffle(self.indices)


def build_model():
    # 1. Image Input (RGB: 224x224x3, rentang 0-255)
    image_input = tf.keras.layers.Input(shape=(224, 224, 3), name='image_input')
    
    # Preprocessing bawaan MobileNetV2 (merubah [0, 255] ke [-1, 1]) via Lambda layer
    x_pre = tf.keras.layers.Lambda(preprocess_input, name='mobilenet_preprocess')(image_input)
    
    # Base model MobileNetV2 pre-trained ImageNet
    base_model = MobileNetV2(
        weights='imagenet', 
        include_top=False, 
        input_tensor=x_pre
    )
    
    # Freeze the base model layers initially
    for layer in base_model.layers:
        layer.trainable = False

    # Feature extraction dari gambar
    x = base_model.output
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    cnn_features = tf.keras.layers.Dense(128, activation='relu')(x)
    
    # 2. GLCM Feature Input (4 features)
    glcm_input = tf.keras.layers.Input(shape=(4,), name='glcm_input')
    # Feature Scaling / Normalisasi Skala Fitur GLCM dengan BatchNormalization
    glcm_norm = tf.keras.layers.BatchNormalization(name='glcm_batchnorm')(glcm_input)
    y = tf.keras.layers.Dense(16, activation='relu')(glcm_norm)
    glcm_features = tf.keras.layers.Dense(16, activation='relu')(y)
    
    # 3. Concatenate CNN and GLCM features
    combined = tf.keras.layers.concatenate([cnn_features, glcm_features])
    
    z = tf.keras.layers.Dense(64, activation='relu')(combined)
    z = tf.keras.layers.Dropout(0.5)(z)
    
    # Output layer: 1 node (Sigmoid) untuk klasifikasi biner (0 = TIDAK SEHAT, 1 = SEHAT)
    predictions = tf.keras.layers.Dense(1, activation='sigmoid', name='output')(z)

    model = tf.keras.models.Model(inputs=[image_input, glcm_input], outputs=predictions)
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        # Label smoothing mengurangi overconfidence (prediksi 100%) pada dataset kecil
        loss=tf.keras.losses.BinaryCrossentropy(label_smoothing=0.05),
        metrics=['accuracy', tf.keras.metrics.Precision(name='precision'), tf.keras.metrics.Recall(name='recall')]
    )
    
    return model, base_model


def make_callbacks(monitor: str) -> list:
    """Callbacks standar (Early Stopping + ReduceLROnPlateau)."""
    return [
        tf.keras.callbacks.EarlyStopping(
            monitor=monitor,
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor=monitor,
            factor=0.5,
            patience=3,
            verbose=1
        )
    ]


def fine_tune_model(model, base_model, train_generator, val_generator, class_weight, epochs=10):
    """
    Stage 2: buka sebagian layer atas MobileNetV2 dan fine-tune dengan learning
    rate kecil. BatchNorm tetap dibekukan agar statistik pre-trained tidak rusak
    pada dataset kecil. Terbukti membantu menaikkan recall kelas minoritas.
    """
    FINE_TUNE_FROM = 100  # mulai buka layer ke-100 dari belakang (atas)
    base_model.trainable = True
    for layer in base_model.layers[:FINE_TUNE_FROM]:
        layer.trainable = False
    # BatchNorm selalu dibekukan
    for layer in base_model.layers:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False

    trainable = sum(1 for l in model.layers if l.trainable)
    print(f"Fine-tuning: {trainable} layer di-unfreeze (dari {len(base_model.layers)} layer base).")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss=tf.keras.losses.BinaryCrossentropy(label_smoothing=0.05),
        metrics=['accuracy', tf.keras.metrics.Precision(name='precision'), tf.keras.metrics.Recall(name='recall')]
    )

    monitor = 'val_loss' if val_generator else 'loss'
    model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=epochs,
        callbacks=make_callbacks(monitor),
        class_weight=class_weight,
    )
    return model

def get_dataset_paths():
    base_dir = os.path.join(os.path.dirname(__file__), "dataset")
    
    # Asumsi: TIDAK_SEHAT = Class 0, SEHAT = Class 1
    unhealthy_dir = os.path.join(base_dir, "TIDAK_SEHAT")
    healthy_dir = os.path.join(base_dir, "SEHAT")
    
    # Jika folder belum ada, buatkan otomatis
    os.makedirs(unhealthy_dir, exist_ok=True)
    os.makedirs(healthy_dir, exist_ok=True)
    
    unhealthy_paths = glob.glob(os.path.join(unhealthy_dir, "*.*"))
    healthy_paths = glob.glob(os.path.join(healthy_dir, "*.*"))
    
    # Filter hanya gambar valid
    valid_ext = ('.jpg', '.jpeg', '.png', '.dng', '.heic')
    unhealthy_paths = [p for p in unhealthy_paths if p.lower().endswith(valid_ext)]
    healthy_paths = [p for p in healthy_paths if p.lower().endswith(valid_ext)]
    
    return unhealthy_paths, healthy_paths

def train_real_model():
    unhealthy_paths, healthy_paths = get_dataset_paths()
    
    print("="*50)
    print("MEMERIKSA DATASET...")
    print(f"Ikan Tidak Sehat : {len(unhealthy_paths)} gambar")
    print(f"Ikan Sehat       : {len(healthy_paths)} gambar")
    print("="*50)
    
    if len(unhealthy_paths) == 0 or len(healthy_paths) == 0:
        print("❌ GAGAL MEMULAI TRAINING: Dataset Kosong!")
        print("Silakan letakkan foto asli ikan ke dalam folder:")
        print("  - backend/dataset/SEHAT/")
        print("  - backend/dataset/TIDAK_SEHAT/")
        print("Lalu jalankan script ini kembali.")
        return
    
    # Gabungkan semua data
    all_paths = unhealthy_paths + healthy_paths
    # Label: 0 untuk TIDAK_SEHAT, 1 untuk SEHAT
    all_labels = [0] * len(unhealthy_paths) + [1] * len(healthy_paths)
    
    print("Membangun arsitektur model Hybrid (MobileNetV2 + GLCM + BatchNormalization + Sigmoid)...")
    model, base_model = build_model()
    
    # Dataset Split (Train / Validation / Test) jika data cukup
    num_unhealthy = len(unhealthy_paths)
    num_healthy = len(healthy_paths)
    X_test, y_test = [], []
    if num_unhealthy >= 6 and num_healthy >= 6 and len(all_paths) >= 20:
        # Split 1: pisahkan 15% sebagai TEST SET yang benar-benar terpisah (tidak dipakai training sama sekali)
        # SEED DIPERPENING (42) → split identik antar run, evaluasi sebelum/sesudah
        # perubahan augmentasi dapat dibandingkan apples-to-apples.
        X_trainval, X_test, y_trainval, y_test = train_test_split(
            all_paths, all_labels, test_size=0.15, random_state=42, stratify=all_labels
        )
        # Split 2: dari sisa data, pisahkan validation (~15% dari total)
        X_train, X_val, y_train, y_val = train_test_split(
            X_trainval, y_trainval, test_size=0.18, random_state=42, stratify=y_trainval
        )
        print(f"Dataset Split: {len(X_train)} Train, {len(X_val)} Validation, {len(X_test)} Test (terpisah)")
        
        train_generator = HybridDataGenerator(X_train, y_train, batch_size=8, augment=True, shuffle=True)
        val_generator = HybridDataGenerator(X_val, y_val, batch_size=8, augment=False, shuffle=False)
    else:
        print("⚠️ Jumlah data < 10 gambar atau kelas < 2 sampel, melatih seluruh data tanpa Validation Split.")
        train_generator = HybridDataGenerator(all_paths, all_labels, batch_size=8, augment=True, shuffle=True)
        val_generator = None

    # Callbacks untuk Early Stopping & Learning Rate Reduction
    monitor = 'val_loss' if val_generator else 'loss'
    callbacks = make_callbacks(monitor)
    
    # Class weighting untuk mengatasi imbalance SEHAT vs TIDAK_SEHAT
    # (mencegah model kolaps ke kelas mayoritas)
    from sklearn.utils.class_weight import compute_class_weight
    classes = np.array(sorted(set(all_labels)))
    weights = compute_class_weight('balanced', classes=classes, y=np.array(all_labels))
    class_weight = {int(c): float(w) for c, w in zip(classes, weights)}
    print(f"Class weights: {class_weight}")

    print("Memulai proses training model (stage 1: head saja)...")
    EPOCHS = 30
    model.fit(
        train_generator, 
        validation_data=val_generator, 
        epochs=EPOCHS,
        callbacks=callbacks,
        class_weight=class_weight
    )

    # Stage 2: fine-tune sebagian layer atas MobileNetV2 dengan LR kecil
    print("\nMemulai stage 2: fine-tuning layer atas MobileNetV2...")
    model = fine_tune_model(model, base_model, train_generator, val_generator, class_weight)
    
    # Save the model
    save_path = os.path.join(os.path.dirname(__file__), "betta_model.h5")
    model.save(save_path)
    
    print(f"✅ Model NYATA berhasil dilatih dan disimpan di: {save_path}")

    # ===== Evaluasi akhir pada TEST SET yang benar-benar terpisah =====
    if len(X_test) > 0:
        print("\n" + "="*50)
        print("EVALUASI PADA TEST SET (tidak pernah dilihat saat training)")
        print("="*50)
        test_generator = HybridDataGenerator(X_test, y_test, batch_size=8, augment=False, shuffle=False)
        probs = model.predict(test_generator, verbose=0).ravel()
        y_true = np.array(y_test)
        y_pred = (probs >= 0.5).astype(int)
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        report = classification_report(
            y_true, y_pred,
            target_names=['TIDAK_SEHAT', 'SEHAT'],
            digits=4, zero_division=0
        )
        acc = float((y_pred == y_true).mean())
        lines = [
            "Confusion Matrix (baris=label asli [0=TIDAK_SEHAT, 1=SEHAT]):",
            str(cm),
            "",
            report,
            f"Accuracy: {acc*100:.2f}%",
        ]
        # pyrefly: ignore [no-matching-overload]
        report_text = "\n".join(lines)
        print(report_text)

        report_path = os.path.join(os.path.dirname(__file__), "eval_report.txt")
        with open(report_path, "w") as f:
            f.write(report_text)
        print(f"\n📄 Laporan evaluasi disimpan di: {report_path}")

def train_kfold(k: int = 5):
    """
    K-Fold Cross Validation (opsional, via flag --kfold N).
    Estimasi performa jauh lebih stabil untuk dataset kecil (~226 gambar)
    dibanding satu split train/val/test. Tidak menyimpan model.
    """
    unhealthy_paths, healthy_paths = get_dataset_paths()
    if len(unhealthy_paths) == 0 or len(healthy_paths) == 0:
        print("❌ Dataset kosong. Isi backend/dataset/SEHAT dan TIDAK_SEHAT dulu.")
        return

    all_paths = unhealthy_paths + healthy_paths
    all_labels = np.array([0] * len(unhealthy_paths) + [1] * len(healthy_paths))

    print("=" * 50)
    print(f"K-FOLD CROSS VALIDATION (k={k})")
    print(f"Total: {len(all_paths)} gambar ({len(healthy_paths)} sehat, {len(unhealthy_paths)} tidak sehat)")
    print("=" * 50)

    from sklearn.utils.class_weight import compute_class_weight
    skf = StratifiedKFold(n_splits=k, shuffle=True, random_state=42)
    accuracies, recalls_sick = [], []

    for fold, (train_idx, test_idx) in enumerate(skf.split(all_paths, all_labels), start=1):
        print(f"\n───── FOLD {fold}/{k} ─────")
        X_train = [all_paths[i] for i in train_idx]
        y_train = all_labels[train_idx].tolist()
        X_test = [all_paths[i] for i in test_idx]
        y_test = all_labels[test_idx]

        model, base_model = build_model()
        classes = np.array(sorted(set(y_train)))
        weights = compute_class_weight('balanced', classes=classes, y=np.array(y_train))
        class_weight = {int(c): float(w) for c, w in zip(classes, weights)}

        train_gen = HybridDataGenerator(X_train, y_train, batch_size=8, augment=True, shuffle=True)
        model.fit(train_gen, epochs=30, callbacks=make_callbacks('loss'), class_weight=class_weight, verbose=2)
        model = fine_tune_model(model, base_model, train_gen, None, class_weight)

        test_gen = HybridDataGenerator(X_test, y_test.tolist(), batch_size=8, augment=False, shuffle=False)
        probs = model.predict(test_gen, verbose=0).ravel()
        y_pred = (probs >= 0.5).astype(int)
        acc = float((y_pred == y_test).mean())
        # Recall kelas TIDAK_SEHAT (0): metrik paling penting untuk aplikasi kesehatan
        sick_mask = y_test == 0
        recall_sick = float((y_pred[sick_mask] == 0).mean()) if sick_mask.any() else float('nan')
        accuracies.append(acc)
        recalls_sick.append(recall_sick)
        print(f"Fold {fold}: accuracy={acc * 100:.2f}%, recall TIDAK_SEHAT={recall_sick * 100:.2f}%")

    print("\n" + "=" * 50)
    print("RINGKASAN K-FOLD")
    print(f"Accuracy        : {np.mean(accuracies) * 100:.2f}% ± {np.std(accuracies) * 100:.2f}%")
    print(f"Recall TIDAK_SEHAT: {np.nanmean(recalls_sick) * 100:.2f}% ± {np.nanstd(recalls_sick) * 100:.2f}%")
    print("=" * 50)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Training model klasifikasi kesehatan ikan cupang")
    parser.add_argument("--kfold", type=int, default=0, metavar="N", help="Jalankan K-Fold CV dengan N fold (mis. --kfold 5). Tidak menyimpan model.")
    args = parser.parse_args()

    if args.kfold >= 2:
        train_kfold(args.kfold)
    else:
        train_real_model()

