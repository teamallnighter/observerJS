// Live API Data Explorer - ENHANCED RELIABILITY VERSION
// Implements graceful degradation and robust error handling

class LiveAPIMonitor {
    constructor() {
        this.observers = new Set();
        this.displayTask = null;
        this.isActive = false;
        this.config = {
            updateInterval: 3000,
            maxTracks: 8,
            maxClips: 8,
            enablePeriodicDisplay: true, // Can be toggled for less verbose output
            retryFailedQueries: true
        };
        
        // Track connection health for adaptive behavior
        this.connectionHealth = {
            transportQueries: 0,
            transportSuccess: 0,
            sessionQueries: 0,
            sessionSuccess: 0
        };
        
        post("Live API Monitor V8 Enhanced - Reliability improvements loaded");
    }

    startMonitoring() {
        if (this.isActive) {
            post("=== ALREADY MONITORING - Use stop() first ===");
            return;
        }
        
        post("=== LIVE API DATA EXPLORER V8 ENHANCED STARTED ===");
        post("Event-driven monitoring with robust error handling");
        post("");
        
        this.isActive = true;
        this.initializeAllSystems();
    }

    stopMonitoring() {
        if (!this.isActive) {
            post("=== NOT CURRENTLY MONITORING ===");
            return;
        }
        
        post("=== STOPPING ALL MONITORING ===");
        this.performCleanup();
        this.isActive = false;
        
        // Display final connection health statistics
        this.displayConnectionHealth();
    }

    restartMonitoring() {
        this.stopMonitoring();
        const restartTask = new Task(() => this.startMonitoring());
        restartTask.schedule(100);
    }

    showStatus() {
        post(`=== MONITORING STATUS: ${this.isActive ? 'ACTIVE' : 'STOPPED'} ===`);
        post(`Active observers: ${this.observers.size}`);
        post(`Periodic display: ${this.config.enablePeriodicDisplay ? 'ENABLED' : 'DISABLED'}`);
        post(`Update interval: ${this.config.updateInterval}ms`);
        
        if (this.isActive) {
            // Show recent connection health
            const { transportQueries, transportSuccess, sessionQueries, sessionSuccess } = this.connectionHealth;
            const transportRate = transportQueries > 0 ? ((transportSuccess / transportQueries) * 100).toFixed(1) : 'N/A';
            const sessionRate = sessionQueries > 0 ? ((sessionSuccess / sessionQueries) * 100).toFixed(1) : 'N/A';
            
            post(`Connection Health - Transport: ${transportRate}%, Session: ${sessionRate}%`);
        }
    }

    performCleanup() {
        for (const observer of this.observers) {
            try {
                if (observer && typeof observer.close === 'function') {
                    observer.close();
                }
            } catch (error) {
                // Silently handle cleanup errors
            }
        }
        this.observers.clear();
        
        if (this.displayTask) {
            this.displayTask.cancel();
            this.displayTask = null;
        }
    }

    initializeAllSystems() {
        const { maxTracks, maxClips } = this.config;
        
        // Initialize event-driven monitoring (these work reliably)
        this.setupTransportMonitoring();
        this.setupTempoMonitoring();
        this.setupTrackMonitoring();
        this.setupParameterMonitoring();
        
        // Initialize clip monitoring with enhanced error handling
        this.setupEnhancedClipMonitoring(maxTracks, maxClips);
        
        // Initialize periodic display with graceful degradation
        if (this.config.enablePeriodicDisplay) {
            this.createRobustPeriodicDisplay();
        }
        
        post("All monitoring systems initialized with enhanced reliability");
    }

    setupTransportMonitoring() {
        const transportCallback = (args) => {
            if (!this.isActive) return;
            const [, isPlaying] = args;
            post(`=== TRANSPORT: ${isPlaying ? 'PLAYING' : 'STOPPED'} ===`);
        };
        
        try {
            const transportAPI = new LiveAPI(transportCallback, "live_set");
            transportAPI.property = "is_playing";
            this.observers.add(transportAPI);
        } catch (error) {
            post("Warning: Could not set up transport monitoring");
        }
    }

    setupTempoMonitoring() {
        const tempoCallback = (args) => {
            if (!this.isActive) return;
            const [, tempo] = args;
            post(`=== TEMPO: ${tempo.toFixed(1)} BPM ===`);
        };
        
        try {
            const tempoAPI = new LiveAPI(tempoCallback, "live_set");
            tempoAPI.property = "tempo";
            this.observers.add(tempoAPI);
        } catch (error) {
            post("Warning: Could not set up tempo monitoring");
        }
    }

