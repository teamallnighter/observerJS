// Live API Data Explorer - PERSISTENT VERSION
// Now you can start/stop/restart without reloading!

// Global variables to track our monitoring
var songAPI;
var selectedTrackAPI;
var allObservers = [];
var displayInterval;
var isMonitoring = false;

// Debug function to confirm script loaded
post("Live API Data Explorer script loaded successfully!");
post("Functions available: start, stop, restart, status, help, quick");

// Simple test function first
function test() {
    post("TEST FUNCTION WORKS!");
    return "success";
}

// Message handlers - these let you control the script
function start() {
    if (isMonitoring) {
        post("=== ALREADY MONITORING - Use 'stop' first ===");
        return;
    }
    
    post("=== LIVE API DATA EXPLORER STARTED ===");
    post("Work on your project normally - data will appear below");
    post("");
    
    isMonitoring = true;
    setupAllMonitoring();
}

function stop() {
    if (!isMonitoring) {
        post("=== NOT CURRENTLY MONITORING ===");
        return;
    }
    
    post("=== STOPPING ALL MONITORING ===");
    cleanupAll();
    isMonitoring = false;
}

function restart() {
    stop();
    // Small delay to ensure cleanup completes
    var restartTask = new Task(function() {
        start();
    });
    restartTask.schedule(100);
}

function status() {
    post("=== MONITORING STATUS:", isMonitoring ? "ACTIVE" : "STOPPED", "===");
    post("Active observers:", allObservers.length);
    post("Visual display:", displayInterval ? "ON" : "OFF");
}

// Cleanup function - this is what stop() calls to properly clean up everything
function cleanupAll() {
    // Clear all observers by setting them to null
    for (var i = 0; i < allObservers.length; i++) {
        if (allObservers[i]) {
            allObservers[i] = null;
        }
    }
    allObservers = []; // Reset the array to empty
    
    // Clear display task if it's running (using Max's Task system instead of browser intervals)
    if (displayInterval) {
        displayInterval.cancel(); // Task objects use cancel() instead of clearInterval()
        displayInterval = null;
    }
    
    // Clear main APIs
    songAPI = null;
    selectedTrackAPI = null;
}

// Main setup function - this is what start() calls to begin monitoring
function setupAllMonitoring() {
    // Create the main song API object to interact with Live
    songAPI = new LiveAPI(null, "live_set");
    
    // Set up all the different types of monitoring
    setupTransportMonitoring();    // Play/stop detection
    setupTempoMonitoring();        // Tempo changes
    setupTrackMonitoring();        // Track selection changes
    setupClipMonitoring();         // Clip launches and stops
    setupParameterMonitoring();    // Volume and pan changes
    createVisualDisplay();         // Regular status updates
}

// Transport monitoring - detects when you press play or stop in Live
function setupTransportMonitoring() {
    var transportAPI = new LiveAPI(transportCallback, "live_set");
    transportAPI.property = "is_playing";
    allObservers.push(transportAPI); // Keep track of this observer for cleanup
}

function transportCallback(args) {
    if (!isMonitoring) return; // Don't respond if we've stopped monitoring
    var isPlaying = args[1];
    post("=== TRANSPORT:", isPlaying ? "PLAYING" : "STOPPED", "===");
}

// Tempo monitoring - detects when the BPM changes
function setupTempoMonitoring() {
    var tempoAPI = new LiveAPI(tempoCallback, "live_set");
    tempoAPI.property = "tempo";
    allObservers.push(tempoAPI);
}

function tempoCallback(args) {
    if (!isMonitoring) return;
    var tempo = args[1];
    post("=== TEMPO:", tempo.toFixed(1), "BPM ===");
}

// Track monitoring - detects when you select a different track
function setupTrackMonitoring() {
    selectedTrackAPI = new LiveAPI(trackCallback, "live_set view selected_track");
    selectedTrackAPI.property = "name";
    allObservers.push(selectedTrackAPI);
}

function trackCallback(args) {
    if (!isMonitoring) return;
    var trackName = args[1];
    post("=== SELECTED TRACK:", trackName, "===");
    exploreSelectedTrack(); // Dive deeper into the selected track's properties
}

