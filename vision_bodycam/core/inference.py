# gpu-server/core/inference.py
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from PIL import Image
import io
import base64

class SafetyAnalyzer:
    def __init__(self, model_path="Qwen/Qwen-VL-Chat-Int4"):
        """
        Loads the Qwen-VL model to the GPU (RTX 4090).
        Using Int4 version is recommended for speed/memory efficiency on a laptop.
        """
        print("Loading AI Model to GPU... This may take a minute.")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Load Tokenizer & Model
        self.tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_path,
            device_map="auto",
            trust_remote_code=True,
            use_flash_attention_2=True # Faster inference on RTX 40 series
        ).eval()
        print("Model Loaded Successfully!")

    def process_image(self, base64_string: str) -> Image.Image:
        """Converts base64 string from phone to PIL Image"""
        image_data = base64.b64decode(base64_string)
        return Image.open(io.BytesIO(image_data)).convert("RGB")

    def detect_danger(self, image_b64: str, rag_context: str) -> dict:
        """
        The main inference function.
        Input: Base64 Image + Safety Rules (RAG Context)
        Output: JSON with safety status
        """
        image = self.process_image(image_b64)
        
        # Prompt Engineering: Combine visual input with safety manual context
        query = self.tokenizer.from_list_format([
            {'image': image},
            {'text': f"""
            You are a construction safety officer.
            
            Current Safety Rules (from Manual):
            {rag_context}
            
            Task: Analyze this image. 
            1. Identify if workers are present.
            2. Check if they are wearing required equipment mentioned in the rules (Helmet, Vest).
            3. If there is a violation, output "DANGER". If safe, output "SAFE".
            
            Output format: JSON {{ "status": "SAFE"|"DANGER", "reason": "..." }}
            """}
        ])

        # Prepare inputs
        inputs = self.tokenizer(query, return_tensors='pt')
        inputs = inputs.to(self.model.device)

        # Run Inference
        with torch.no_grad():
            pred = self.model.generate(**inputs, max_new_tokens=100)

        response_text = self.tokenizer.decode(pred.cpu()[0], skip_special_tokens=False)
        
        # Simple parsing (In production, use structured generation or regex)
        # Assuming model replies with just the JSON or text we can parse
        return self._parse_response(response_text)

    def _parse_response(self, text: str) -> dict:
        """Helper to extract status from model output"""
        # (Simplified logic)
        if "DANGER" in text:
            return {"is_danger": True, "details": text}
        return {"is_danger": False, "details": text}

# Global instance to be used by main.py
# We instantiate it as None first, then load it on startup event
analyzer_instance = None