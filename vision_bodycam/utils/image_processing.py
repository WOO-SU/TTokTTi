import base64
import io
from PIL import Image

def enforce_image_resolution(b64_string: str, max_width=1280, max_height=720) -> str:
    """
    Acts as a bouncer for incoming images.
    If the image is larger than max_width x max_height, it resizes and compresses it.
    """
    try:
        # 1. Safely handle the data URI prefix if the frontend sent it
        prefix = ""
        raw_b64 = b64_string
        if "," in b64_string:
            prefix, raw_b64 = b64_string.split(",", 1)
            prefix += "," # Keep the prefix to re-attach later

        # 2. Decode base64 to a Pillow Image object
        image_data = base64.b64decode(raw_b64)
        image = Image.open(io.BytesIO(image_data))

        # 3. Check if resizing is actually needed
        if image.width <= max_width and image.height <= max_height:
            return b64_string # Pass-through! It's already small enough.

        # 4. Resize the image (thumbnail maintains aspect ratio automatically)
        # Using LANCZOS filter for high-quality downsampling
        image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        # 5. Convert to standard RGB (Prevents errors if the original was a transparent PNG)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        # 6. Compress and save to an in-memory buffer
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=80)

        # 7. Re-encode to base64
        optimized_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        # 8. Return with the original prefix (if there was one)
        return prefix + optimized_b64

    except Exception as e:
        print(f"Gateway Image Optimization Error: {e}")
        # If something goes wrong, return the original string so the pipeline doesn't crash completely
        return b64_string