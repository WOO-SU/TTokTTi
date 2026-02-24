#!/bin/bash
# Starts the Qwen3-VL-8B (Quantized) model server
# Adjust --max-model-len if you run out of memory (try 16384 or 8192)

vllm serve cyankiwi/Qwen3-VL-8B-Instruct-AWQ-4bit \
  --quantization compressed-tensors \
  --max-model-len 16384 \
  --limit-mm-per-prompt '{"video":1,"image":5}' \
  --port 8888