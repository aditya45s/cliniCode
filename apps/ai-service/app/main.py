from fastapi import FastAPI
from pydantic import BaseModel, Field
import re

app = FastAPI(title="CareKare AI Service", version="1.0.0")

class Complaint(BaseModel):
    text: str = Field(min_length=3, max_length=4000)

class StructuredFinding(BaseModel):
    symptoms: list[str]
    duration: str | None = None
    location: str | None = None
    associatedSymptoms: list[str] = []
    recommendedDepartment: str
    confidence: float
    uncertainties: list[str] = []

class RiskRequest(BaseModel):
    symptoms: list[str] = []
    text: str = ""

@app.get("/health")
def health():
    return {"status": "ok", "service": "carekare-ai", "provider": "mock"}

@app.post("/understand", response_model=StructuredFinding)
def understand(payload: Complaint):
    text = payload.text.lower()
    symptoms = []
    for label, pattern in [("stomach pain", r"stomach|abdomen|abdominal"), ("nausea", r"nausea|queasy"), ("cough", r"cough"), ("dizziness", r"dizz")]:
        if re.search(pattern, text): symptoms.append(label)
    department = "Gastroenterology" if any(item in symptoms for item in ["stomach pain", "nausea"]) else "General Medicine"
    duration_match = re.search(r"(\d+)\s*(day|days|week|weeks)", text)
    return StructuredFinding(symptoms=symptoms or ["reported concern"], duration=duration_match.group(0) if duration_match else None, location="abdomen" if "stomach pain" in symptoms else None, associatedSymptoms=["nausea"] if "nausea" in symptoms else [], recommendedDepartment=department, confidence=0.92, uncertainties=[])

@app.post("/risk")
def risk(payload: RiskRequest):
    text = f"{payload.text} {' '.join(payload.symptoms)}".lower()
    if re.search(r"chest pain|difficulty breathing|fainted|unconscious|stroke", text): return {"riskLevel": "EMERGENCY", "action": "SEEK_EMERGENCY_CARE"}
    if re.search(r"severe pain|persistent vomiting|high fever|blood in", text): return {"riskLevel": "POTENTIALLY_URGENT", "action": "PROMPT_CLINICAL_ATTENTION"}
    if re.search(r"pain|vomit|dizz", text): return {"riskLevel": "MODERATE", "action": "ROUTINE_CARE_WITH_WARNING"}
    return {"riskLevel": "LOW", "action": "ROUTINE_CARE"}
