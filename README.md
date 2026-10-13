# ShopEasy - E-Commerce Application

A complete full-stack e-commerce application built with React Native (Expo) and Node.js/Express.

## Architecture
- **Frontend**: React Native (Expo), React Navigation, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT & bcrypt

## Prerequisites
- Node.js installed
- Expo CLI or Expo Go app on your phone
- MongoDB Atlas account (or local MongoDB)

## Backend Setup

1. Go to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the `backend` directory (you can copy `.env.example`):
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=7d
   ```
   *Replace `your_mongodb_connection_string` with your actual MongoDB URI and choose a random string for `JWT_SECRET`.*

4. Seed the Database with test products:
   ```bash
   node seed.js
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

## Mobile App Setup

1. Go to the `mobile` directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the API URL:
   Create a `.env` file in the `mobile` directory:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:5000/api
   ```
   *Note: Do NOT use `localhost` if testing on a physical device. Find your computer's local IP address (e.g., 192.168.1.100).*

4. Start the Expo app:
   ```bash
   npx expo start
   ```

## Next Steps for CleverTap
The mobile app contains a `services/analytics.js` file which acts as an abstraction layer for event tracking. When you're ready to integrate CleverTap:
1. Install the CleverTap React Native SDK.
2. Initialize CleverTap in your app root.
3. Update `services/analytics.js` to map tracking events to the real CleverTap SDK methods.
