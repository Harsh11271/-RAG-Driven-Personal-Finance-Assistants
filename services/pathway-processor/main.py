import os
import sys
import json
import hashlib
import time
import threading
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Configuration
DATA_DIR = os.getenv("DATA_DIR", "./data/user-uploads")
HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", 8081))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ============================================================
# Lightweight RAG Server
# Watches a directory, chunks text files, embeds them,
# and serves a retrieval API at /v1/retrieve
# ============================================================

# --- In-memory vector store ---
documents = []  # list of { "text": str, "embedding": list, "source": str }
doc_hashes = set()  # track which files we've indexed

# --- Embedding ---
embedder = None

def get_embedder():
    """Lazy-load embedder. Tries OpenAI first, then falls back to simple TF-IDF."""
    global embedder
    if embedder is not None:
        return embedder

    if OPENAI_API_KEY and OPENAI_API_KEY != "YOUR_OPENAI_API_KEY_HERE":
        try:
            import openai
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            def embed_openai(texts):
                resp = client.embeddings.create(model="text-embedding-3-small", input=texts)
                return [d.embedding for d in resp.data]
            embedder = embed_openai
            print("Using OpenAI embeddings")
            return embedder
        except Exception as e:
            print(f"OpenAI embedder failed: {e}")

    # Fallback: simple bag-of-words cosine similarity (no external API needed)
    print("Using simple keyword-based retrieval (no API key needed)")
    embedder = None
    return None

def simple_keyword_search(query, k=3):
    """Fallback search when no embedder is available."""
    query_words = set(query.lower().split())
    scored = []
    for doc in documents:
        doc_words = set(doc["text"].lower().split())
        overlap = len(query_words & doc_words)
        if overlap > 0:
            scored.append((overlap, doc))
    scored.sort(key=lambda x: -x[0])
    return [{"text": doc["text"], "source": doc["source"]} for _, doc in scored[:k]]

def embed_and_search(query, k=3):
    """Search using embeddings if available, else keyword fallback."""
    emb = get_embedder()
    if emb is None:
        return simple_keyword_search(query, k)

    import numpy as np
    query_emb = emb([query])[0]
    query_vec = np.array(query_emb)

    scored = []
    for doc in documents:
        doc_vec = np.array(doc["embedding"])
        # Cosine similarity
        sim = np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec) + 1e-8)
        scored.append((sim, doc))

    scored.sort(key=lambda x: -x[0])
    return [{"text": doc["text"], "source": doc["source"]} for _, doc in scored[:k]]

# --- Document Ingestion ---
def chunk_text(text, max_chars=1000):
    """Split text into chunks of roughly max_chars."""
    paragraphs = text.split("\n\n")
    chunks = []
    current = ""
    for p in paragraphs:
        if len(current) + len(p) > max_chars and current:
            chunks.append(current.strip())
            current = p
        else:
            current += "\n\n" + p if current else p
    if current.strip():
        chunks.append(current.strip())
    return chunks if chunks else [text]

def index_file(filepath):
    """Read, chunk, embed, and store a file."""
    path = Path(filepath)
    file_hash = hashlib.md5(f"{path.name}_{path.stat().st_mtime}".encode()).hexdigest()

    if file_hash in doc_hashes:
        return 0

    try:
        if path.suffix.lower() == '.csv':
            text = path.read_text(encoding='utf-8', errors='ignore')
        elif path.suffix.lower() in ('.txt', '.md', '.json', '.log'):
            text = path.read_text(encoding='utf-8', errors='ignore')
        else:
            print(f"  Skipping unsupported file: {path.name}")
            return 0

        if not text.strip():
            return 0

        chunks = chunk_text(text)
        emb = get_embedder()

        for chunk in chunks:
            doc_entry = {"text": chunk, "source": path.name, "embedding": []}
            if emb:
                try:
                    doc_entry["embedding"] = emb([chunk])[0]
                except Exception as e:
                    print(f"  Embedding error: {e}")
            documents.append(doc_entry)

        doc_hashes.add(file_hash)
        print(f"  Indexed: {path.name} ({len(chunks)} chunks)")
        return len(chunks)
    except Exception as e:
        print(f"  Error indexing {path.name}: {e}")
        return 0

def scan_directory():
    """Scan DATA_DIR for files to index."""
    data_path = Path(DATA_DIR)
    if not data_path.exists():
        data_path.mkdir(parents=True, exist_ok=True)
        return

    total = 0
    for f in data_path.iterdir():
        if f.is_file():
            total += index_file(f)
    if total > 0:
        print(f"  Total new chunks indexed: {total}")

def background_watcher():
    """Periodically scan for new files."""
    while True:
        try:
            scan_directory()
        except Exception as e:
            print(f"Watcher error: {e}")
        time.sleep(5)  # Check every 5 seconds

# --- HTTP Server (Flask-like with built-in http.server) ---
from http.server import HTTPServer, BaseHTTPRequestHandler

class RAGHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/v1/retrieve":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
                query = data.get("query", "")
                k = data.get("k", 3)

                results = embed_and_search(query, k)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(results).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == "/health" or self.path == "/v1/statistics":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            stats = {
                "status": "UP",
                "service": "Pathway RAG Processor",
                "documents_indexed": len(documents),
                "unique_files": len(doc_hashes),
                "data_dir": DATA_DIR,
            }
            self.wfile.write(json.dumps(stats).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        print(f"[RAG] {args[0]}")

# --- Main ---
if __name__ == "__main__":
    print(f"--- 🧠 Pathway RAG Processor ---")
    print(f"Serving on http://{HOST}:{PORT}")
    print(f"Monitoring: {DATA_DIR}")
    print(f"Endpoints: POST /v1/retrieve, GET /v1/statistics, GET /health")

    # Initial scan
    scan_directory()

    # Start background file watcher
    watcher = threading.Thread(target=background_watcher, daemon=True)
    watcher.start()

    # Start HTTP server
    server = HTTPServer((HOST, PORT), RAGHandler)
    print(f"RAG Server ready on port {PORT}")
    server.serve_forever()
