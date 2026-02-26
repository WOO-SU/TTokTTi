import time
import logging
import chromadb
from sentence_transformers import SentenceTransformer
from typing import Dict, List

logger = logging.getLogger(__name__)

class MemoryManager:
    def __init__(self, db_path: str = "./chroma_data"):
        """
        [VINCI INTEGRATION] Dual-Memory Architecture
        Initializes the short-term sliding window and local ChromaDB for long-term memory.
        Uses a lightweight Korean embedding model fixed to the CPU to preserve VRAM for the VLM.
        """
        # Short-Term Memory: Buffer of the last 60 seconds
        self.short_term_buffer = []  # Stores dicts: {"timestamp": float, "caption": str}
        self.buffer_window_seconds = 60.0 

        # Long-Term Memory & Knowledge Base: Local ChromaDB
        self.chroma_client = chromadb.PersistentClient(path=db_path)
        
        logger.info("Loading jhgan/ko-sroberta-multitask embedding model on CPU...")
        self.embedding_model = SentenceTransformer('jhgan/ko-sroberta-multitask', device='cpu')
        
        self.long_term_collection = self.chroma_client.get_or_create_collection("long_term_memory")
        self.safety_collection = self.chroma_client.get_or_create_collection("safety_rules")
        
        self._populate_safety_rules()

    def _populate_safety_rules(self):
        """Pre-loads Korean industrial safety guidelines if the DB is empty."""
        if self.safety_collection.count() == 0:
            rules = [
                "모든 작업자는 항상 안전모(헬멧)와 고시인성 안전 조끼를 착용해야 합니다.",
                "사다리를 사용할 때는 항상 3점 지지(두 손과 한 발, 또는 두 발과 한 손)를 유지해야 합니다.",
                "깊이 1.5m 이상의 굴착 작업 시에는 붕괴 방지를 위해 흙막이 지보공을 설치해야 합니다."
            ]
            embeddings = self.embedding_model.encode(rules).tolist()
            self.safety_collection.add(
                documents=rules,
                embeddings=embeddings,
                ids=[f"rule_{i}" for i in range(len(rules))]
            )
            logger.info("Populated ChromaDB with default safety rules.")

    def add_to_short_term_memory(self, timestamp: float, caption: str):
        """Adds a new frame description to the sliding window buffer."""
        self.short_term_buffer.append({"timestamp": timestamp, "caption": caption})
        
        # Evict memories older than 60 seconds
        cutoff_time = timestamp - self.buffer_window_seconds
        self.short_term_buffer = [
            item for item in self.short_term_buffer 
            if item["timestamp"] >= cutoff_time
        ]

    def get_short_term_context(self) -> str:
        """Retrieves formatted recent events for the VLM prompt."""
        if not self.short_term_buffer:
            return "No recent events logged."
        
        lines = []
        for item in self.short_term_buffer:
            # Format as [HH:MM:SS] Action description
            t_str = time.strftime('%H:%M:%S', time.localtime(item['timestamp']))
            lines.append(f"[{t_str}] {item['caption']}")
        return "\n".join(lines)

    def add_to_long_term_memory(self, summary_text: str):
        """Embeds a VLM-generated summary and saves it to ChromaDB."""
        if not summary_text.strip():
            return
            
        timestamp = time.time()
        embedding = self.embedding_model.encode([summary_text]).tolist()[0]
        
        self.long_term_collection.add(
            documents=[summary_text],
            embeddings=[embedding],
            metadatas=[{"timestamp": timestamp}],
            ids=[f"mem_{timestamp}"]
        )
        logger.info(f"Consolidated into Long-Term Memory: {summary_text}")

    def retrieve_context(self, query_text: str, top_k: int = 2) -> Dict[str, List[str]]:
        """
        [VINCI INTEGRATION] Temporal Grounding & Context Retrieval
        Embeds the query and fetches both past historical summaries and safety guidelines.
        """
        query_embedding = self.embedding_model.encode([query_text]).tolist()
        
        # Retrieve past events
        lt_results = self.long_term_collection.query(
            query_embeddings=query_embedding,
            n_results=top_k
        )
        
        # Retrieve rules
        safety_results = self.safety_collection.query(
            query_embeddings=query_embedding,
            n_results=top_k
        )
        
        return {
            "long_term_memories": lt_results['documents'][0] if lt_results['documents'] else [],
            "safety_rules": safety_results['documents'][0] if safety_results['documents'] else []
        }