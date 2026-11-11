import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, socket } from '../api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(emailOrData, password, role, name, cnic, phone, businessName, businessRegNumber) {
    const payload = typeof emailOrData === 'object' && emailOrData !== null
      ? emailOrData
      : { email: emailOrData, password, role, name, cnic, phone, businessName, businessRegNumber };

    const { data } = await authAPI.register(payload);
    localStorage.setItem('token', data.token);
    setCurrentUser(data.user);
    setUserData(data.user);
    connectUserSocket(data.user);
    return data;
  }

  const connectUserSocket = (user) => {
    const uid = user?.id || user?._id;
    if (!uid) return;
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join', uid.toString());
  };

  async function refreshUser() {
    const { data } = await authAPI.getMe();
    setCurrentUser(data);
    setUserData(data);
    connectUserSocket(data);
    return data;
  }

  async function login(email, password) {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('token', data.token);
    setCurrentUser(data.user);
    setUserData(data.user);
    connectUserSocket(data.user);
    return data;
  }

  function logout() {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setUserData(null);
    socket.disconnect();
  }

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await authAPI.getMe();
          setCurrentUser(data);
          setUserData(data);
          socket.connect();
          socket.emit('join', (data.id || data._id)?.toString());
        } catch (e) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const value = { currentUser, userData, login, signup, register: signup, logout, refreshUser };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-orange-600 animate-spin" />
          <p className="mt-4 text-xs font-bold tracking-widest text-slate-600 uppercase">Connecting to Logistics Hub</p>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}
