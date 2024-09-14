import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username === 'admin' && password === 'admin') {
      // Navigate to the Mapbox page
      navigate('/mapbox');
    } else {
      // Show an error message if credentials are incorrect
      setError('Invalid username or password');
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-xs">
      <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      <input
        type="text"
        placeholder="Username"
        className="border border-gray-300 rounded px-4 py-2 w-full mb-4 focus:outline-none focus:border-blue-500"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="border border-gray-300 rounded px-4 py-2 w-full mb-4 focus:outline-none focus:border-blue-500"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        onClick={handleLogin}
        className="bg-green-500 text-white py-2 px-4 rounded-lg w-full hover:bg-green-600 transition"
      >
        Login
      </button>
    </div>
  );
};

export default LoginForm;
