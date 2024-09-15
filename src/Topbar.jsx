import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBell, faUser } from '@fortawesome/free-solid-svg-icons';
import logo from './logo-1.png'; // Replace with the actual path to your PNG image

const TopBar = () => {
  return (
    <div className="bg-gray-100 text-gray-800 p-2 flex items-center justify-between shadow-md w-full fixed top-0 left-0 z-30 border-b border-gray-300"> {/* Changed border-gray-500 to border-gray-300 */}
      {/* Logo Section */}
      <div className="flex items-center">
        <a href="/" className="flex items-center hover:text-gray-600 transition duration-300">
          <img
            src={logo}
            alt="Logo"
            className="h-10 w-auto" // Ensure this size is kept
          />
        </a>
      </div>
      
      {/* Centered Search Bar Section */}
      <div className="flex-grow flex justify-center mx-4"> {/* Flex container to center search bar */}
        <div className="relative flex-grow max-w-sm"> {/* Adjusted max-w-sm for a smaller search bar */}
          <input
            type="text"
            placeholder="Search..."
            className="w-full p-1 pl-8 rounded-md bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500 transition duration-300 shadow-sm"
          />
          <button className="absolute left-0 top-1/2 transform -translate-y-1/2 pl-2 text-gray-500 hover:text-gray-700 transition duration-300">
            <FontAwesomeIcon icon={faSearch} />
          </button>
        </div>
      </div>

      {/* Icons Section */}
      <div className="flex items-center space-x-3">
        <button className="p-2 text-gray-600 hover:text-gray-800 transition duration-300">
          <FontAwesomeIcon icon={faBell} />
        </button>
        <button className="p-2 text-gray-600 hover:text-gray-800 transition duration-300">
          <FontAwesomeIcon icon={faUser} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
