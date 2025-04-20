from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoModelForCausalLM, AutoTokenizer
import logging, os, torch
from typing import Dict
import asyncio

# ====== Setup ======
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

logging.basicConfig(level=logging.INFO)

# ====== LLM Model Setup ======
# MODEL_PATH = "/home/manav/merged_model"
# MODEL_PATH = "/home/wjang/2024_chatbot_noteaid/model/gguf/ppo/chatbot1"
MODEL_PATH = "memy85/chatbot_noteaid_ppo"


tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, device_map="auto")

system_prompt_template = "You are a medical expert who is having a conversation with a patient to help them understand the key details of their discharge note. You will explain their diagnosis, treatment plan, medications, procedures during the hospital stay and follow-up instructions in a clear and supportive manner. Your dialogue will be 1-2 sentences in length, and you should encourage the patient to ask questions if anything is unclear."

generation_config = {
    "max_new_tokens": 100,
    "repetition_penalty": 1.2,
    "top_k": 50,
    "temperature": 0.2,
    "early_stopping": True,
    "num_beams": 10,
    # "eos_token_id": tokenizer.convert_tokens_to_ids("<EOC>")
}

# ====== Session Stores ======
patient_connections: Dict[str, WebSocket] = {}
expert_connections: Dict[str, WebSocket] = {}
llm_histories: Dict[str, list] = {}
discharge_notes: Dict[str, str] = {}

# Pairings for 1-to-1 patient-expert chats
pairings: Dict[str, str] = {
    "patient1": "expert1",
    "patient2": "expert2",
    "patient3": "expert3",
    "patient4": "expert4",
    "patient5": "expert5"
}

# Patients who chat with LLM
llm_patients = {"patient6", "patient7", "patient8", "patient9", "patient10"}

# ====== Discharge Note Upload ======
@app.post("/upload-note")
async def upload_note(file: UploadFile = File(...), patient_id: str = ""):
    try:
        content = await file.read()
        note = content.decode("utf-8")
        discharge_notes[patient_id] = note
        logging.info(f"Note uploaded for {patient_id}")

        # Notify expert if connected
        expert_id = pairings.get(patient_id)
        expert_ws = expert_connections.get(expert_id)
        if expert_id and expert_ws:
            await expert_ws.send_text(f"[Discharge Note for {patient_id}]:\n{note}")

        return {"message": "Discharge note uploaded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ====== Patient WebSocket ======
@app.websocket("/ws/patient")
async def patient_socket(websocket: WebSocket):
    patient_id = websocket.query_params.get("user_id")
    await websocket.accept()
    patient_connections[patient_id] = websocket
    logging.info(f"Patient {patient_id} connected.")

    try:
        while True:
            msg = await websocket.receive_text()

            # LLM-based patient
            if patient_id in llm_patients:
                history = llm_histories.setdefault(patient_id, [])
                history.append({"role": "user", "content": msg})

                note = discharge_notes.get(patient_id, "")
                system_message = {
                    "role": "system",
                    "content": f"{system_prompt_template}\n\nDischarge Note:\n{note}"
                }
                chat = [system_message] + history

                tokenized = tokenizer.apply_chat_template(chat, tokenize=True, add_generation_prompt=True, return_tensors="pt").cuda()
                tokenizer.pad_token_id = tokenizer.eos_token_id
                output_ids = model.generate(tokenized, **generation_config)
                start = tokenized.shape[1]
                reply = tokenizer.batch_decode(output_ids[:, start:], skip_special_tokens=True)[0]

                history.append({"role": "assistant", "content": reply})

                # Setting Delay 20wpm
                # delay = min(20, len(reply) * 0.05)
                # await asyncio.sleep(delay)

                await websocket.send_text(reply)

            # Human expert pairing
            elif patient_id in pairings:
                expert_id = pairings[patient_id]
                expert_ws = expert_connections.get(expert_id)
                if expert_ws:
                    await expert_ws.send_text(f"{msg}")
                else:
                    await websocket.send_text("No expert available.")
            else:
                await websocket.send_text("You are not paired or recognized.")

    except WebSocketDisconnect:
        logging.info(f"Patient {patient_id} disconnected.")
        patient_connections.pop(patient_id, None)

# ====== Expert WebSocket ======
@app.websocket("/ws/expert")
async def expert_socket(websocket: WebSocket):
    expert_id = websocket.query_params.get("user_id")
    await websocket.accept()
    expert_connections[expert_id] = websocket
    logging.info(f"Expert {expert_id} connected.")

    # On connect, send patient note if paired
    patient_id = next((p for p, e in pairings.items() if e == expert_id), None)
    if patient_id:
        note = discharge_notes.get(patient_id)
        if note:
            await websocket.send_text(f"[Discharge Note for {patient_id}]:\n{note}")

    try:
        while True:
            msg = await websocket.receive_text()
            patient_id = next((p for p, e in pairings.items() if e == expert_id), None)
            if patient_id:
                patient_ws = patient_connections.get(patient_id)
                if patient_ws:
                    await patient_ws.send_text(f"{msg}")
                else:
                    await websocket.send_text("Patient disconnected.")
            else:
                await websocket.send_text("No patient assigned.")
    except WebSocketDisconnect:
        logging.info(f"Expert {expert_id} disconnected.")
        expert_connections.pop(expert_id, None)
