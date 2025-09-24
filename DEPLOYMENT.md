# Deployment Guide

This guide covers deploying the Libre Glucose Monitor application to various platforms.

## Prerequisites

- Node.js 16+ and npm installed
- Git repository cloned
- Environment variables configured

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env with your API configuration
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Access the app**
   Open http://localhost:3000 in your browser

## Production Build

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Test the build locally**
   ```bash
   npx serve -s build
   ```

3. **Build output**
   The `build/` directory contains the production-ready files.

## Deployment Options

### 1. Netlify

1. **Connect your repository**
   - Push your code to GitHub/GitLab
   - Connect your repository to Netlify

2. **Build settings**
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: 16

3. **Environment variables**
   - Add `REACT_APP_LIBRE_API_URL` in Netlify dashboard

4. **Deploy**
   - Netlify will automatically deploy on every push to main branch

### 2. Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Environment variables**
   - Add environment variables in Vercel dashboard
   - Or use `.env.local` file

### 3. GitHub Pages

1. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add scripts to package.json**
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d build"
     }
   }
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

### 4. Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM node:16-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/build /usr/share/nginx/html
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Build and run**
   ```bash
   docker build -t libre-glucose-monitor .
   docker run -p 80:80 libre-glucose-monitor
   ```

### 5. AWS S3 + CloudFront

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Upload to S3**
   ```bash
   aws s3 sync build/ s3://your-bucket-name
   ```

3. **Configure CloudFront**
   - Create CloudFront distribution
   - Set S3 as origin
   - Configure custom domain (optional)

## Environment Configuration

### Required Variables

```env
REACT_APP_LIBRE_API_URL=https://api.libreview.com
```

### Optional Variables

```env
REACT_APP_APP_NAME=Libre Glucose Monitor
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production
```

## Security Considerations

1. **HTTPS Only**
   - Ensure all production deployments use HTTPS
   - Configure redirects from HTTP to HTTPS

2. **Environment Variables**
   - Never commit `.env` files to version control
   - Use platform-specific secret management

3. **API Security**
   - Implement proper CORS policies
   - Use API keys and authentication
   - Monitor API usage and rate limits

## Performance Optimization

1. **Code Splitting**
   - React Router automatically code-splits
   - Lazy load components when possible

2. **Bundle Analysis**
   ```bash
   npm install --save-dev source-map-explorer
   npm run build
   npx source-map-explorer 'build/static/js/*.js'
   ```

3. **Caching**
   - Configure proper cache headers
   - Use service workers for offline support

## Monitoring and Analytics

1. **Error Tracking**
   - Integrate Sentry or similar service
   - Monitor JavaScript errors in production

2. **Performance Monitoring**
   - Use Lighthouse CI for performance tracking
   - Monitor Core Web Vitals

3. **User Analytics**
   - Google Analytics 4
   - Privacy-compliant tracking

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Clear node_modules and reinstall
   - Verify all dependencies are installed

2. **Environment Variables**
   - Ensure variables start with `REACT_APP_`
   - Restart development server after changes
   - Check platform-specific configuration

3. **API Issues**
   - Verify API endpoint accessibility
   - Check CORS configuration
   - Monitor network requests in browser

### Support

- Check the main README.md for troubleshooting
- Review browser console for errors
- Verify API documentation and endpoints

## Maintenance

1. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Update Node.js version when possible

2. **Backup Strategy**
   - Version control for code
   - Database backups for user data
   - Configuration backups

3. **Rollback Plan**
   - Keep previous deployments accessible
   - Test rollback procedures
   - Document rollback steps
