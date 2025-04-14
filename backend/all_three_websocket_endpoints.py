from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging
import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# === Setup ===
os.environ["CUDA_VISIBLE_DEVICES"] = "2"
os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

app = FastAPI()

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

# === Real-time chat connection storage ===
patient_connection: Optional[WebSocket] = None
expert_connection: Optional[WebSocket] = None

# === Load LLM model and tokenizer ===
MODEL_PATH = "/home/manav/merged_model"  # change if needed
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, device_map="auto")

# === LLM conversation memory ===
system_prompt = {
    "role": "system",
    "content": "You are a helpful medical educator agent. You will generate short and easy to understand chat."
}
messages = [system_prompt]
discharge_note = ""

generation_config = {
    "max_new_tokens": 200,
    "repetition_penalty": 1.2,
    "top_k": 50,
    "temperature": 0.9,
    "early_stopping": True,
    "num_beams": 5,
    "eos_token_id": tokenizer.convert_tokens_to_ids("<EOC>")
}

# === Upload endpoint to update discharge note context ===
@app.post("/upload-note")
async def upload_note(file: UploadFile = File(...)):
    global discharge_note, messages

    try:
        content = await file.read()
        discharge_note = content.decode("utf-8")

        system_message = {
            "role": "system",
            "content": f"You are a helpful medical educator agent. You will generate short and easy to understand chat. Here is the discharge note of the patient:\n\n{discharge_note}"
        }

        messages.clear()
        messages.append(system_message)

        logging.info("Discharge note updated for LLM.")
        return {"message": "Discharge note uploaded and system prompt updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === WebSocket: Patient ↔ Expert ===
@app.websocket("/ws/patient")
async def patient_endpoint(websocket: WebSocket):
    global patient_connection
    await websocket.accept()
    patient_connection = websocket
    logging.info("Patient connected.")

    try:
        while True:
            data = await websocket.receive_text()
            logging.info(f"Message from Patient: {data}")

            if expert_connection:
                await expert_connection.send_text(f"Patient says: {data}")
            else:
                await websocket.send_text("No expert connected. Please wait for an expert to connect.")
    except WebSocketDisconnect:
        logging.info("Patient disconnected.")
        patient_connection = None

# === WebSocket: Expert ↔ Patient ===
@app.websocket("/ws/expert")
async def expert_endpoint(websocket: WebSocket):
    global expert_connection
    await websocket.accept()
    expert_connection = websocket
    logging.info("Expert connected.")

    try:
        while True:
            message = await websocket.receive_text()
            logging.info(f"Message from Expert: {message}")

            if patient_connection:
                await patient_connection.send_text(f"Expert says: {message}")
            else:
                await websocket.send_text("No patient connected. Please wait for a patient to connect.")
    except WebSocketDisconnect:
        logging.info("Expert disconnected.")
        expert_connection = None

# === WebSocket: Patient ↔ LLM (AI) ===
@app.websocket("/ws/llm")
async def llm_chat(websocket: WebSocket):
    await websocket.accept()
    logging.info("LLM chat WebSocket connection opened.")

    try:
        while True:
            user_message = await websocket.receive_text()
            messages.append({"role": "user", "content": user_message})

            tokenized_chat = tokenizer.apply_chat_template(
                messages, tokenize=True, add_generation_prompt=True, return_tensors="pt"
            ).cuda()

            output_ids = model.generate(tokenized_chat, **generation_config)
            arr_output = output_ids.detach().cpu().numpy()
            start_of_generate_index = tokenized_chat.shape[1]
            response = tokenizer.batch_decode(arr_output[:, start_of_generate_index:], skip_special_tokens=True)[0]

            messages.append({"role": "assistant", "content": response})
            await websocket.send_text(response)

    except WebSocketDisconnect:
        logging.info("LLM WebSocket connection closed.")
    except Exception as e:
        logging.error(f"LLM error: {e}")
        await websocket.send_text(f"Error: {str(e)}")

# === Run app ===
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