function exploreSelectedTrack() {
    if (!isMonitoring) return;
    
    var trackAPI = new LiveAPI(null, "live_set view selected_track");
    
    if (trackAPI.id != 0) { // Make sure we have a valid track
        var trackColor = trackAPI.get("color");
        var isMuted = trackAPI.get("mute");
        var isSoloed = trackAPI.get("solo");
        var isArmed = trackAPI.get("arm");
        
        post("    Track Color:", trackColor, "| Muted:", isMuted, "| Solo:", isSoloed, "| Armed:", isArmed);
        
        var devices = trackAPI.get("devices");
        post("    Devices on track:", devices.length);
    }
}

// Clip monitoring - this is where it gets really interesting!
// We monitor multiple clips across multiple tracks for launches and stops
function setupClipMonitoring() {
    if (!isMonitoring) return;
    
    post("=== Setting up clip monitoring ===");
    
    var tracksAPI = new LiveAPI(null, "live_set tracks");
    var numTracks = tracksAPI.getcount();
    
    // Monitor first 8 tracks, first 8 clips each (to avoid overwhelming output)
    var maxTracks = Math.min(numTracks, 8);
    
    for (var trackIndex = 0; trackIndex < maxTracks; trackIndex++) {
        for (var clipIndex = 0; clipIndex < 8; clipIndex++) {
            setupClipSlotObserver(trackIndex, clipIndex);
        }
    }
}

// This function sets up monitoring for a single clip slot
// We monitor both "is_playing" and "is_triggered" to catch different states
function setupClipSlotObserver(trackIndex, clipIndex) {
    var clipSlotPath = "live_set tracks " + trackIndex + " clip_slots " + clipIndex;
    
    // Callback for when a clip starts or stops playing
    var playingCallback = function(args) {
        if (!isMonitoring) return;
        var isPlaying = args[1];
        if (isPlaying) {
            post(">>> CLIP LAUNCHED: Track", trackIndex + 1, "Clip", clipIndex + 1);
        } else {
            post(">>> CLIP STOPPED: Track", trackIndex + 1, "Clip", clipIndex + 1);
        }
    };
    
    // Callback for when a clip is triggered but waiting for quantization
    var triggeredCallback = function(args) {
        if (!isMonitoring) return;
        var isTriggered = args[1];
        if (isTriggered) {
            post(">>> CLIP TRIGGERED: Track", trackIndex + 1, "Clip", clipIndex + 1, "(waiting)");
        }
    };
    
    // Create two separate observers for each clip slot
    var clipPlayingAPI = new LiveAPI(playingCallback, clipSlotPath);
    clipPlayingAPI.property = "is_playing";
    allObservers.push(clipPlayingAPI);
    
    var clipTriggeredAPI = new LiveAPI(triggeredCallback, clipSlotPath);
    clipTriggeredAPI.property = "is_triggered";
    allObservers.push(clipTriggeredAPI);
}

// Parameter monitoring - tracks mixer controls on the selected track
// This demonstrates monitoring continuously variable parameters (not just on/off states)
function setupParameterMonitoring() {
    if (!isMonitoring) return;
    
    post("=== Setting up parameter monitoring ===");
    
    // Volume callback - shows how to handle floating-point parameter values
    var volumeCallback = function(args) {
        if (!isMonitoring) return;
        var volume = args[1]; // Volume comes as a value between 0.0 and 1.0
        post(">>> VOLUME:", (volume * 100).toFixed(1) + "%");
    };
    
    // Pan callback - demonstrates handling bipolar parameters (-1 to +1)
    var panCallback = function(args) {
        if (!isMonitoring) return;
        var pan = args[1]; // Pan comes as -1 (left) to +1 (right)
        var panPercent = ((pan + 1) * 50).toFixed(1); // Convert to 0-100%
        post(">>> PAN:", panPercent + "% (Left-Right)");
    };
    
    // Set up observers for mixer device parameters on the selected track
    var volumeAPI = new LiveAPI(volumeCallback, "live_set view selected_track mixer_device volume");
    volumeAPI.property = "value";
    allObservers.push(volumeAPI);
    
    var panAPI = new LiveAPI(panCallback, "live_set view selected_track mixer_device panning");
    panAPI.property = "value";
    allObservers.push(panAPI);
}

