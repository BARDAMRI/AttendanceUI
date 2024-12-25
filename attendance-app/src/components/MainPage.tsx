import React, { useState } from 'react';
import './MainPage.css';
import axios from 'axios';
import configData from '../server-config.json';

interface SignInOutResponse {
  message: string;
  employee_details: {
    id: number;
    name: string;
    role: string;
    manager: string | null;
  };
  timestamp: string;
}

interface Submission {
  id: number;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

const MainPage: React.FC = () => {
  const workerDetails = {
    firstName: 'Paul',
    lastName: 'Mccartney',
    role: 'Full Stack Developer',
    manager: 'John Lennon',
  };

  const [submittedRequests, setSubmittedRequests] = useState<Submission[]>([
    { id: 1, name: 'George Harrison', date: '12/12/2024', startTime: '09:00', endTime: '18:00', status: 'Pending' },
    { id: 2, name: 'Ringo Starr', date: '12/12/2024', startTime: '10:00', endTime: '17:00', status: 'Pending' },
  ]);

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupAction, setPopupAction] = useState<'Clock In' | 'Clock Out' | null>(null);
  const [reportText, setReportText] = useState('');
  const [loading, setLoading] = useState(false); // Loading state for server requests
  const [serverResponse, setServerResponse] = useState<SignInOutResponse | null>(null);

  const handleClockAction = async (action: 'Clock In' | 'Clock Out') => {
    setPopupAction(action);
    setPopupVisible(true);
  };

  const handleSave = async () => {
    const fullName = `${workerDetails.firstName} ${workerDetails.lastName}`;
    setLoading(true);

    try {
      const response = await axios.post<SignInOutResponse>(configData["server-address"] +'sign-in-out', {
        name: fullName,
        action: popupAction,
      });

      setServerResponse(response.data);
      console.log('Server Response:', response.data);

      const currentDate = new Date().toLocaleDateString();
      setSubmittedRequests((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          name: fullName,
          date: currentDate,
          startTime: popupAction === 'Clock In' ? '09:00' : '',
          endTime: popupAction === 'Clock Out' ? '18:00' : '',
          status: 'Pending',
        },
      ]);

      setPopupVisible(false);
      setReportText('');
      setPopupAction(null);
    } catch (error) {
      console.error('Error while communicating with the server:', error);
      alert('Failed to log the action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTableAction = (id: number, action: 'Approve' | 'Reject') => {
    setSubmittedRequests((prev) =>
      prev.map((request) =>
        request.id === id
          ? { ...request, status: action }
          : request
      )
    );
  };

  const prettify = (key: string): string => {
    return key
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize the first letter of each word
  };

  const tableHeaders = Object.keys(submittedRequests[0]).filter((key) => key !== 'id' && key !== 'status');

  return (
    <div className="main-page">
      <div className="worker-details">
        <h3>Employee Details</h3>
        <div className="details-grid">
          <p>
            <strong>First Name:</strong> {workerDetails.firstName}
          </p>
          <p>
            <strong>Last Name:</strong> {workerDetails.lastName}
          </p>
          <p>
            <strong>Role:</strong> {workerDetails.role}
          </p>
          <p>
            <strong>Manager:</strong> {workerDetails.manager}
          </p>
        </div>
        <div className="clock-buttons">
          <button
            className="clock-button"
            onClick={() => handleClockAction('Clock In')}
            disabled={loading}
          >
            Clock In
          </button>
          <button
            className="clock-button"
            onClick={() => handleClockAction('Clock Out')}
            disabled={loading}
          >
            Clock Out
          </button>
        </div>
      </div>

      <div className="submitted-requests">
        <h3>Submitted Reports</h3>
        <table>
          <thead>
            <tr>
              {tableHeaders.map((header) => (
                <th key={header}>{prettify(header)}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submittedRequests.map((request) => (
              <tr key={request.id}>
                {tableHeaders.map((header) => (
                  <td key={header}>{request[header as keyof Submission]}</td>
                ))}
                <td>
                  {request.status === 'Pending' ? (
                    <>
                      <button
                        className="action-button approve"
                        onClick={() => handleTableAction(request.id, 'Approve')}
                      >
                        Approve
                      </button>
                      <button
                        className="action-button reject"
                        onClick={() => handleTableAction(request.id, 'Reject')}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span>{request.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popupVisible && (
        <div className="popup">
          <div className="popup-content">
            <h4>{popupAction} Report</h4>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Enter report details..."
            />
            <div className="popup-buttons">
              <button onClick={handleSave} className="popup-save" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setPopupVisible(false)}
                className="popup-cancel"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;