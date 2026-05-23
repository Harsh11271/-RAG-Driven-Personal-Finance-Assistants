import os
import sys
import json
import hashlib
import time
import threading
from pathlib import Path
from dotenv import load_dotenv
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request

load_dotenv()

# Configuration
DATA_DIR = os.getenv("DATA_DIR", "./data/user-uploads")
HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", 8081))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

PATHWAY_ACTIVE = False

# ============================================================
# 1. Pathway Streaming Vector Store Server (Background Thread)
# ============================================================
def start_pathway_server():
    global PATHWAY_ACTIVE
    print("--- Attempting to start Pathway Streaming Vector Index ---")
    try:
        import pathway as pw
        from pathway.xpacks.llm.vector_store import VectorStoreServer
        from pathway.xpacks.llm.embedders import OpenAIEmbedder, GeminiEmbedder, SentenceTransformerEmbedder

        # Ingestion source: streaming file watcher
        data_sources = [
            pw.io.fs.read(
                DATA_DIR,
                format="binary",
                mode="streaming",
                with_metadata=True
            )
        ]

        # Determine the best embedding model based on available API keys
        if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
            print("[Pathway] Configured with Gemini Embeddings (models/embedding-001)")
            os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
            embedder = GeminiEmbedder(model="models/embedding-001")
        elif OPENAI_API_KEY and OPENAI_API_KEY != "YOUR_OPENAI_API_KEY_HERE":
            print("[Pathway] Configured with OpenAI Embeddings (text-embedding-3-small)")
            embedder = OpenAIEmbedder(api_key=OPENAI_API_KEY, model="text-embedding-3-small")
        else:
            print("[Pathway] Configured with Local HuggingFace Sentence-Transformers (all-MiniLM-L6-v2)")
            embedder = SentenceTransformerEmbedder(model="all-MiniLM-L6-v2")

        # Create VectorStoreServer
        server = VectorStoreServer(
            *data_sources,
            embedder=embedder,
        )

        # Run Pathway internal server on localhost:8082 in background
        print("[Pathway] Starting internal REST server on http://127.0.0.1:8082")
        server.run_server(host="127.0.0.1", port=8082, threaded=True, with_cache=False)
        PATHWAY_ACTIVE = True
        print("[Pathway] Streaming Vector Index is fully active.")
    except BaseException as e:
        print(f"[Pathway Error] Failed to initialize Pathway server: {e}")
        print("[Pathway] Falling back to lightweight simulated vector/keyword engine.")
        PATHWAY_ACTIVE = False


# ============================================================
# 2. Resilient Fallback Engine (Simulated numpy / keyword RAG)
# ============================================================
fallback_documents = []  # list of { "text": str, "embedding": list, "source": str }
fallback_hashes = set()  # track which files we've indexed

fallback_embedder = None

def get_fallback_embedder():
    global fallback_embedder
    if fallback_embedder is not None:
        return fallback_embedder

    if OPENAI_API_KEY and OPENAI_API_KEY != "YOUR_OPENAI_API_KEY_HERE":
        try:
            import openai
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            def embed_openai(texts):
                resp = client.embeddings.create(model="text-embedding-3-small", input=texts)
                return [d.embedding for d in resp.data]
            fallback_embedder = embed_openai
            print("[Fallback] Using OpenAI embeddings for fallback engine")
            return fallback_embedder
        except Exception as e:
            print(f"[Fallback] OpenAI embedder failed: {e}")

    print("[Fallback] Using simple keyword-based retrieval")
    fallback_embedder = None
    return None

def fallback_keyword_search(query, k=3):
    query_words = set(query.lower().split())
    scored = []
    for doc in fallback_documents:
        doc_words = set(doc["text"].lower().split())
        overlap = len(query_words & doc_words)
        if overlap > 0:
            scored.append((overlap, doc))
    scored.sort(key=lambda x: -x[0])
    return [{"text": doc["text"], "source": doc["source"]} for _, doc in scored[:k]]

def fallback_embed_and_search(query, k=3):
    emb = get_fallback_embedder()
    if emb is None:
        return fallback_keyword_search(query, k)

    import numpy as np
    query_emb = emb([query])[0]
    query_vec = np.array(query_emb)

    scored = []
    for doc in fallback_documents:
        if not doc.get("embedding"):
            continue
        doc_vec = np.array(doc["embedding"])
        sim = np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec) + 1e-8)
        scored.append((sim, doc))

    scored.sort(key=lambda x: -x[0])
    return [{"text": doc["text"], "source": doc["source"]} for _, doc in scored[:k]]

def fallback_chunk_text(text, max_chars=1000):
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

