import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from './logo-1.png';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username === 'admin' && password === 'admin') {
      navigate('/mapbox');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen px-4 ">
      <div className="flex flex-col md:flex-row w-full md:w-[75vw]  h-full md:h-[75vh] shadow-xl rounded-lg overflow-hidden">
        {/* Left side: Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center bg-gray-200 p-8 relative z-10">
          <div className="max-w-md w-full">
            <img src={logo} alt="logo" className="mb-4 mx-auto w-48 h-auto" />
         
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <input
              type="text"
              placeholder="Email address"
              className="border border-gray-300 rounded px-4 py-2 w-full mb-4 focus:outline-none focus:border-blue-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="border border-gray-300 rounded px-4 py-2 w-full mb-4 focus:outline-none focus:border-blue-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-between items-center mb-4">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                Remember me
              </label>
              <a href="#" className="text-blue-600 hover:underline">Forgot password?</a>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleLogin}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg w-full hover:bg-blue-700 transition"
              >
                Login
              </button>
              <button className="bg-pink-600 text-white py-2 px-4 rounded-lg w-full hover:bg-pink-700 transition">
                Sign up
              </button>
            </div>
            <div className="flex justify-center mt-6">
             
              <a href="#" className="mx-2"><i className="fab fa-facebook text-gray-600"></i></a>
              <a href="#" className="mx-2"><i className="fab fa-twitter text-gray-600"></i></a>
              <a href="#" className="mx-2"><i className="fab fa-instagram text-gray-600"></i></a>
            </div>
          </div>
        </div>

        {/* Right side: Background */}
        <div className="w-full md:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            {/* Background gradient */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-400 w-full h-full"></div>
            {/* Geometric shapes */}
            <div className="absolute top-[-60px] right-[-80px] bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300 w-80 h-80 rounded-full"></div>
            <div className="absolute bottom-[-100px] right-0 bg-gradient-to-br from-blue-300 via-purple-400 to-pink-400 w-96 h-96 rounded-full"></div>
            <div className="absolute bottom-16 left-[-50px] bg-gradient-to-br from-blue-400 via-purple-400 to-pink-300 w-96 h-96 rounded-full"></div>
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default LoginForm;
