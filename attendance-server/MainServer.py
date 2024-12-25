from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


employees = [
    {"id": 1, "name": "Paul Mccartney", "role": "Full Stack Developer", "manager": "John Lennon"},
    {"id": 2, "name": "George Harrison", "role": "Backend Developer", "manager": "John Lennon"},
    {"id": 3, "name": "Ringo Starr", "role": "Frontend Developer", "manager": "John Lennon"},
    {"id": 4, "name": "John Lennon", "role": "Manager", "manager": None},  # Manager
]

submissions = [
    {"id": 1, "name": "George Harrison", "date": "12/12/2024", "start_time": "09:00", "end_time": "18:00",
     "status": "Pending"},
    {"id": 2, "name": "Ringo Starr", "date": "12/12/2024", "start_time": "10:00", "end_time": "17:00",
     "status": "Pending"},
]


class SignInOutRequest(BaseModel):
    name: str
    action: str


class ManagerRequest(BaseModel):
    name: str


@app.post("/sign-in-out")
async def sign_in_out(request: SignInOutRequest):
    # Check if the employee exists
    employee = next((emp for emp in employees if emp["name"] == request.name), None)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    action = request.action

    new_submission = {
        "id": len(submissions) + 1,
        "name": request.name,
        "date": datetime.now().strftime("%d/%m/%Y"),
        "start_time": current_time if action == "Clock In" else "",
        "end_time": current_time if action == "Clock Out" else "",
        "status": "Pending",
    }
    submissions.append(new_submission)

    return {
        "message": f"{action} successful for {request.name}",
        "employee_details": employee,
        "timestamp": current_time,
    }


@app.post("/manager-submissions")
async def get_manager_submissions(request: ManagerRequest):
    manager = next((emp for emp in employees if emp["name"] == request.name and emp["role"].lower() == "manager"), None)
    if not manager:
        raise HTTPException(status_code=403, detail="Access denied. Only managers can access this endpoint")

    employee_names = [emp["name"] for emp in employees if emp["manager"] == request.name]
    manager_submissions = [sub for sub in submissions if sub["name"] in employee_names]

    return {
        "manager": request.name,
        "submissions": manager_submissions,
    }


@app.patch("/update-submission/{submission_id}")
async def update_submission(submission_id: int, action: str):
    if action not in ["Approve", "Reject"]:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'Approve' or 'Reject'.")

    submission = next((sub for sub in submissions if sub["id"] == submission_id), None)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    submission["status"] = action

    return {
        "message": f"Submission {action.lower()}ed successfully.",
        "submission": submission,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("MainServer:app", host="127.0.0.1", port=8000, reload=True)