def fallback_index_file(filepath, relative_source=None):
    path = Path(filepath)
    file_hash = hashlib.md5(f"{path.name}_{path.stat().st_mtime}".encode()).hexdigest()

    if file_hash in fallback_hashes:
        return 0

    source = relative_source or path.name

    try:
        if path.suffix.lower() == '.csv':
            text = path.read_text(encoding='utf-8', errors='ignore')
        elif path.suffix.lower() in ('.txt', '.md', '.json', '.log'):
            text = path.read_text(encoding='utf-8', errors='ignore')
        else:
            return 0

        if not text.strip():
            return 0

        chunks = fallback_chunk_text(text)
        emb = get_fallback_embedder()

        for chunk in chunks:
            doc_entry = {"text": chunk, "source": source, "embedding": []}
            if emb:
                try:
                    doc_entry["embedding"] = emb([chunk])[0]
                except Exception as e:
                    pass
            fallback_documents.append(doc_entry)

        fallback_hashes.add(file_hash)
        print(f"[Fallback] Indexed: {source} ({len(chunks)} chunks)")
        return len(chunks)
    except Exception as e:
        print(f"[Fallback Error] Failed to index {source}: {e}")
        return 0

def fallback_scan_directory():
    data_path = Path(DATA_DIR)
    if not data_path.exists():
        data_path.mkdir(parents=True, exist_ok=True)
        return

    total = 0
    for f in data_path.rglob('*'):
        if f.is_file():
            try:
                rel = f.relative_to(data_path)
                total += fallback_index_file(f, relative_source=str(rel))
            except ValueError:
                total += fallback_index_file(f)
    if total > 0:
        print(f"[Fallback] Scan complete, new chunks: {total}")

def fallback_watcher():
    while True:
        try:
            if not PATHWAY_ACTIVE:
                fallback_scan_directory()
        except Exception as e:
            pass
        time.sleep(5)


# ============================================================
# 3. Main Routing Gateway (Serves port 8081)
# ============================================================
class RAGGatewayHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/v1/retrieve":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
                query = data.get("query", "")
                k = data.get("k", 3)
                user_id = data.get("userId", None)

                results = []

                if PATHWAY_ACTIVE:
                    # Forward request to background Pathway server on port 8082
                    try:
                        req_data = json.dumps({"query": query, "k": k * 3 if user_id else k}).encode("utf-8")
                        req = urllib.request.Request(
                            "http://127.0.0.1:8082/v1/retrieve",
                            data=req_data,
                            headers={"Content-Type": "application/json"}
                        )
                        with urllib.request.urlopen(req, timeout=3) as resp:
                            p_results = json.loads(resp.read().decode("utf-8"))

                            # Standardize results from Pathway schema
                            transformed = []
                            for r in p_results:
                                text = r.get("text", "")
                                # Extract path metadata from Pathway
                                metadata = r.get("metadata", {})
                                path_val = metadata.get("path", "")

                                # Relative source mapping
                                source = path_val
                                if source.startswith(DATA_DIR):
                                    source = source[len(DATA_DIR):].lstrip("/\\")
                                if not source:
                                    source = os.path.basename(path_val) or "document"

                                transformed.append({"text": text, "source": source})
                            results = transformed
                    except Exception as e:
                        print(f"[Gateway Warning] Pathway query failed, calling fallback: {e}")
                        results = fallback_embed_and_search(query, k * 3 if user_id else k)
                else:
                    results = fallback_embed_and_search(query, k * 3 if user_id else k)

                # Filter by userId if provided
                if user_id:
                    user_prefix = f"{user_id}/"
                    filtered = []
                    for r in results:
                        if r["source"].startswith(user_prefix) or "/" not in r["source"]:
                            filtered.append(r)
                    results = filtered[:k]
                else:
                    results = results[:k]

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
        if self.path in ("/health", "/v1/statistics"):
            stats = {
                "status": "UP",
                "service": "Pathway RAG Processor",
                "pathway_active": PATHWAY_ACTIVE,
                "documents_indexed": 0,
                "unique_files": 0,
                "data_dir": DATA_DIR,
            }

            if PATHWAY_ACTIVE:
                try:
                    req = urllib.request.Request("http://127.0.0.1:8082/v1/statistics", method="GET")
                    with urllib.request.urlopen(req, timeout=1) as resp:
                        p_stats = json.loads(resp.read().decode("utf-8"))
                        if isinstance(p_stats, dict):
                            stats["documents_indexed"] = p_stats.get("nb_chunks", p_stats.get("documents_indexed", 0))
                            stats["unique_files"] = p_stats.get("nb_documents", p_stats.get("unique_files", 0))
                except Exception:
                    pass
            else:
                stats["documents_indexed"] = len(fallback_documents)
                stats["unique_files"] = len(fallback_hashes)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(stats).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Suppress noisy HTTP logs, only print queries
        pass


# ============================================================
# 4. Initializer & Runner
# ============================================================
if __name__ == "__main__":
    print("--- Pathway RAG Processor Gateway ---")
    print(f"Port: {PORT}")
    print(f"Data directory: {DATA_DIR}")

    # Create directories if not exists
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)

    # 1. Start Pathway background thread
    pathway_thread = threading.Thread(target=start_pathway_server, daemon=True)
    pathway_thread.start()

    # 2. Start fallback directory watcher thread
    fallback_thread = threading.Thread(target=fallback_watcher, daemon=True)
    fallback_thread.start()

    # 3. Start proxy Gateway HTTP server
    print(f"Gateway listening on http://{HOST}:{PORT}")
    gateway = HTTPServer((HOST, PORT), RAGGatewayHandler)
    gateway.serve_forever()
