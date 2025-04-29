from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging, os, asyncio, requests
from typing import Dict

# ====== FastAPI Setup ======
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

# ====== Config ======
LLM_API_URL = "https://74a7-129-63-116-34.ngrok-free.app/chat"

system_prompt_template = (
    "You are a medical expert who is having a conversation with a patient to help them understand the key details "
    "of their discharge note. You will explain their diagnosis, treatment plan, medications, procedures during the "
    "hospital stay and follow-up instructions in a clear and supportive manner. Your dialogue will be 1-2 sentences "
    "in length, and you should encourage the patient to ask questions if anything is unclear."
)

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

            if patient_id in llm_patients:
                # Handle LLM chat via /chat
                history = llm_histories.setdefault(patient_id, [])
                history.append({"role": "user", "content": msg})
                note = discharge_notes.get(patient_id, "")

                try:
                    response = requests.post(
                        LLM_API_URL,
                        json={
                            "note": note,
                            "message": msg,
                            "history": history
                        },
                        timeout=15
                    )
                    response.raise_for_status()
                    reply = response.json().get("reply", "[Empty reply]")
                except Exception as e:
                    logging.exception("LLM API call failed")
                    reply = f"[Error fetching LLM response: {str(e)}]"

                history.append({"role": "assistant", "content": reply})
                await websocket.send_text(reply)

            elif patient_id in pairings:
                expert_id = pairings[patient_id]
                expert_ws = expert_connections.get(expert_id)
                if expert_ws:
                    await expert_ws.send_text(msg)
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

    # Send existing note if paired
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
                    await patient_ws.send_text(msg)
                else:
                    await websocket.send_text("Patient disconnected.")
            else:
                await websocket.send_text("No patient assigned.")
    except WebSocketDisconnect:
        logging.info(f"Expert {expert_id} disconnected.")
        expert_connections.pop(expert_id, None)