// Visual display - creates a periodic status update using Max's Task system
// This demonstrates Max's native approach to scheduling repeated operations
function createVisualDisplay() {
    if (!isMonitoring) return;
    
    post("=== Starting visual display mode ===");
    post("Status updates every 3 seconds");
    
    // Clear any existing task to prevent multiple timers
    if (displayInterval) {
        displayInterval.cancel();
        displayInterval = null;
    }
    
    // Create a Task that runs displayCurrentStatus() every 3 seconds
    // Task is Max's native scheduling system, designed for real-time audio environments
    displayInterval = new Task(function() {
        if (!isMonitoring) {
            // If monitoring stopped, cancel this task and clean up
            if (displayInterval) {
                displayInterval.cancel();
                displayInterval = null;
            }
            return;
        }
        
        // Display the current status
        displayCurrentStatus();
        
        // Schedule the next update in 3 seconds (3000 milliseconds)
        if (isMonitoring && displayInterval) {
            displayInterval.schedule(3000);
        }
    });
    
    // Start the first execution immediately
    displayInterval.execute();
}

// This function creates a comprehensive status snapshot by querying Live directly
// Unlike the callback-based monitoring above, this actively requests current values
function displayCurrentStatus() {
    if (!isMonitoring) return;
    
    // Create fresh API objects to get current state (not cached)
    var songAPI = new LiveAPI(null, "live_set");
    var selectedTrackAPI = new LiveAPI(null, "live_set view selected_track");
    
    // Query multiple properties at once to create a status dashboard
    var isPlaying = songAPI.get("is_playing");
    var currentTempo = songAPI.get("tempo");
    var songTime = songAPI.get("current_song_time");
    var selectedTrackName = selectedTrackAPI.get("name");
    
    // Format and display the comprehensive status
    post("");
    post("=============== SESSION STATUS ===============");
    post("Transport:", isPlaying ? "PLAYING" : "STOPPED");
    post("Tempo:", currentTempo.toFixed(1), "BPM");
    post("Song Position:", songTime.toFixed(2), "beats");
    post("Selected Track:", selectedTrackName);
    
    // Add track-specific details if we have a valid selection
    if (selectedTrackAPI.id != 0) {
        var trackMute = selectedTrackAPI.get("mute");
        var trackSolo = selectedTrackAPI.get("solo");
        var trackArm = selectedTrackAPI.get("arm");
        
        post("Track State:", 
             (trackMute ? "MUTED" : "AUDIBLE"), 
             (trackSolo ? "SOLO" : ""), 
             (trackArm ? "ARMED" : ""));
    }
    
    post("=============================================");
}

// Additional control functions for user convenience
function showHelp() {
    post("");
    post("=== LIVE API DATA EXPLORER CONTROLS ===");
    post("start     - Begin monitoring");
    post("stop      - Stop monitoring");
    post("restart   - Stop and restart");
    post("status    - Show current status");
    post("help      - Show this help");
    post("quick     - Quick status check");
    post("");
}

// Alias for convenience (some people prefer typing 'help')
function help() {
    showHelp();
}

// Quick status check without starting full monitoring
// This demonstrates one-time querying vs. continuous monitoring
function quick() {
    post("=== QUICK STATUS ===");
    var songAPI = new LiveAPI(null, "live_set");
    if (songAPI.id != 0) {
        var isPlaying = songAPI.get("is_playing");
        var tempo = songAPI.get("tempo");
        var trackAPI = new LiveAPI(null, "live_set view selected_track");
        var trackName = trackAPI.get("name");
        
        post("Playing:", isPlaying, "| Tempo:", tempo.toFixed(1), "| Track:", trackName);
    } else {
        post("Cannot connect to Live");
    }
}

// Auto-run when script loads (Max calls this automatically)
function loadbang() {
    post("");
    post("=== Live API Data Explorer Ready ===");
    post("Send 'start' message to begin monitoring");
    post("Send 'help' for all commands");
    post("");
}

// Cleanup when script reloads (Max calls this when js object is deleted)
function notifydeleted() {
    cleanupAll();
}

// Message handlers - these let you control the script
function start() {
    if (isMonitoring) {
        post("=== ALREADY MONITORING - Use 'stop' first ===");
        return;
    }
    
    post("=== LIVE API DATA EXPLORER STARTED ===");
    post("Work on your project normally - data will appear below");
    post("");
    
    isMonitoring = true;
    setupAllMonitoring();
}

function stop() {
    if (!isMonitoring) {
        post("=== NOT CURRENTLY MONITORING ===");
        return;
    }
    
    post("=== STOPPING ALL MONITORING ===");
    cleanupAll();
    isMonitoring = false;
}

