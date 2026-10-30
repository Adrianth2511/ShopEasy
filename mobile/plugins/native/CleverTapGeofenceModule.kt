package com.adrian.shopeasy

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.clevertap.android.geofence.CTGeofenceAPI
import com.clevertap.android.geofence.CTGeofenceSettings
import com.clevertap.android.geofence.interfaces.CTGeofenceEventsListener
import com.clevertap.android.geofence.interfaces.CTLocationUpdatesListener
import com.clevertap.android.sdk.CleverTapAPI
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.Executors

class CleverTapGeofenceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val mainHandler = Handler(Looper.getMainLooper())
    private val backgroundExecutor = Executors.newSingleThreadExecutor()
    private var isInitialized = false

    override fun getName(): String {
        return "CleverTapGeofence"
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Error emitting event $eventName: ${e.message}")
        }
    }

    private fun jsonToReactMap(jsonObject: JSONObject?): WritableMap {
        val map = Arguments.createMap()
        if (jsonObject == null) return map
        val keys = jsonObject.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            when (val value = jsonObject.opt(key)) {
                is Boolean -> map.putBoolean(key, value)
                is Int -> map.putInt(key, value)
                is Long -> map.putDouble(key, value.toDouble())
                is Double -> map.putDouble(key, value)
                is String -> map.putString(key, value)
                is JSONObject -> map.putMap(key, jsonToReactMap(value))
                null, JSONObject.NULL -> map.putNull(key)
                else -> map.putString(key, value.toString())
            }
        }
        return map
    }

    private fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    /**
     * Synchronizes a Location object with CleverTap:
     * 1. Calls cleverTapAPI.setLocation(location)
     * 2. Reverse-geocodes on a background thread to get City, State, Country
     * 3. Pushes profile properties ("City", "State", "Country", "Latitude", "Longitude")
     * 4. Pushes "Location Updated" event so CleverTap immediately flushes the location payload to server
     * 5. Emits "CleverTapLocationUpdates" event to React Native JS
     */
    private fun syncLocationToCleverTap(
        location: Location,
        source: String,
        callback: ((WritableMap) -> Unit)? = null
    ) {
        val ctInstance = CleverTapAPI.getDefaultInstance(reactContext.applicationContext)
        if (ctInstance == null) {
            Log.w(TAG, "CleverTap instance is null, cannot sync location")
            return
        }

        try {
            ctInstance.setLocation(location)
            Log.i(TAG, "Set location on CleverTap: lat=${location.latitude}, lng=${location.longitude} (source=$source)")
        } catch (e: Exception) {
            Log.w(TAG, "cleverTap.setLocation error: ${e.message}")
        }

        backgroundExecutor.execute {
            var city = ""
            var state = ""
            var country = ""

            try {
                if (Geocoder.isPresent()) {
                    val geocoder = Geocoder(reactContext.applicationContext, Locale.ENGLISH)
                    @Suppress("DEPRECATION")
                    val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                    if (!addresses.isNullOrEmpty()) {
                        val addr = addresses[0]
                        city = addr.locality ?: addr.subAdminArea ?: addr.adminArea ?: ""
                        state = addr.adminArea ?: ""
                        country = addr.countryName ?: ""
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Reverse geocoding failed: ${e.message}")
            }

            try {
                // 1. Push Profile update with City, State, Country, Latitude, Longitude
                val profileMap = HashMap<String, Any>()
                if (city.isNotEmpty()) profileMap["City"] = city
                if (state.isNotEmpty()) profileMap["State"] = state
                if (country.isNotEmpty()) profileMap["Country"] = country
                profileMap["Latitude"] = location.latitude
                profileMap["Longitude"] = location.longitude
                ctInstance.pushProfile(profileMap)

                // 2. Push event to force immediate queue flush to CleverTap servers
                val eventMap = HashMap<String, Any>()
                eventMap["Latitude"] = location.latitude
                eventMap["Longitude"] = location.longitude
                if (city.isNotEmpty()) eventMap["City"] = city
                if (country.isNotEmpty()) eventMap["Country"] = country
                eventMap["Source"] = source
                ctInstance.pushEvent("Location Updated", eventMap)

                Log.i(TAG, "Successfully pushed profile & event to CleverTap: City=$city, Country=$country, Lat=${location.latitude}, Lng=${location.longitude}")
            } catch (e: Exception) {
                Log.e(TAG, "Error pushing profile/event to CleverTap: ${e.message}")
            }

            // 3. Emit event to React Native JS on main thread
            mainHandler.post {
                val map = Arguments.createMap().apply {
                    putDouble("latitude", location.latitude)
                    putDouble("longitude", location.longitude)
                    putDouble("accuracy", location.accuracy.toDouble())
                    putDouble("altitude", location.altitude)
                    putDouble("speed", location.speed.toDouble())
                    putDouble("bearing", location.bearing.toDouble())
                    putDouble("time", location.time.toDouble())
                    putString("city", city)
                    putString("state", state)
                    putString("country", country)
                    putString("source", source)
                }
                sendEvent("CleverTapLocationUpdates", map)
                callback?.invoke(map)
            }
        }
    }

    @ReactMethod
    fun initGeofence(options: ReadableMap?, promise: Promise) {
        mainHandler.post {
            try {
                val cleverTapAPI = CleverTapAPI.getDefaultInstance(reactContext.applicationContext)
                if (cleverTapAPI == null) {
                    promise.reject("ERR_CLEVERTAP_NULL", "CleverTapAPI instance is null. Initialize CleverTap first.")
                    return@post
                }

                val bgLocation = if (options?.hasKey("bgLocation") == true) options.getBoolean("bgLocation") else true
                val logLevel = if (options?.hasKey("logLevel") == true) options.getInt("logLevel") else CleverTapAPI.LogLevel.VERBOSE.intValue()
                val accuracy = if (options?.hasKey("accuracy") == true) options.getInt("accuracy").toByte() else CTGeofenceSettings.ACCURACY_HIGH
                val fetchMode = if (options?.hasKey("fetchMode") == true) options.getInt("fetchMode").toByte() else CTGeofenceSettings.FETCH_LAST_LOCATION_PERIODIC
                val geofenceCount = if (options?.hasKey("geofenceCount") == true) options.getInt("geofenceCount") else 50
                val interval = if (options?.hasKey("interval") == true) options.getDouble("interval").toLong() else 1800000L
                val fastestInterval = if (options?.hasKey("fastestInterval") == true) options.getDouble("fastestInterval").toLong() else 1800000L
                val displacement = if (options?.hasKey("smallestDisplacement") == true) options.getDouble("smallestDisplacement").toFloat() else 200f
                val responsiveness = if (options?.hasKey("geofenceNotificationResponsiveness") == true) options.getInt("geofenceNotificationResponsiveness") else 0

                val settings = CTGeofenceSettings.Builder()
                    .enableBackgroundLocationUpdates(bgLocation)
                    .setLogLevel(logLevel)
                    .setLocationAccuracy(accuracy)
                    .setLocationFetchMode(fetchMode)
                    .setGeofenceMonitoringCount(geofenceCount)
                    .setInterval(interval)
                    .setFastestInterval(fastestInterval)
                    .setSmallestDisplacement(displacement)
                    .setGeofenceNotificationResponsiveness(responsiveness)
                    .build()

                val geofenceAPI = CTGeofenceAPI.getInstance(reactContext.applicationContext)

                // 1. Initialized Listener
                geofenceAPI.setOnGeofenceApiInitializedListener {
                    Log.i(TAG, "CTGeofenceAPI initialized callback triggered")
                    isInitialized = true
                    val map = Arguments.createMap().apply {
                        putBoolean("isInitialized", true)
                        putString("status", "initialized")
                    }
                    sendEvent("CleverTapGeofenceInitialized", map)
                }

                // 2. Geofence Events Listener (Enter & Exit)
                geofenceAPI.setCtGeofenceEventsListener(object : CTGeofenceEventsListener {
                    override fun onGeofenceEnteredEvent(jsonObject: JSONObject?) {
                        Log.i(TAG, "Geofence entered event: $jsonObject")
                        val map = jsonToReactMap(jsonObject)
                        sendEvent("CleverTapGeofenceEntered", map)
                    }

                    override fun onGeofenceExitedEvent(jsonObject: JSONObject?) {
                        Log.i(TAG, "Geofence exited event: $jsonObject")
                        val map = jsonToReactMap(jsonObject)
                        sendEvent("CleverTapGeofenceExited", map)
                    }
                })

                // 3. Location Updates Listener
                geofenceAPI.setCtLocationUpdatesListener(object : CTLocationUpdatesListener {
                    override fun onLocationUpdates(location: Location?) {
                        if (location == null) {
                            Log.i(TAG, "Location update received is null (OS has no cached location fix yet)")
                            return
                        }
                        Log.i(TAG, "Geofence SDK location update received: ${location.latitude}, ${location.longitude}")
                        syncLocationToCleverTap(location, "GeofenceSDK")
                    }
                })

                geofenceAPI.init(settings, cleverTapAPI)
                isInitialized = true
                Log.i(TAG, "CTGeofenceAPI init called successfully")

                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "CleverTap Geofence initialized")
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing CTGeofenceAPI: ${e.message}", e)
                promise.reject("ERR_GEOFENCE_INIT", e.message, e)
            }
        }
    }

    @ReactMethod
    fun triggerLocation(promise: Promise) {
        mainHandler.post {
            try {
                // 1. Notify CTGeofenceAPI
                try {
                    CTGeofenceAPI.getInstance(reactContext.applicationContext).triggerLocation()
                    Log.i(TAG, "CTGeofenceAPI triggerLocation requested successfully")
                } catch (e: Exception) {
                    Log.w(TAG, "CTGeofenceAPI triggerLocation note: ${e.message}")
                }

                // 2. Check Permissions
                if (!hasLocationPermission()) {
                    val res = Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString("message", "Location permissions (FINE or COARSE) are not granted")
                    }
                    promise.resolve(res)
                    return@post
                }

                val fusedClient = LocationServices.getFusedLocationProviderClient(reactContext.applicationContext)

                // 3. Check cached location immediately to sync fast
                try {
                    fusedClient.lastLocation.addOnSuccessListener { cachedLoc: Location? ->
                        if (cachedLoc != null) {
                            Log.i(TAG, "Cached location available, syncing immediately: ${cachedLoc.latitude}, ${cachedLoc.longitude}")
                            syncLocationToCleverTap(cachedLoc, "FusedLastLocation")
                        }
                    }
                } catch (e: SecurityException) {
                    Log.w(TAG, "lastLocation SecurityException: ${e.message}")
                }

                // 4. Actively fetch current high-accuracy fresh location
                try {
                    val cancellationTokenSource = CancellationTokenSource()
                    fusedClient.getCurrentLocation(
                        Priority.PRIORITY_HIGH_ACCURACY,
                        cancellationTokenSource.token
                    ).addOnSuccessListener { freshLoc: Location? ->
                        if (freshLoc != null) {
                            Log.i(TAG, "Fresh high-accuracy location acquired: ${freshLoc.latitude}, ${freshLoc.longitude}")
                            syncLocationToCleverTap(freshLoc, "FusedCurrentLocation") { resultMap ->
                                val res = Arguments.createMap().apply {
                                    putBoolean("success", true)
                                    putDouble("latitude", freshLoc.latitude)
                                    putDouble("longitude", freshLoc.longitude)
                                    putString("city", resultMap.getString("city") ?: "")
                                    putString("country", resultMap.getString("country") ?: "")
                                }
                                try { promise.resolve(res) } catch (_: Exception) {}
                            }
                        } else {
                            // Fallback to LocationManager (GPS or Network)
                            val locManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
                            val gpsLoc = try { locManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER) } catch (_: SecurityException) { null }
                            val netLoc = try { locManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) } catch (_: SecurityException) { null }
                            val fallback = gpsLoc ?: netLoc

                            if (fallback != null) {
                                Log.i(TAG, "Fallback location acquired: ${fallback.latitude}, ${fallback.longitude}")
                                syncLocationToCleverTap(fallback, "LocationManagerFallback") { resultMap ->
                                    val res = Arguments.createMap().apply {
                                        putBoolean("success", true)
                                        putDouble("latitude", fallback.latitude)
                                        putDouble("longitude", fallback.longitude)
                                        putString("city", resultMap.getString("city") ?: "")
                                        putString("country", resultMap.getString("country") ?: "")
                                    }
                                    try { promise.resolve(res) } catch (_: Exception) {}
                                }
                            } else {
                                Log.w(TAG, "Could not acquire location fix from GPS or network")
                                val res = Arguments.createMap().apply {
                                    putBoolean("success", false)
                                    putString("message", "Location fix pending. Ensure device GPS / Location is enabled.")
                                }
                                try { promise.resolve(res) } catch (_: Exception) {}
                            }
                        }
                    }.addOnFailureListener { err ->
                        Log.e(TAG, "getCurrentLocation failure: ${err.message}", err)
                        val res = Arguments.createMap().apply {
                            putBoolean("success", false)
                            putString("message", "Failed to get current location: ${err.message}")
                        }
                        try { promise.resolve(res) } catch (_: Exception) {}
                    }
                } catch (e: SecurityException) {
                    Log.w(TAG, "SecurityException on getCurrentLocation: ${e.message}")
                    promise.reject("ERR_PERMISSION", e.message, e)
                } catch (e: Exception) {
                    Log.e(TAG, "Error requesting getCurrentLocation: ${e.message}", e)
                    promise.reject("ERR_LOCATION", e.message, e)
                }
            } catch (e: Exception) {
                Log.e(TAG, "triggerLocation general error: ${e.message}", e)
                promise.reject("ERR_TRIGGER_LOCATION", e.message, e)
            }
        }
    }

    @ReactMethod
    fun setLocation(latitude: Double, longitude: Double, promise: Promise) {
        mainHandler.post {
            try {
                val loc = Location("ManualCustom").apply {
                    this.latitude = latitude
                    this.longitude = longitude
                    time = System.currentTimeMillis()
                }
                syncLocationToCleverTap(loc, "ManualCustom") { resultMap ->
                    val res = Arguments.createMap().apply {
                        putBoolean("success", true)
                        putDouble("latitude", latitude)
                        putDouble("longitude", longitude)
                        putString("city", resultMap.getString("city") ?: "")
                        putString("country", resultMap.getString("country") ?: "")
                    }
                    promise.resolve(res)
                }
            } catch (e: Exception) {
                Log.e(TAG, "setLocation error: ${e.message}", e)
                promise.reject("ERR_SET_LOCATION", e.message, e)
            }
        }
    }

    @ReactMethod
    fun isInitialized(promise: Promise) {
        promise.resolve(isInitialized)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    companion object {
        private const val TAG = "CleverTapGeofence"
    }
}
