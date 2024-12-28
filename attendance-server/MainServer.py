from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
client = MongoClient("mongodb://localhost:27017")
db = client.attendance_system


class SignInOutRequest(BaseModel):
    name: str
    action: str


class LoginRequest(BaseModel):
    name: str
    password: str


class LoginResponse(BaseModel):
    id: int
    name: str
    role: str
    manager: str | None


class UpdateSubmissionRequest(BaseModel):
    action: str


@app.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):

    employee = db.employees.find_one({"name": request.name})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Here we assumed the name and password will be the same.
    if request.password != employee["name"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "id": employee["id"],
        "name": employee["name"],
        "role": employee["role"],
        "manager": employee["manager"]
    }


@app.post("/sign-in-out")
async def sign_in_out(request: SignInOutRequest):
    employee = db.employees.find_one({"name": request.name})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    current_time = datetime.now()
    action = request.action

    if action == "Clock In":
        existing_sign_in = db.submissions.find_one({
            "name": request.name,
            "date": current_time.strftime("%Y-%m-%d"),
            "end_time": None
        })

        if existing_sign_in:
            raise HTTPException(
                status_code=409,
                detail="There is already a sign-in for today without a sign-out"
            )

        new_submission = {
            "name": request.name,
            "date": current_time.strftime("%Y-%m-%d"),
            "start_time": current_time.strftime("%H:%M:%S"),
            "end_time": None,
            "status": "Pending"
        }
        db.submissions.insert_one(new_submission)
        print('returning')
        return {
            "message": f"Sign-in successful for {request.name}",
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S")
        }

    elif action == "Clock Out":
        last_sign_in = db.submissions.find_one({
            "name": request.name,
            "end_time": None
        }, sort=[("_id", -1)])

        if not last_sign_in:
            raise HTTPException(
                status_code=401,
                detail="No previous sign-in found without a sign-out"
            )

        db.submissions.update_one(
            {"_id": last_sign_in["_id"]},
            {"$set": {"end_time": current_time.strftime("%H:%M:%S")}}
        )
        return {
            "message": f"Sign-out successful for {request.name}",
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S")
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'Clock In' or 'Clock Out'.")


def serialize_document(doc):
    doc["_id"] = str(doc["_id"])
    return doc


@app.get("/manager-submissions/{manager_name}")
async def get_manager_submissions(manager_name: str):
    worker_details = db.employees.find_one({"name": manager_name})
    if not worker_details['manager'] is None:
        raise HTTPException(status_code=411, detail="Access denied. User is not a manager.")

    employees = db.employees.find({"manager": manager_name})
    employee_names = [emp["name"] for emp in employees]

    submissions = db.submissions.find({"name": {"$in": employee_names}})
    submission_list = [serialize_document(sub) for sub in submissions]
    if not submission_list:
        return list([])

    return submission_list


@app.delete("/manager-submissions/{manager_name}")
async def reset_manager_submissions(manager_name: str):
    manager = db.employees.find_one({"name": manager_name, "role": "Manager"})
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found.")

    # Get employees managed by this manager
    employees = db.employees.find({"manager": manager_name})
    employee_names = [emp["name"] for emp in employees]

    # Delete submissions for managed employees
    result = db.submissions.delete_many({"name": {"$in": employee_names}})
    return {"message": f"Deleted {result.deleted_count} submissions."}


@app.patch("/update-submission/{submission_id}")
async def update_submission(submission_id: str, request: UpdateSubmissionRequest):
    # Validate the result value
    if request.action not in ["Approve", "Reject"]:
        raise HTTPException(status_code=400, detail="Invalid result. Must be 'Approved' or 'Rejected'.")

    # Find and update the submission
    result = db.submissions.update_one(
        {"_id": ObjectId(submission_id), "status": "Pending"},
        {"$set": {"status": request.action}}
    )

    # Check if the submission was found and updated
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found or already updated.")

    return {"message": f"Submission updated to {request.action}"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("MainServer:app", host="127.0.0.1", port=8000, reload=True)
