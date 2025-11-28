# Railway Deployment Guide for BARTA Chat

## Prerequisites
- A [Railway](https://railway.app) account
- Git repository pushed to GitHub/GitLab

## Deployment Steps

### 1. Initial Setup
1. Go to [Railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your repository
5. Select the `sajidraian.github.io-barta` repository

### 2. Configure Project
Railway will automatically detect the Node.js project and use `npm start` to run it.

The application is already configured for Railway with:
- ✅ Dynamic PORT binding (`process.env.PORT`)
- ✅ Node.js engine specified in package.json
- ✅ Procfile for process management
- ✅ CORS enabled for all origins

### 3. Environment Variables (Optional)
No environment variables are required for basic deployment. The app uses:
- Dynamic PORT (provided by Railway)
- File system storage (persistent with Railway volumes)

### 4. Add Persistent Storage (Important!)
To persist user data, messages, and uploads:

1. In Railway dashboard, go to your service
2. Click on "Variables" tab
3. Add a new volume:
   - Click "New Volume"
   - Mount path: `/app/database`
4. Add another volume for uploads:
   - Click "New Volume"
   - Mount path: `/app/uploads`

### 5. Deploy
1. Railway will automatically deploy on every push to your main branch
2. Wait for build and deployment to complete
3. Click on the generated URL to access your app

### 6. Custom Domain (Optional)
1. In Railway dashboard, click "Settings"
2. Scroll to "Domains"
3. Click "Generate Domain" for a free Railway subdomain
4. Or add your custom domain

## Post-Deployment

### Testing
1. Access your Railway URL
2. Register a new user
3. Login and test chat functionality
4. Open in two browsers to test real-time messaging

### Monitoring
- Check logs in Railway dashboard under "Deployments" > "View Logs"
- Monitor resource usage in the "Metrics" tab

## Important Notes

### Storage Persistence
- Without volumes, `database/` and `uploads/` will reset on each deployment
- Add Railway volumes to persist data (see step 4 above)

### Scaling Considerations
For production use, consider:
- Replace JSON file storage with a real database (PostgreSQL, MongoDB)
- Use cloud storage for uploads (AWS S3, Cloudinary)
- Implement password hashing (bcrypt)
- Add JWT authentication
- Enable HTTPS only
- Rate limiting for API endpoints

### Known Limitations
- JSON file storage is not suitable for high traffic
- No password encryption (add bcrypt for production)
- Polling-based real-time updates (consider WebSockets for better performance)

## Troubleshooting

### Build Fails
- Check Node.js version in package.json matches Railway's
- Verify all dependencies are in package.json
- Check build logs for specific errors

### App Crashes
- View logs in Railway dashboard
- Ensure PORT environment variable is properly used
- Check file system permissions

### Database Not Persisting
- Add Railway volumes for `/app/database` and `/app/uploads`
- Verify volumes are mounted correctly

## Support
For Railway-specific issues, check:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
