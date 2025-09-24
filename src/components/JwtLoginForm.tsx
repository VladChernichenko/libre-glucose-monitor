import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthRequest, RegisterRequest } from '../types/auth';

interface JwtLoginFormProps {
  onLoginSuccess?: () => void;
}

const JwtLoginForm: React.FC<JwtLoginFormProps> = ({ onLoginSuccess }) => {
  const { login, register, isLoading, error, clearError, testConnection } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (formError) {
      setFormError('');
    }
    if (error) {
      clearError();
    }
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setFormError('Username is required');
      return false;
    }
    
    if (!formData.password.trim()) {
      setFormError('Password is required');
      return false;
    }

    if (isRegisterMode) {
      if (!formData.email.trim()) {
        setFormError('Email is required');
        return false;
      }
      
      if (!formData.fullName.trim()) {
        setFormError('Full name is required');
        return false;
      }
      
      if (formData.password.length < 6) {
        setFormError('Password must be at least 6 characters');
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setFormError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isRegisterMode) {
        const registerData: RegisterRequest = {
          username: formData.username,
          email: formData.email,
          fullName: formData.fullName,
          password: formData.password,
        };
        await register(registerData);
      } else {
        const loginData: AuthRequest = {
          username: formData.username,
          password: formData.password,
        };
        await login(loginData);
      }
      
      onLoginSuccess?.();
    } catch (err) {
      // Error is handled by the auth context
      console.error('Authentication failed:', err);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setFormData({
      username: '',
      email: '',
      fullName: '',
      password: '',
      confirmPassword: '',
    });
    setFormError('');
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegisterMode ? 'Create Account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isRegisterMode ? 'Join our glucose monitoring platform' : 'Access your glucose monitoring dashboard'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
              />
            </div>
            
            {isRegisterMode && (
              <>
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="fullName" className="sr-only">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
            
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                  isRegisterMode ? '' : 'rounded-b-md'
                }`}
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
            
            {isRegisterMode && (
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>

          {(error || formError) && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                {formError || error}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {isLoading ? 'Processing...' : (isRegisterMode ? 'Create Account' : 'Sign in')}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {isRegisterMode 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
            
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const isConnected = await testConnection();
                    alert(isConnected ? '✅ Backend connection successful!' : '❌ Backend connection failed');
                  } catch (error) {
                    alert('❌ Backend connection failed: ' + error);
                  }
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Test Backend Connection
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JwtLoginForm;
