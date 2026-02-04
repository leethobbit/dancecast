# Dancecast — Video server (FastAPI)
# Python 3.12 slim; run with docker-compose from dancecast/
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code (static + main.py)
COPY . .

# Server binds to 0.0.0.0; media dir is mounted at /media by compose
ENV PORT=8000
ENV DANCE_MEDIA_PATH=/media

EXPOSE 8000

# No --reload in container (not needed, uses extra resources)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
