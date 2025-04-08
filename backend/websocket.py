from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi import UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import logging
from typing import Optional

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

# Store connections
patient_connection: Optional[WebSocket] = None
expert_connection: Optional[WebSocket] = None


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
