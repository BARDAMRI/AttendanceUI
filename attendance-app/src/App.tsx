import React, {useState} from 'react';
import Login from './components/Login';
import MainPage, {WorkerDetails} from './components/MainPage';
import configData from './server-config.json';
import axios from "axios";


function App() {
    const [workerDetails, setWorkerDetails] = useState<WorkerDetails>({
        firstName: "", lastName: "", manager: '', role: ""
    });

    async function loginUser(name: string, password: string): Promise<boolean> {
        try {
            // Send login request to the server
            const response = await axios.post(`${configData['server-address']}/login`, {
                name,
                password
            });

            // Extract employee details from the response
            const employeeDetails = response.data;

            console.log('Login successful:', employeeDetails);

            setWorkerDetails({
                firstName: employeeDetails.name.split(' ')[0],
                lastName: employeeDetails.name.split(' ')[1],
                role: employeeDetails.role,
                manager: employeeDetails.manager,
            });

            return true;
        } catch (error) {
            return false;
        }
    }

    function renderLogin() {
        return (
            <Login onLogin={loginUser}/>
        )
    }

    const logout = () => {
        setWorkerDetails({
            firstName: "", lastName: "", manager: '', role: ""
        })
    }

    function renderMainPage() {
        return (
            <MainPage workerDetails={workerDetails} logout={logout}/>
        );
    }

    return (
        <div className="App">
            {!workerDetails.firstName ?
                renderLogin() :
                renderMainPage()
            }
        </div>
    );
};

export default App;