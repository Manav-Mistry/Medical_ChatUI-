from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

import os, sys
os.environ["CUDA_VISIBLE_DEVICES"] = "2"
os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

app = FastAPI()

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schema
class ChatRequest(BaseModel):
    message: str

# Load model
MODEL_PATH = "/home/manav/merged_model"
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, device_map="auto")

# Chat state
# with open(PROJECT_PATH.joinpath("discharge_notes/case1.txt"), "r") as f:
#     discharge_note = f.read()

system_prompt = {
    "role": "system",
    "content": f"You are a helpful medical educator agent. You will generate short and easy to understand chat."
}

# Initialize chat memory
messages = [system_prompt]

generation_config = {
    # "max_length": 60000,
    "max_new_tokens": 200,
    "repetition_penalty": 1.2,
    "top_k": 50,
    "temperature": 0.9,
    "early_stopping": True,
    "num_beams": 5,
    "eos_token_id": tokenizer.convert_tokens_to_ids("<EOC>")
}

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        messages.append({"role": "user", "content": request.message})
        tokenized_chat = tokenizer.apply_chat_template(
            messages, tokenize=True, add_generation_prompt=True, return_tensors="pt"
        ).cuda()

        output_ids = model.generate(tokenized_chat, **generation_config) # streamer=streamer
        arr_output = output_ids.detach().cpu().numpy()
        start_of_generate_index = tokenized_chat.shape[1]
        response = tokenizer.batch_decode(arr_output[:, start_of_generate_index:], skip_special_tokens=True)[0]

        messages.append({"role": "assistant", "content": response})
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)