    setupTrackMonitoring() {
        const trackCallback = (args) => {
            if (!this.isActive) return;
            const [, trackName] = args;
            post(`=== SELECTED TRACK: ${trackName} ===`);
            
            // Use robust track analysis with error handling
            this.analyzeCurrentTrackSafely();
        };
        
        try {
            const trackAPI = new LiveAPI(trackCallback, "live_set view selected_track");
            trackAPI.property = "name";
            this.observers.add(trackAPI);
        } catch (error) {
            post("Warning: Could not set up track monitoring");
        }
    }

    analyzeCurrentTrackSafely() {
        if (!this.isActive) return;
        
        try {
            const trackAPI = new LiveAPI(null, "live_set view selected_track");
            if (trackAPI.id === 0) return;
            
            // Query each property individually with error handling
            const trackInfo = {};
            
            try { trackInfo.color = trackAPI.get("color"); } catch (e) { trackInfo.color = "unknown"; }
            try { trackInfo.muted = trackAPI.get("mute"); } catch (e) { trackInfo.muted = false; }
            try { trackInfo.soloed = trackAPI.get("solo"); } catch (e) { trackInfo.soloed = false; }
            try { trackInfo.armed = trackAPI.get("arm"); } catch (e) { trackInfo.armed = false; }
            try { trackInfo.devices = trackAPI.get("devices"); } catch (e) { trackInfo.devices = []; }
            
            // Format output based on successfully retrieved information
            const { color, muted, soloed, armed, devices } = trackInfo;
            const statusParts = [];
            if (muted) statusParts.push("MUTED");
            if (soloed) statusParts.push("SOLO");
            if (armed) statusParts.push("ARMED");
            if (statusParts.length === 0) statusParts.push("AUDIBLE");
            
            post(`    Color: ${color} | Status: ${statusParts.join(" | ")}`);
            post(`    Devices: ${Array.isArray(devices) ? devices.length : 'unknown'}`);
            
        } catch (error) {
            post("    Track analysis temporarily unavailable");
        }
    }

    setupParameterMonitoring() {
        if (!this.isActive) return;
        
        post("=== Setting up parameter monitoring ===");
        
        const volumeCallback = (args) => {
            if (!this.isActive) return;
            const [, volume] = args;
            // Handle extreme values more gracefully
            const percentage = Math.min(Math.max(volume * 100, 0), 1000); // Cap at reasonable range
            post(`>>> VOLUME: ${percentage.toFixed(1)}%`);
        };
        
        const panCallback = (args) => {
            if (!this.isActive) return;
            const [, pan] = args;
            // Handle extreme values more gracefully
            const clampedPan = Math.min(Math.max(pan, -1), 1); // Clamp to valid range
            const percentage = ((clampedPan + 1) * 50).toFixed(1);
            const direction = clampedPan < -0.1 ? "LEFT" : clampedPan > 0.1 ? "RIGHT" : "CENTER";
            post(`>>> PAN: ${percentage}% (${direction})`);
        };
        
        try {
            const volumeAPI = new LiveAPI(volumeCallback, "live_set view selected_track mixer_device volume");
            volumeAPI.property = "value";
            this.observers.add(volumeAPI);
        } catch (error) {
            post("Warning: Could not set up volume monitoring");
        }
        
        try {
            const panAPI = new LiveAPI(panCallback, "live_set view selected_track mixer_device panning");
            panAPI.property = "value";
            this.observers.add(panAPI);
        } catch (error) {
            post("Warning: Could not set up pan monitoring");
        }
    }

    setupEnhancedClipMonitoring(maxTracks, maxClips) {
        if (!this.isActive) return;
        
        post("=== Setting up enhanced clip monitoring ===");
        
        // Use robust track counting with fallback
        let trackCount = 0;
        try {
            const tracksAPI = new LiveAPI(null, "live_set tracks");
            trackCount = Math.min(tracksAPI.getcount(), maxTracks);
        } catch (error) {
            post("Could not determine track count - using fallback method");
            // Fallback: try to determine track count by testing individual tracks
            for (let i = 0; i < maxTracks; i++) {
                try {
                    const testAPI = new LiveAPI(null, `live_set tracks ${i}`);
                    if (testAPI.id !== 0) {
                        trackCount = i + 1;
                    } else {
                        break;
                    }
                } catch (e) {
                    break;
                }
            }
        }
        
        if (trackCount === 0) {
            post("No tracks detected for clip monitoring");
            return;
        }
        
        post(`Setting up clip monitoring for ${trackCount} tracks`);
        
        for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
            for (let clipIndex = 0; clipIndex < maxClips; clipIndex++) {
                this.createRobustClipObserver(trackIndex, clipIndex);
            }
        }
        
