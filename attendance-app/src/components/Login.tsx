import React, {useState} from 'react';
import './Login.css';

interface LoginProps {
    onLogin: (name: string, password: string) => Promise<boolean>;
}

function Login(props: LoginProps) {
    const [workerName, setWorkerName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (workerName === password) {
            if (!await props.onLogin(workerName, password)) {
                setError('Failed to login the user...');
            }
        } else {
            setError('Invalid credentials. Please try again.');
        }
    };

    return (
        <div className="login">
            <h2>Login</h2>
            <div className="login-form">
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button onClick={handleLogin}>Login</button>
                {error && <p className="error">{error}</p>}
            </div>
        </div>
    );
};

export default Login;