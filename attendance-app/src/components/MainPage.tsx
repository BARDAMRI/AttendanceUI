import React, {useEffect, useState} from 'react';
import './MainPage.css';
import axios from 'axios';
import configData from '../server-config.json';

interface Submission {
    _id: string;
    id: number;
    name: string;
    date: string;
    start_time: string;
    end_time: string;
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
    logout: () => void;
}

interface BannerMessage {
    message: string;
    color: 'red' | 'green';
    displayed: boolean;
}

export enum Action {
    Approve = 'Approve',
    Reject = 'Reject',
    Pending = 'Pending'
}

function MainPage(props: MainPageProps) {
    const [submittedRequests, setSubmittedRequests] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [popup, setPopup] = useState<BannerMessage>({color: "green", displayed: false, message: ""})
    const [popupAction, setPopupAction] = useState<'Clock In' | 'Clock Out' | null>(null);
    const [reportText, setReportText] = useState('');
    const [banner, setBanner] = useState<BannerMessage>({color: "green", displayed: false, message: ""})

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                if (props.workerDetails.role.toLowerCase() === 'manager') {
                    const fullName = `${props.workerDetails.firstName} ${props.workerDetails.lastName}`;
                    const submissionsResponse = await axios.get<Submission[]>(
                        `${configData['server-address']}/manager-submissions/${fullName}`
                    );
                    setSubmittedRequests(submissionsResponse.data);
                } else {
                    setSubmittedRequests([]);
                }
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    const errorMessage = error.response?.data?.detail || "An unexpected error occurred.";
                    console.error('Failed to fetch submissions:', errorMessage);
                    showBanner(errorMessage, 'red');
                } else {
                    console.error('Failed to fetch submissions:', error);
                    showBanner('Failed to fetch submissions. Please try again.', 'red');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [props.workerDetails]);

    const handleClockAction = (action: 'Clock In' | 'Clock Out') => {
        setPopupAction(action);
        setPopup({
            ...popup,
            displayed: true,
            message: `Insert request to ${action} action`
        });
    };

    const handleSave = async () => {
        setLoading(true);

        try {
            const response = await axios.post(`${configData['server-address']}/sign-in-out`, {
                name: props.workerDetails.firstName + ' ' + props.workerDetails.lastName,
                action: popupAction,
                details: reportText,
            });
            showBanner(response.data.message, response.status === 200 ? 'green' : 'red');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.detail || "An unexpected error occurred.";
                console.error('Failed to perform the sign action:', errorMessage);
                showBanner(errorMessage, 'red');
            } else {
                console.error('Failed to perform the sign action:', error);
                showBanner('Failed to perform the sign action. Please try again.', 'red');
            }
        } finally {
            setLoading(false);
            setPopup({...popup, displayed: false});
            setReportText('');
        }
    };

    const handleTableAction = async (id: string, action: Action.Approve | Action.Reject) => {
        try {
            const response = await axios.patch(`${configData['server-address']}/update-submission/${id}`, {
                action,
            });
            showBanner(response.data.message, response.status === 200 ? 'green' : 'red');
            setSubmittedRequests((prev) =>
                prev.map((request) =>
                    request._id === id ? {...request, status: action} : request
                )
            );
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.detail || "An unexpected error occurred.";
                console.error('Failed to update submission:', errorMessage);
                showBanner(errorMessage, 'red');
            } else {
                console.error('Failed to update submission:', error);
                showBanner('Failed to update submission. Please try again.', 'red');
            }
        }
    };

    const handleResetRequests = async () => {
        try {
            const fullName = `${props.workerDetails.firstName} ${props.workerDetails.lastName}`;
            const response = await axios.delete(`${configData['server-address']}/manager-submissions/${fullName}`);
            showBanner(response.data.message, 'green');
            setSubmittedRequests([]); // Clear the table
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.detail || "An unexpected error occurred.";
                console.error('Failed to reset submissions:', errorMessage);
                showBanner(errorMessage, 'red');
            } else {
                console.error('Failed to reset submissions:', error);
                showBanner('Failed to reset submissions. Please try again.', 'red');
            }
        }
    };

    const showBanner = (message: string, color = 'greed') => {
        setBanner({color: color, displayed: true, message: message} as BannerMessage);
        setTimeout(() => {
            setBanner({color: color, displayed: false, message: ''} as BannerMessage);
        }, 4000);
    };
    return (
        <div className="main-page">
            <button className="logout-button" onClick={() => {
                props.logout();
            }}>
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
                    <button className="clock-button" onClick={() => handleClockAction('Clock In')}>
                        Clock In
                    </button>
                    <button className="clock-button" onClick={() => handleClockAction('Clock Out')}>
                        Clock Out
                    </button>
                </div>
            </div>

            {props?.workerDetails &&
                !props?.workerDetails?.manager &&
                <div className="submitted-requests">
                    <div className={'table-headers'}>
                        <h3>Submitted Reports</h3>
                        <button className="reset-button" onClick={handleResetRequests}>
                            Reset
                        </button>
                    </div>
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
                                <td>{request.start_time}</td>
                                <td>{request.end_time}</td>
                                <td>
                                    {request.status === Action.Pending ? (
                                        <>
                                            <button
                                                className="action-button approve"
                                                onClick={() => handleTableAction(request._id, Action.Approve)}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                className="action-button reject"
                                                onClick={() => handleTableAction(request._id, Action.Reject)}
                                            >
                                                Reject
                                            </button>
                                        </>
                                    ) : (
                                        request.status
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

            }
            <div className={`popup-banner ${banner.displayed ? 'visible' : 'hidden'}`}
                 style={{backgroundColor: banner.color}}>
                {banner.message}
            </div>

            {popup.displayed && (
                <div className="popup">
                    <textarea
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        placeholder="Enter report details..."
                    />
                    <div className="popup-buttons">
                        <button className="popup-save" onClick={handleSave}>
                            Save
                        </button>
                        <button className="popup-cancel" onClick={() => {
                            setPopup({color: 'green', message: '', displayed: false} as BannerMessage)
                            setReportText('')
                        }}>
                            Cancel
                        </button>
                    </div>
                    <br/>
                    {loading && <div className={'loading-sign'}>Loading...</div>}
                </div>
            )}
        </div>
    );
}

export default MainPage;