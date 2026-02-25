FROM python:3.12-slim

WORKDIR /app

# Copy requirements and install (minimal deps now)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p /app/data/user-uploads

# Expose retrieval port
EXPOSE 8081

CMD ["python", "main.py"]
