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
The mobile app is integrated with CleverTap through the Expo config plugin and
`mobile/src/services/analytics.js`. The app tracks:

- `App Opened`
- `Product Viewed`
- `Product Added To Cart`
- `Checkout Started`
- `Order Completed`
- A CleverTap charged event for completed orders

### CleverTap setup

1. In CleverTap, open **Settings > Project > Project ID** and copy the
   account ID and account token for the `eu1` region.
2. Create `mobile/.env` from `mobile/.env.example` and set
   `CLEVERTAP_ACCOUNT_ID` and `CLEVERTAP_ACCOUNT_TOKEN`. Keep this file local;
   do not commit credentials.
3. For EAS builds, add the same values as EAS environment secrets:

   ```bash
   eas env:create --name CLEVERTAP_ACCOUNT_ID --value "<account-id>" --environment preview
   eas env:create --name CLEVERTAP_ACCOUNT_TOKEN --value "<account-token>" --environment preview
   eas env:create --name CLEVERTAP_ACCOUNT_ID --value "<account-id>" --environment production
   eas env:create --name CLEVERTAP_ACCOUNT_TOKEN --value "<account-token>" --environment production
   ```

4. Generate a native development build. CleverTap does not work in Expo Go:

   ```bash
   cd mobile
   npx expo prebuild
   npx expo run:android
   # or: npx expo run:ios
   ```

5. Log in or register in the development build, then verify the profile and
   events in CleverTap under **Analytics**. Events can take a few minutes to
   appear. Use a test user and test orders while validating.

Push notifications are disabled in the current plugin configuration. Enabling
them requires Firebase credentials and an Android notification setup, or APNs
credentials and an iOS notification capability; those are separate from
profile and event tracking.