        post(`Clip monitoring active for ${trackCount} tracks, ${maxClips} clips each`);
    }

    createRobustClipObserver(trackIndex, clipIndex) {
        const clipPath = `live_set tracks ${trackIndex} clip_slots ${clipIndex}`;
        
        // Test if clip slot exists before creating observers
        try {
            const testAPI = new LiveAPI(null, clipPath);
            if (testAPI.id === 0) return; // Skip non-existent clip slots
        } catch (error) {
            return; // Skip problematic clip slots
        }
        
        const playingCallback = (args) => {
            if (!this.isActive) return;
            const [, isPlaying] = args;
            const action = isPlaying ? "LAUNCHED" : "STOPPED";
            post(`>>> CLIP ${action}: Track ${trackIndex + 1}, Clip ${clipIndex + 1}`);
        };
        
        const triggeredCallback = (args) => {
            if (!this.isActive) return;
            const [, isTriggered] = args;
            if (isTriggered) {
                post(`>>> CLIP TRIGGERED: Track ${trackIndex + 1}, Clip ${clipIndex + 1} (waiting)`);
            }
        };
        
        try {
            const playingAPI = new LiveAPI(playingCallback, clipPath);
            playingAPI.property = "is_playing";
            this.observers.add(playingAPI);
            
            const triggeredAPI = new LiveAPI(triggeredCallback, clipPath);
            triggeredAPI.property = "is_triggered";
            this.observers.add(triggeredAPI);
        } catch (error) {
            // Silently skip problematic clip slots
        }
    }

    createRobustPeriodicDisplay() {
        if (!this.isActive) return;
        
        post("=== Starting robust periodic display ===");
        post(`Status updates every ${this.config.updateInterval / 1000} seconds with graceful degradation`);
        
        if (this.displayTask) {
            this.displayTask.cancel();
        }
        
        this.displayTask = new Task(() => {
            if (!this.isActive) {
                if (this.displayTask) {
                    this.displayTask.cancel();
                    this.displayTask = null;
                }
                return;
            }
            
            this.displayRobustStatus();
            
            if (this.isActive && this.displayTask) {
                this.displayTask.schedule(this.config.updateInterval);
            }
        });
        
        this.displayTask.execute();
    }

    displayRobustStatus() {
        if (!this.isActive) return;
        
        // Collect available information with individual error handling
        const statusInfo = {
            transport: null,
            tempo: null,
            songTime: null,
            trackName: null,
            trackState: null
        };
        
        // Query transport state
        try {
            const songAPI = new LiveAPI(null, "live_set");
            statusInfo.transport = songAPI.get("is_playing");
            this.connectionHealth.transportSuccess++;
        } catch (error) {
            // Transport query failed - this is unusual but handle gracefully
        }
        this.connectionHealth.transportQueries++;
        
        // Query tempo
        try {
            const songAPI = new LiveAPI(null, "live_set");
            statusInfo.tempo = songAPI.get("tempo");
        } catch (error) {
            // Tempo query failed
        }
        
        // Query song position
        try {
            const songAPI = new LiveAPI(null, "live_set");
            statusInfo.songTime = songAPI.get("current_song_time");
        } catch (error) {
            // Song time query failed
        }
        
        // Query track information
        try {
            const trackAPI = new LiveAPI(null, "live_set view selected_track");
            statusInfo.trackName = trackAPI.get("name");
            
            if (trackAPI.id !== 0) {
                const trackFlags = [];
                try { if (trackAPI.get("mute")) trackFlags.push("MUTED"); } catch (e) {}
                try { if (trackAPI.get("solo")) trackFlags.push("SOLO"); } catch (e) {}
                try { if (trackAPI.get("arm")) trackFlags.push("ARMED"); } catch (e) {}
                statusInfo.trackState = trackFlags.length > 0 ? trackFlags.join(", ") : "AUDIBLE";
            }
            this.connectionHealth.sessionSuccess++;
        } catch (error) {
            // Session query failed
        }
        this.connectionHealth.sessionQueries++;
        
        // Display whatever information we successfully gathered
        post("");
        post("=============== ENHANCED SESSION STATUS ===============");
        
        if (statusInfo.transport !== null) {
            post(`Transport: ${statusInfo.transport ? 'PLAYING' : 'STOPPED'}`);
        } else {
            post("Transport: Status unavailable");
        }
        
        if (statusInfo.tempo !== null) {
            post(`Tempo: ${statusInfo.tempo.toFixed(1)} BPM`);
        } else {
            post("Tempo: Information unavailable");
        }
        
        if (statusInfo.songTime !== null) {
            post(`Position: ${statusInfo.songTime.toFixed(2)} beats`);
        } else {
            post("Position: Timing unavailable");
        }
        
        if (statusInfo.trackName !== null) {
            post(`Selected: ${statusInfo.trackName}`);
            if (statusInfo.trackState !== null) {
                post(`Track State: ${statusInfo.trackState}`);
            }
        } else {
            post("Track: Information unavailable");
        }
        
        post("=====================================================");
    }

    displayConnectionHealth() {
        const { transportQueries, transportSuccess, sessionQueries, sessionSuccess } = this.connectionHealth;
        
        post("=== CONNECTION HEALTH SUMMARY ===");
        
        if (transportQueries > 0) {
            const transportRate = ((transportSuccess / transportQueries) * 100).toFixed(1);
            post(`Transport queries: ${transportSuccess}/${transportQueries} (${transportRate}%)`);
        }
        
        if (sessionQueries > 0) {
            const sessionRate = ((sessionSuccess / sessionQueries) * 100).toFixed(1);
            post(`Session queries: ${sessionSuccess}/${sessionQueries} (${sessionRate}%)`);
        }
        
        if (transportQueries === 0 && sessionQueries === 0) {
            post("No periodic queries were attempted");
        }
    }

    // Enhanced configuration methods
    setUpdateInterval(milliseconds) {
        const oldInterval = this.config.updateInterval;
        this.config.updateInterval = Math.max(1000, milliseconds);
        post(`Update interval changed from ${oldInterval}ms to ${this.config.updateInterval}ms`);
        
        if (this.isActive && this.displayTask && this.config.enablePeriodicDisplay) {
            post("Restarting periodic display with new interval");
            this.displayTask.cancel();
            this.createRobustPeriodicDisplay();
        }
    }

    togglePeriodicDisplay() {
        this.config.enablePeriodicDisplay = !this.config.enablePeriodicDisplay;
        post(`Periodic display ${this.config.enablePeriodicDisplay ? 'ENABLED' : 'DISABLED'}`);
        
        if (this.isActive) {
            if (this.config.enablePeriodicDisplay) {
                this.createRobustPeriodicDisplay();
            } else if (this.displayTask) {
                this.displayTask.cancel();
                this.displayTask = null;
            }
        }
    }

    getDetailedStatus() {
        try {
            const songAPI = new LiveAPI(null, "live_set");
            const trackAPI = new LiveAPI(null, "live_set view selected_track");
            
            const detailedInfo = {
                playing: "unknown",
                tempo: "unknown",
                track: "unknown"
            };
            
            try { detailedInfo.playing = songAPI.get("is_playing"); } catch (e) {}
            try { detailedInfo.tempo = songAPI.get("tempo"); } catch (e) {}
            try { detailedInfo.track = trackAPI.get("name"); } catch (e) {}
            
            return `Playing: ${detailedInfo.playing} | Tempo: ${typeof detailedInfo.tempo === 'number' ? detailedInfo.tempo.toFixed(1) : detailedInfo.tempo} | Track: ${detailedInfo.track}`;
        } catch (error) {
            return "Detailed status unavailable";
        }
    }
}

