# Libre Glucose Monitor

A real-time web application for monitoring glucose levels using the Freestyle Libre sensor and Libre LinkUp API. This application provides a beautiful, responsive interface for tracking glucose trends, viewing current readings, and managing multiple sensor connections.

## Features

- 🔐 **Secure Authentication** - Login with your Libre LinkUp credentials
- 📊 **Real-time Monitoring** - Live glucose readings with auto-refresh
- 📈 **Interactive Charts** - Beautiful glucose trend visualization using Recharts
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔄 **Auto-refresh** - Configurable automatic data updates
- 📊 **Multiple Time Ranges** - View data for 1h, 6h, 12h, or 24h periods
- 🎯 **Status Indicators** - Color-coded glucose level status (Low, Normal, High, Critical)
- 📊 **Trend Analysis** - View glucose trends and patterns
- 🔌 **Multi-sensor Support** - Manage multiple Libre sensor connections

## Prerequisites

- Node.js 16+ and npm
- Libre LinkUp account (https://www.libreview.com)
- Freestyle Libre sensor
- Libre LinkUp mobile app configured

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd libre-glucose-monitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_LIBRE_API_URL=https://api.libreview.com
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### First Time Setup

1. **Login**: Use your Libre LinkUp credentials to authenticate
2. **Connect Sensor**: The app will automatically detect your connected sensors
3. **View Data**: Start monitoring your glucose levels in real-time

### Dashboard Features

- **Current Reading**: Large display of current glucose level with status indicator
- **Trend Chart**: Interactive chart showing glucose trends over time
- **Time Controls**: Switch between different time ranges (1h, 6h, 12h, 24h)
- **Auto-refresh**: Toggle automatic data updates every 5 minutes
- **Sensor Selection**: Choose between multiple connected sensors
- **Status Information**: View sensor connection status and glucose ranges

### Glucose Level Interpretation

- **Low**: < 3.9 mmol/L (Red indicator)
- **Normal**: 3.9-10.0 mmol/L (Green indicator)
- **High**: 10.0-13.9 mmol/L (Yellow indicator)
- **Critical**: > 13.9 mmol/L (Red indicator)

## API Integration

This application integrates with the Libre LinkUp API to fetch real-time glucose data. The API service handles:

- User authentication
- Patient information retrieval
- Sensor connection management
- Real-time glucose data fetching
- Historical data retrieval

### API Endpoints Used

- `POST /auth/login` - User authentication
- `GET /user/profile` - Patient information
- `GET /connections` - Sensor connections
- `GET /patients/{id}/glucose` - Historical glucose data
- `GET /patients/{id}/glucose/current` - Current glucose reading

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Build Tool**: Create React App

## Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── GlucoseChart.tsx # Glucose trend chart
│   ├── GlucoseDisplay.tsx # Current glucose display
│   └── LoginForm.tsx   # Authentication form
├── services/           # API services
│   └── libreApi.ts    # Libre LinkUp API integration
├── types/              # TypeScript type definitions
│   └── libre.ts       # API data types
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
└── index.css          # Global styles
```

## Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify your Libre LinkUp credentials
   - Ensure your account is active and verified
   - Check if the API endpoint is accessible

2. **No Sensor Data**
   - Ensure your Libre sensor is properly connected
   - Verify the sensor is active in the Libre LinkUp app
   - Check sensor connection status in the dashboard

3. **Chart Not Displaying**
   - Ensure you have glucose data available
   - Check browser console for JavaScript errors
   - Verify all dependencies are properly installed

### API Rate Limits

The Libre LinkUp API may have rate limits. The application includes:
- Automatic retry logic
- Configurable refresh intervals
- Error handling for API failures

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section above
- Review the Libre LinkUp documentation
- Open an issue in the repository

## Disclaimer

This application is for educational and personal use. Always consult with healthcare professionals for medical decisions. The application is not a substitute for professional medical advice or treatment.

## Security Notes

- Credentials are stored locally in browser storage
- API tokens are managed securely
- HTTPS is required for production use
- Regular security updates are recommended