function restart() {
    stop();
    // Small delay to ensure cleanup completes
    var restartTask = new Task(function() {
        start();
    });
    restartTask.schedule(100);
}

function status() {
    post("=== MONITORING STATUS:", isMonitoring ? "ACTIVE" : "STOPPED", "===");
    post("Active observers:", allObservers.length);
    post("Visual display:", displayInterval ? "ON" : "OFF");
}

// Cleanup function
function cleanupAll() {
    // Clear all observers
    for (var i = 0; i < allObservers.length; i++) {
        if (allObservers[i]) {
            allObservers[i] = null;
        }
    }
    allObservers = [];
    
    // Clear display interval
    if (displayInterval) {
        clearInterval(displayInterval);
        displayInterval = null;
    }
    
    // Clear main APIs
    songAPI = null;
    selectedTrackAPI = null;
}

// Main setup function
function setupAllMonitoring() {
    // Create the main song API object
    songAPI = new LiveAPI(null, "live_set");
    
    // Set up all monitoring
    setupTransportMonitoring();
    setupTempoMonitoring();
    setupTrackMonitoring();
    setupClipMonitoring();
    setupParameterMonitoring();
    createVisualDisplay();
}

function setupTransportMonitoring() {
    var transportAPI = new LiveAPI(transportCallback, "live_set");
    transportAPI.property = "is_playing";
    allObservers.push(transportAPI);
}

function transportCallback(args) {
    if (!isMonitoring) return;
    var isPlaying = args[1];
    post("=== TRANSPORT:", isPlaying ? "PLAYING" : "STOPPED", "===");
}

function setupTempoMonitoring() {
    var tempoAPI = new LiveAPI(tempoCallback, "live_set");
    tempoAPI.property = "tempo";
    allObservers.push(tempoAPI);
}

function tempoCallback(args) {
    if (!isMonitoring) return;
    var tempo = args[1];
    post("=== TEMPO:", tempo.toFixed(1), "BPM ===");
}

function setupTrackMonitoring() {
    selectedTrackAPI = new LiveAPI(trackCallback, "live_set view selected_track");
    selectedTrackAPI.property = "name";
    allObservers.push(selectedTrackAPI);
}

function trackCallback(args) {
    if (!isMonitoring) return;
    var trackName = args[1];
    post("=== SELECTED TRACK:", trackName, "===");
    exploreSelectedTrack();
}

function exploreSelectedTrack() {
    if (!isMonitoring) return;
    
    var trackAPI = new LiveAPI(null, "live_set view selected_track");
    
    if (trackAPI.id != 0) {
        var trackColor = trackAPI.get("color");
        var isMuted = trackAPI.get("mute");
        var isSoloed = trackAPI.get("solo");
        var isArmed = trackAPI.get("arm");
        
        post("    Track Color:", trackColor, "| Muted:", isMuted, "| Solo:", isSoloed, "| Armed:", isArmed);
        
        var devices = trackAPI.get("devices");
        post("    Devices on track:", devices.length);
    }
}

function setupClipMonitoring() {
    if (!isMonitoring) return;
    
    post("=== Setting up clip monitoring ===");
    
    var tracksAPI = new LiveAPI(null, "live_set tracks");
    var numTracks = tracksAPI.getcount();
    
    // Monitor first 8 tracks, first 8 clips each (to avoid too much output)
    var maxTracks = Math.min(numTracks, 8);
    
    for (var trackIndex = 0; trackIndex < maxTracks; trackIndex++) {
        for (var clipIndex = 0; clipIndex < 8; clipIndex++) {
            setupClipSlotObserver(trackIndex, clipIndex);
        }
    }
}

function setupClipSlotObserver(trackIndex, clipIndex) {
    var clipSlotPath = "live_set tracks " + trackIndex + " clip_slots " + clipIndex;
    
    var playingCallback = function(args) {
        if (!isMonitoring) return;
        var isPlaying = args[1];
        if (isPlaying) {
            post(">>> CLIP LAUNCHED: Track", trackIndex + 1, "Clip", clipIndex + 1);
        } else {
            post(">>> CLIP STOPPED: Track", trackIndex + 1, "Clip", clipIndex + 1);
        }
    };
    
    var triggeredCallback = function(args) {
        if (!isMonitoring) return;
        var isTriggered = args[1];
        if (isTriggered) {
            post(">>> CLIP TRIGGERED: Track", trackIndex + 1, "Clip", clipIndex + 1, "(waiting)");
        }
    };
    
    var clipPlayingAPI = new LiveAPI(playingCallback, clipSlotPath);
    clipPlayingAPI.property = "is_playing";
    allObservers.push(clipPlayingAPI);
    
    var clipTriggeredAPI = new LiveAPI(triggeredCallback, clipSlotPath);
    clipTriggeredAPI.property = "is_triggered";
    allObservers.push(clipTriggeredAPI);
}

