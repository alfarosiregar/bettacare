# Harus Python 3.12: tensorflow-cpu==2.21 (versi di requirements.txt)
# tidak menyediakan wheel untuk Python 3.10, dan betta_model.h5 disimpan
# oleh Keras 3.15 (TF 2.21) sehingga butuh versi runtime yang sama.
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
