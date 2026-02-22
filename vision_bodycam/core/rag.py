# gpu-server/core/rag.py
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class DynamicRetriever:
    def __init__(self):
        # In reality, load your vector database here
        self.knowledge_base = {
            "default": "All workers must wear hard hats (helmets) and high-visibility safety vests at all times.",
            "ladder": "When using a ladder, three points of contact must be maintained.",
            "excavation": "Excavations deeper than 1.5m require shoring."
        }

    def get_context(self, scene_type: str = "default") -> str:
        """
        Retrieves relevant safety rules based on what is happening.
        For now, we return a strong default rule about PPE (Personal Protective Equipment).
        """
        return self.knowledge_base.get(scene_type, self.knowledge_base["default"])