# 🩸 Setting Up Real Data Integration

## 🎯 **Quick Setup Options**

### **Option A: Nightscout (Recommended)**
- ✅ **Free forever**
- ✅ **Multiple device support**
- ✅ **Real-time data**
- ✅ **Complete control**

### **Option B: Libre LinkUp (Your Device)**
- ✅ **Official Libre support**
- ⚠️ **Limited to Libre devices**
- ⚠️ **May have API restrictions**

## 🚀 **Option A: Nightscout Setup (Recommended)**

### **Step 1: Deploy Nightscout to Heroku**

1. **Go to**: https://nightscout.github.io/heroku/
2. **Click**: "Deploy to Heroku" button
3. **Sign up** for free Heroku account if needed
4. **Fill in the form**:
   - **App name**: `your-name-glucose-monitor` (unique name)
   - **API_SECRET**: Create a strong password (e.g., `MySecret123!`)
   - **MONGODB_URI**: Leave as default (free MongoDB)
   - **BASE_URL**: Leave as default

5. **Click "Deploy app"**
6. **Wait for deployment** (2-3 minutes)

### **Step 2: Configure CGM Data Source**

After deployment, you'll need to set up how data gets into Nightscout:

#### **For Libre Users:**
1. **Install xDrip+** on your phone
2. **Configure xDrip+** to upload to Nightscout
3. **Scan your Libre sensor** with xDrip+
4. **Data will automatically upload** to Nightscout

#### **For Dexcom Users:**
1. **Use Nightscout uploader** app
2. **Configure with your Dexcom credentials**
3. **Data will stream automatically**

### **Step 3: Test Your Nightscout Instance**

1. **Visit your Nightscout URL**: `https://your-app-name.herokuapp.com`
2. **You should see** a glucose monitoring dashboard
3. **Check if data is flowing** (may take a few minutes)

### **Step 4: Get API Credentials**

1. **Go to your Nightscout site**
2. **Click the hamburger menu** (☰)
3. **Go to "Profile"**
4. **Note your API_SECRET** (the password you created)

## 🔧 **Option B: Libre LinkUp Setup**

### **Step 1: Create Libre LinkUp Account**

1. **Go to**: https://www.libreview.com
2. **Sign up** for an account
3. **Verify your email**
4. **Add your Libre sensor**

### **Step 2: Get API Access**

1. **Contact Libre support** for API access
2. **Request developer credentials**
3. **Wait for approval** (may take days/weeks)

## 🎯 **Integration with Our App**

### **Step 1: Update Environment Variables**

Create a `.env` file in your project root:

```env
# Nightscout Configuration (if using Nightscout)
REACT_APP_NIGHTSCOUT_URL=
REACT_APP_NIGHTSCOUT_SECRET=k:4KuxU25Ok04qv

# Libre LinkUp Configuration (if using Libre API)
REACT_APP_LIBRE_API_URL=https://api.libreview.com
REACT_APP_LIBRE_EMAIL=your-email@example.com
REACT_APP_LIBRE_PASSWORD=your-password

# Demo Mode (disable when using real data)
REACT_APP_ENABLE_DEMO_MODE=false
```

### **Step 2: Re-enable Authentication**

1. **Uncomment the authentication code** in `src/App.tsx`
2. **Uncomment the API calls** in `src/components/Dashboard.tsx`
3. **Test the connection**

### **Step 3: Test Real Data**

1. **Restart the development server**
2. **Check if real data appears**
3. **Verify data updates in real-time**

## 📱 **Device-Specific Instructions**

### **Freestyle Libre (Your Device)**

1. **Install xDrip+** from Google Play Store
2. **Open xDrip+** and go to Settings
3. **Configure Nightscout sync**:
   - **URL**: Your Nightscout URL
   - **API Secret**: Your API secret
4. **Scan your Libre sensor** with xDrip+
5. **Data will upload automatically**

### **Dexcom G6/G7**

1. **Use Nightscout uploader** app
2. **Configure with Dexcom credentials**
3. **Data streams automatically**

### **Medtronic Pumps**

1. **Use OpenAPS** or **Loop**
2. **Configure Nightscout upload**
3. **Data uploads automatically**

## 🔍 **Testing Your Setup**

### **Check Data Flow**

1. **Visit your Nightscout URL**
2. **Look for recent glucose readings**
3. **Check if data is updating**
4. **Verify sensor connection status**

### **Common Issues**

- **No data appearing**: Check sensor connection
- **API errors**: Verify API secret
- **Slow updates**: Check uploader app settings
- **Connection lost**: Restart uploader app

## 🎉 **Success Indicators**

✅ **Nightscout dashboard shows data**  
✅ **Glucose values updating**  
✅ **Trend arrows working**  
✅ **Historical data available**  
✅ **Our app connects successfully**  

## 🚨 **Troubleshooting**

### **If Nightscout Won't Deploy**
- Check Heroku account status
- Verify app name is unique
- Try different API secret

### **If No Data Appears**
- Check sensor connection
- Verify uploader app settings
- Check Nightscout logs

### **If API Connection Fails**
- Verify URL and API secret
- Check CORS settings
- Test with Postman/curl

## 📞 **Need Help?**

- **Nightscout Community**: Facebook groups
- **xDrip+ Support**: GitHub issues
- **Heroku Support**: Documentation and forums
- **Our App**: Check browser console for errors

---

**Ready to proceed?** Let me know which option you prefer, and I'll guide you through the specific setup steps!
