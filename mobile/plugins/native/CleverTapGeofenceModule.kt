package com.adrian.shopeasy

import android.location.Location
import android.os.Handler
import android.os.Looper
import android.util.Log
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
import org.json.JSONObject

class CleverTapGeofenceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val mainHandler = Handler(Looper.getMainLooper())
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
                        Log.i(TAG, "Location update received: ${location.latitude}, ${location.longitude}")
                        try {
                            cleverTapAPI.setLocation(location)
                            Log.i(TAG, "Synced location to CleverTap profile: ${location.latitude}, ${location.longitude}")
                        } catch (e: Exception) {
                            Log.w(TAG, "Failed to set location on CleverTap: ${e.message}")
                        }
                        val map = Arguments.createMap().apply {
                            putDouble("latitude", location.latitude)
                            putDouble("longitude", location.longitude)
                            putDouble("accuracy", location.accuracy.toDouble())
                            putDouble("altitude", location.altitude)
                            putDouble("speed", location.speed.toDouble())
                            putDouble("bearing", location.bearing.toDouble())
                            putDouble("time", location.time.toDouble())
                        }
                        sendEvent("CleverTapLocationUpdates", map)
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
                CTGeofenceAPI.getInstance(reactContext.applicationContext).triggerLocation()
                Log.i(TAG, "CTGeofenceAPI triggerLocation requested successfully")

                // Immediately fetch last location from FusedLocationProviderClient if available to update profile
                try {
                    val fusedClient = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(reactContext.applicationContext)
                    fusedClient.lastLocation.addOnSuccessListener { loc: Location? ->
                        if (loc != null) {
                            val ctInstance = CleverTapAPI.getDefaultInstance(reactContext.applicationContext)
                            ctInstance?.setLocation(loc)
                            Log.i(TAG, "Fused location immediately synced to CleverTap: ${loc.latitude}, ${loc.longitude}")
                        }
                    }
                } catch (e: SecurityException) {
                    Log.w(TAG, "Location permission not yet granted for FusedLocationProviderClient")
                } catch (e: Exception) {
                    Log.w(TAG, "Fused location lookup note: ${e.message}")
                }

                promise.resolve(true)
            } catch (e: IllegalStateException) {
                Log.w(TAG, "triggerLocation called before geofence SDK initialization: ${e.message}")
                promise.reject("ERR_NOT_INITIALIZED", "Geofence SDK is not initialized yet: ${e.message}", e)
            } catch (e: Exception) {
                Log.e(TAG, "triggerLocation error: ${e.message}", e)
                promise.reject("ERR_TRIGGER_LOCATION", e.message, e)
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
