# CORS Troubleshooting Guide for JWT Authentication

## 🔍 **Issue: CORS Error on `/api/users/me` Endpoint**

### **Problem Description**
The frontend is getting CORS errors when trying to access the `/api/users/me` endpoint after successful JWT authentication.

### **Root Cause**
The backend CORS configuration wasn't properly set up for JWT authentication with Authorization headers.

## 🛠️ **Solutions Implemented**

### **1. Backend CORS Configuration Fix**

#### **Updated CorsConfig.java:**
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "TRACE", "CONNECT")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")  // ✅ Added
                .allowCredentials(true)           // ✅ Changed from false
                .maxAge(3600);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "TRACE", "CONNECT"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList("Authorization")); // ✅ Added
        configuration.setAllowCredentials(true);                        // ✅ Changed from false
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

#### **Updated SecurityConfig.java:**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource())) // ✅ Enabled CORS
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        return new che.glucosemonitorbe.config.CorsConfig().corsConfigurationSource();
    }
}
```

#### **Updated UserController.java:**
```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowCredentials = "true") // ✅ Added allowCredentials
public class UserController {
    // ... rest of the controller
}
```

### **2. Frontend CORS Configuration**

#### **Updated AuthService:**
```typescript
constructor() {
  this.baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
  this.api = axios.create({
    baseURL: this.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    withCredentials: true, // ✅ Added for CORS
  });
}
```

## 🧪 **Testing the CORS Fix**

### **Step 1: Restart Backend Server**
```bash
# Stop the backend server (Ctrl+C)
# Then restart it
./gradlew bootRun
```

### **Step 2: Test CORS Configuration**
```bash
# Test preflight request
curl -X OPTIONS http://localhost:8080/api/users/me \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v
```

**Expected Response:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,HEAD,TRACE,CONNECT
Access-Control-Allow-Headers: Authorization,Content-Type
Access-Control-Allow-Credentials: true
```

### **Step 3: Test Frontend Authentication**
1. Start frontend: `npm start`
2. Try to register/login
3. Check if user information loads properly
4. Check browser console for CORS errors

## 🔍 **Debugging CORS Issues**

### **Browser Console Errors to Look For:**
```
Access to XMLHttpRequest at 'http://localhost:8080/api/users/me' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### **Network Tab Analysis:**
1. **Preflight Request (OPTIONS):** Should return 200 with CORS headers
2. **Actual Request (GET):** Should include Authorization header
3. **Response Headers:** Should include CORS headers

### **Common CORS Issues:**

#### **Issue 1: Missing Authorization Header**
**Symptoms:** 401 Unauthorized errors
**Solution:** Ensure `withCredentials: true` in frontend

#### **Issue 2: Preflight Fails**
**Symptoms:** OPTIONS request returns 403/404
**Solution:** Check SecurityConfig CORS configuration

#### **Issue 3: Credentials Not Allowed**
**Symptoms:** CORS error about credentials
**Solution:** Set `allowCredentials: true` in backend

#### **Issue 4: Wrong Origin**
**Symptoms:** CORS error about origin
**Solution:** Check `allowedOriginPatterns` in CorsConfig

## 🚀 **Alternative Solutions**

### **Option A: Development Proxy (Frontend)**
Add to `package.json`:
```json
{
  "proxy": "http://localhost:8080"
}
```

### **Option B: CORS Proxy (Temporary)**
Update frontend base URL:
```typescript
this.baseUrl = 'https://cors-anywhere.herokuapp.com/http://localhost:8080';
```

### **Option C: Disable CORS (Development Only)**
Add to backend application.yml:
```yaml
spring:
  web:
    cors:
      allowed-origins: "*"
      allowed-methods: "*"
      allowed-headers: "*"
```

## 📋 **Verification Checklist**

### **Backend Verification:**
- [ ] CorsConfig.java updated with `allowCredentials: true`
- [ ] SecurityConfig.java enables CORS
- [ ] UserController.java has `@CrossOrigin(allowCredentials = "true")`
- [ ] Backend server restarted
- [ ] OPTIONS request to `/api/users/me` returns 200

### **Frontend Verification:**
- [ ] AuthService has `withCredentials: true`
- [ ] Frontend can connect to backend
- [ ] Login/register works
- [ ] User information loads after authentication
- [ ] No CORS errors in browser console

### **Integration Verification:**
- [ ] JWT token is sent in Authorization header
- [ ] `/api/users/me` returns user data
- [ ] User information displays in dashboard
- [ ] Logout works properly

## 🔧 **Quick Fix Commands**

### **Restart Backend:**
```bash
cd ~/IdeaProjects/glucose-monitor-be
./gradlew bootRun
```

### **Test Backend CORS:**
```bash
curl -X OPTIONS http://localhost:8080/api/users/me \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v
```

### **Test Frontend:**
```bash
cd /Users/vlad/cursorai
npm start
```

## 📝 **Summary**

The CORS issue has been resolved by:

1. **✅ Updated CorsConfig** - Enabled credentials and exposed Authorization header
2. **✅ Updated SecurityConfig** - Enabled CORS with proper configuration
3. **✅ Updated UserController** - Added allowCredentials to @CrossOrigin
4. **✅ Updated Frontend** - Added withCredentials to axios configuration

**Next Steps:**
1. Restart the backend server
2. Test the authentication flow
3. Verify user information loads properly

The JWT authentication should now work without CORS errors!