// Create global monitor instance
const monitor = new LiveAPIMonitor();

// Traditional function declarations for Max messaging
function start() {
    monitor.startMonitoring();
}

function stop() {
    monitor.stopMonitoring();
}

function restart() {
    monitor.restartMonitoring();
}

function status() {
    monitor.showStatus();
}

function help() {
    post("");
    post("=== LIVE API DATA EXPLORER V8 ENHANCED CONTROLS ===");
    post("start       - Begin monitoring");
    post("stop        - Stop monitoring");
    post("restart     - Stop and restart");
    post("status      - Show current status");
    post("help        - Show this help");
    post("quick       - Quick status check");
    post("config      - Show configuration");
    post("health      - Show connection health");
    post("");
    post("Enhanced Features:");
    post("monitor.setUpdateInterval(ms) - Change update frequency");
    post("monitor.togglePeriodicDisplay() - Enable/disable periodic updates");
    post("");
}

function config() {
    const { updateInterval, maxTracks, maxClips, enablePeriodicDisplay } = monitor.config;
    post("=== ENHANCED CONFIGURATION ===");
    post(`Update Interval: ${updateInterval}ms`);
    post(`Max Tracks: ${maxTracks}`);
    post(`Max Clips: ${maxClips}`);
    post(`Periodic Display: ${enablePeriodicDisplay ? 'ENABLED' : 'DISABLED'}`);
    post(`Observer Count: ${monitor.observers.size}`);
}

function quick() {
    post("=== ENHANCED QUICK STATUS ===");
    post(monitor.getDetailedStatus());
}

function health() {
    monitor.displayConnectionHealth();
}

function test() {
    post("V8 ENHANCED TEST FUNCTION WORKS!");
    post("Reliability improvements active");
    return "enhanced";
}

// Max lifecycle functions
function loadbang() {
    post("");
    post("=== Live API Data Explorer V8 ENHANCED Ready ===");
    post("Features: Graceful degradation, robust error handling, connection health tracking");
    post("Send 'start' to begin enhanced monitoring");
    post("Send 'help' for all commands");
    post("");
}

function notifydeleted() {
    monitor.performCleanup();
    post("Live API Monitor V8 Enhanced - Cleanup completed");
}