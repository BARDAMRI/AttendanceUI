import React, {useEffect, useState} from 'react';
import './MainPage.css';
import axios, {AxiosResponse} from 'axios';
import configData from '../server-config.json';

interface Submission {
    id: number;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
}


export interface WorkerDetails {
    firstName: string;
    lastName: string;
    role: string;
    manager: string | null;
}


interface MainPageProps {
    workerDetails: WorkerDetails;
    logout: () => any;
}

function MainPage(props: MainPageProps) {
    const [submittedRequests, setSubmittedRequests] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupAction, setPopupAction] = useState<'Clock In' | 'Clock Out' | null>(null);
    const [reportText, setReportText] = useState('');


    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                // Check if the worker is a manager
                if (props.workerDetails.role.toLowerCase() === 'manager') {
                    // Construct the full name of the manager
                    const fullName = `${props.workerDetails.firstName} ${props.workerDetails.lastName}`;

                    // Fetch submissions for employees managed by this manager
                    const submissionsResponse = await axios.get<Submission[]>(
                        `${configData['server-address']}/manager-submissions/${fullName}`
                    );
                    setSubmittedRequests(submissionsResponse.data);
                } else {
                    // Clear submissions if the worker is not a manager
                    setSubmittedRequests([]);
                }
            } catch (error) {
                console.error('Failed to fetch submissions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [props.workerDetails]);
    const handleClockAction = (action: 'Clock In' | 'Clock Out') => {
        setPopupAction(action);
        setPopupVisible(true);
    };

    const handleSave = async () => {
        setLoading(true);

        try {
            // TODO: Replace with the real server endpoint to log clock in/out actions
            const response = await axios.post(`${configData['server-address']}/sign-in-out`, {
                name: props.workerDetails.firstName + ' ' + props.workerDetails.lastName,
                action: popupAction,
                details: reportText,
            });
            console.log('Clock action response:', response.data);
            setPopupVisible(false);
            setReportText('');
        } catch (error) {
            console.error('Error while saving the clock action:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!props.workerDetails) {
        return <div>Failed to load worker details.</div>;
    }

    return (
        <div className="main-page">
            <button className="logout-button" onClick={props.logout}>
                Logout
            </button>
            <div className="worker-details">
                <h3>Employee Details</h3>
                <p>
                    <strong>First Name:</strong> {props.workerDetails.firstName}
                </p>
                <p>
                    <strong>Last Name:</strong> {props.workerDetails.lastName}
                </p>
                <p>
                    <strong>Role:</strong> {props.workerDetails.role}
                </p>
                <p>
                    <strong>Manager:</strong> {props.workerDetails.manager || 'None'}
                </p>
                <div className="clock-buttons">
                    <button className={'clock-button'} onClick={() => handleClockAction('Clock In')}>Clock In</button>
                    <button className={'clock-button'} onClick={() => handleClockAction('Clock Out')}>Clock Out</button>
                </div>
            </div>

            <div className="submitted-requests">
                <h3>Submitted Reports</h3>
                <table>
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {submittedRequests.map((request) => (
                        <tr key={request.id}>
                            <td>{request.name}</td>
                            <td>{request.date}</td>
                            <td>{request.startTime}</td>
                            <td>{request.endTime}</td>
                            <td>{request.status}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {popupVisible && (
                <div className="popup">
                    <textarea
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        placeholder="Enter report details..."
                    />
                    <div className={'popup-buttons'}>
                        <button className={'popup-save'} onClick={handleSave}>Save</button>
                        <button className={'popup-cancel'} onClick={() => setPopupVisible(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainPage;