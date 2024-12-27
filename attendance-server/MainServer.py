from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins. Replace "*" with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
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


@app.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    # Validate employee
    employee = db.employees.find_one({"name": request.name})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check password (same as name)
    if request.password != employee["name"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Return employee details
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
                status_code=402,
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



@app.get("/manager-submissions/{manager_name}")
async def get_manager_submissions(manager_name: str):
    # Check if the user is a valid manager
    manager = db.employees.find_one({"name": manager_name, "role": {"$regex": "^Manager$", "$options": "i"}})
    if not manager:
        raise HTTPException(status_code=403, detail="Access denied. User is not a manager.")

    # Get the list of employees reporting to this manager
    employees = db.employees.find({"manager": manager_name})
    employee_names = [emp["name"] for emp in employees]

    # Find all submissions for these employees
    submissions = db.submissions.find({"name": {"$in": employee_names}})
    submission_list = list(submissions)  # Convert cursor to list

    if not submission_list:
        raise HTTPException(status_code=404, detail="No submissions found for this manager's employees.")

    return submission_list


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("MainServer:app", host="127.0.0.1", port=8000, reload=True)
