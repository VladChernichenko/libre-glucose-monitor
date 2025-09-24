# JWT Authentication Setup

## Overview
The frontend now includes JWT authentication that integrates with the backend JWT authentication system. This provides secure user authentication with token-based sessions.

## Features

### 🔐 Authentication Features
- **User Registration**: Create new accounts with username, email, full name, and password
- **User Login**: Secure login with username and password
- **JWT Token Management**: Automatic token storage and refresh
- **Session Persistence**: Users stay logged in across browser sessions
- **Automatic Token Refresh**: Tokens are automatically refreshed when they expire
- **Secure Logout**: Proper token cleanup on logout

### 🛡️ Security Features
- **JWT Access Tokens**: Short-lived access tokens (1 hour)
- **JWT Refresh Tokens**: Long-lived refresh tokens (24 hours)
- **Automatic Token Injection**: All API calls automatically include authentication headers
- **Token Validation**: Backend validates all requests
- **Secure Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)

## Backend Integration

### Required Backend Endpoints
The frontend expects the following backend endpoints:

```
POST /api/auth/login
POST /api/auth/register  
POST /api/auth/refresh
GET  /api/auth/test
GET  /api/users/me
```

### Backend Configuration
The backend should be configured with:
- JWT secret key
- Access token expiration (1 hour)
- Refresh token expiration (24 hours)
- CORS enabled for frontend domain

## Frontend Configuration

### Environment Variables
Create a `.env` file with:

```env
# Backend Configuration
REACT_APP_BACKEND_URL=http://localhost:8080

# Other configurations...
REACT_APP_NIGHTSCOUT_URL=your-nightscout-url
REACT_APP_ENABLE_DEMO_MODE=false
```

### Components Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Authentication state management
├── services/
│   └── authService.ts           # JWT authentication service
├── components/
│   └── JwtLoginForm.tsx         # Login/Register form
├── types/
│   └── auth.ts                  # Authentication type definitions
└── App.tsx                      # Main app with auth provider
```

## Usage

### 1. Starting the Application
```bash
npm start
```

### 2. Testing Backend Connection
- Click "Test Backend Connection" on the login page
- Should show "✅ Backend connection successful!" if backend is running

### 3. User Registration
1. Click "Don't have an account? Sign up" on login page
2. Fill in username, email, full name, and password
3. Click "Create Account"
4. User will be automatically logged in

### 4. User Login
1. Enter username and password
2. Click "Sign in"
3. User will be redirected to dashboard

### 5. Logout
- Click "Logout" button in the dashboard header
- User will be redirected to login page

## API Integration

### Automatic Token Injection
All API calls made through the `authService` automatically include the JWT token:

```typescript
// Token is automatically added to headers
const response = await authService.api.get('/api/protected-endpoint');
```

### Token Refresh
When an API call returns 401, the system automatically:
1. Attempts to refresh the token using the refresh token
2. Retries the original request with the new token
3. If refresh fails, redirects to login page

### Manual Token Access
```typescript
import { authService } from '../services/authService';

// Get current access token
const token = authService.getAccessToken();

// Check if user is authenticated
const isAuth = authService.isAuthenticated();
```

## Security Considerations

### Production Recommendations
1. **Use HTTPS**: Always use HTTPS in production
2. **HttpOnly Cookies**: Consider storing tokens in httpOnly cookies instead of localStorage
3. **Token Rotation**: Implement token rotation for refresh tokens
4. **Rate Limiting**: Implement rate limiting on auth endpoints
5. **Password Policy**: Enforce strong password requirements
6. **Account Lockout**: Implement account lockout after failed attempts

### Current Implementation
- Tokens stored in localStorage (accessible via JavaScript)
- Access tokens expire after 1 hour
- Refresh tokens expire after 24 hours
- Automatic token refresh on 401 responses

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Ensure backend is running on `http://localhost:8080`
   - Check CORS configuration on backend
   - Verify `/api/auth/test` endpoint is accessible

2. **Login/Register Fails**
   - Check backend logs for validation errors
   - Verify all required fields are provided
   - Check password requirements (minimum 6 characters)

3. **Token Refresh Issues**
   - Check refresh token expiration
   - Verify JWT secret configuration
   - Check backend token validation logic

4. **CORS Errors**
   - Ensure backend CORS is configured for frontend domain
   - Check if backend allows credentials

### Debug Information
- Check browser console for authentication errors
- Use "Test Backend Connection" button to verify connectivity
- Check Network tab for failed API requests

## Development

### Adding Protected Routes
```typescript
import { useAuth } from '../contexts/AuthContext';

const ProtectedComponent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;
  
  return <div>Protected content</div>;
};
```

### Custom API Calls with Auth
```typescript
import { authService } from '../services/authService';

const makeAuthenticatedCall = async () => {
  try {
    const response = await authService.api.get('/api/protected-data');
    return response.data;
  } catch (error) {
    // Token refresh is handled automatically
    console.error('API call failed:', error);
  }
};
```

## Next Steps

1. **Test the authentication flow** with the backend
2. **Add user profile management** features
3. **Implement password reset** functionality
4. **Add email verification** for new accounts
5. **Implement role-based access control** if needed
6. **Add session management** features