function setupParameterMonitoring() {
    if (!isMonitoring) return;
    
    post("=== Setting up parameter monitoring ===");
    
    var volumeCallback = function(args) {
        if (!isMonitoring) return;
        var volume = args[1];
        post(">>> VOLUME:", (volume * 100).toFixed(1) + "%");
    };
    
    var panCallback = function(args) {
        if (!isMonitoring) return;
        var pan = args[1];
        var panPercent = ((pan + 1) * 50).toFixed(1);
        post(">>> PAN:", panPercent + "% (Left-Right)");
    };
    
    var volumeAPI = new LiveAPI(volumeCallback, "live_set view selected_track mixer_device volume");
    volumeAPI.property = "value";
    allObservers.push(volumeAPI);
    
    var panAPI = new LiveAPI(panCallback, "live_set view selected_track mixer_device panning");
    panAPI.property = "value";
    allObservers.push(panAPI);
}

function createVisualDisplay() {
    if (!isMonitoring) return;
    
    post("=== Starting visual display mode ===");
    post("Status updates every 3 seconds");
    
    if (displayInterval) {
        clearInterval(displayInterval);
    }
    
    displayInterval = setInterval(function() {
        if (!isMonitoring) {
            clearInterval(displayInterval);
            displayInterval = null;
            return;
        }
        displayCurrentStatus();
    }, 3000);
}

function displayCurrentStatus() {
    if (!isMonitoring) return;
    
    var songAPI = new LiveAPI(null, "live_set");
    var selectedTrackAPI = new LiveAPI(null, "live_set view selected_track");
    
    var isPlaying = songAPI.get("is_playing");
    var currentTempo = songAPI.get("tempo");
    var songTime = songAPI.get("current_song_time");
    var selectedTrackName = selectedTrackAPI.get("name");
    
    post("");
    post("=============== SESSION STATUS ===============");
    post("Transport:", isPlaying ? "PLAYING" : "STOPPED");
    post("Tempo:", currentTempo.toFixed(1), "BPM");
    post("Song Position:", songTime.toFixed(2), "beats");
    post("Selected Track:", selectedTrackName);
    
    if (selectedTrackAPI.id != 0) {
        var trackMute = selectedTrackAPI.get("mute");
        var trackSolo = selectedTrackAPI.get("solo");
        var trackArm = selectedTrackAPI.get("arm");
        
        post("Track State:", 
             (trackMute ? "MUTED" : "AUDIBLE"), 
             (trackSolo ? "SOLO" : ""), 
             (trackArm ? "ARMED" : ""));
    }
    
    post("=============================================");
}

// Additional control functions
function showHelp() {
    post("");
    post("=== LIVE API DATA EXPLORER CONTROLS ===");
    post("start     - Begin monitoring");
    post("stop      - Stop monitoring");
    post("restart   - Stop and restart");
    post("status    - Show current status");
    post("help      - Show this help");
    post("quick     - Quick status check");
    post("");
}

function quick() {
    post("=== QUICK STATUS ===");
    var songAPI = new LiveAPI(null, "live_set");
    if (songAPI.id != 0) {
        var isPlaying = songAPI.get("is_playing");
        var tempo = songAPI.get("tempo");
        var trackAPI = new LiveAPI(null, "live_set view selected_track");
        var trackName = trackAPI.get("name");
        
        post("Playing:", isPlaying, "| Tempo:", tempo.toFixed(1), "| Track:", trackName);
    } else {
        post("Cannot connect to Live");
    }
}

// Auto-start when script loads
function loadbang() {
    post("");
    post("=== Live API Data Explorer Ready ===");
    post("Send 'start' message to begin monitoring");
    post("Send 'help' for all commands");
    post("");
}

// Cleanup when script reloads
function notifydeleted() {
    cleanupAll();
}