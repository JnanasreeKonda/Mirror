# Context must be GDC Hackathon (parent), so Dockerfile + Mirror/ are siblings.
# Use: gcloud run deploy ... --source .
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY Mirror/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend lives under extension/ in this repo layout
COPY Mirror/extension/main.py ./main.py

EXPOSE 8080
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
