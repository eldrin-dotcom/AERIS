document.addEventListener('alpine:init', () => {
    Alpine.data('appData', () => ({
        activeTab: 'dashboard',
        sidebarOpen: false,
        modalOpen: false,
        alertAcknowledged: false,
        missionTimeSeconds: 5077,
        map: null,
        uavMarker: null,
        survivorMarker: null,
        homeMarker: null,
        mapInitialized: false,
        
        uav: {
            altitude: 120.4,
            speed: 8.2,
            heading: 218,
            battery: 78,
            lat: 14.2500, // Maragondon, Cavite approximate
            lng: 120.7300
        },
        survivor: {
            lat: 14.2515,
            lng: 120.7310
        },
        home: {
            lat: 14.2485,
            lng: 120.7290
        },
        
        link: {
            wifi: { latency: 48, rssi: -62, bitrate: 5.4 },
            lora: { latency: 83, rssi: -75, plr: 0.8 }
        },
        
        init() {
            // Telemetry Update Loop
            setInterval(() => {
                this.updateTelemetry();
            }, 1500);

            // Mission Timer Loop
            setInterval(() => {
                this.missionTimeSeconds++;
            }, 1000);
            
            // Watch for map tab to resize
            this.$watch('activeTab', (value) => {
                if(value === 'dashboard' || value === 'map') {
                    setTimeout(() => {
                        if(this.map) this.map.invalidateSize();
                    }, 100);
                }
            });

            // Initialize map after Alpine renders the container
            setTimeout(() => {
                this.initMap();
            }, 200);
        },
        
        initMap() {
            if (this.mapInitialized) return;
            const mapEl = document.getElementById('map');
            if(!mapEl) return;
            
            this.map = L.map('map', {
                zoomControl: false // custom controls later if needed
            }).setView([this.uav.lat, this.uav.lng], 16);
            
            // Standard 2D Map (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);

            // Home Marker
            const homeIcon = L.divIcon({
                className: 'custom-leaflet-marker bg-transparent border-none',
                html: '<div class="w-6 h-6 bg-aeris rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[10px] shadow-md z-10">H</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            this.homeMarker = L.marker([this.home.lat, this.home.lng], {icon: homeIcon}).addTo(this.map);

            // Survivor Marker
            const survivorIcon = L.divIcon({
                className: 'custom-leaflet-marker bg-transparent border-none',
                html: '<button class="cursor-pointer focus:outline-none rounded-full"><div class="absolute inset-0 rounded-full bg-danger opacity-40 animate-ping"></div><div class="relative w-6 h-6 bg-danger rounded-full border-2 border-white flex items-center justify-center text-white shadow-md"><i class="ph-fill ph-person text-sm"></i></div></button>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            this.survivorMarker = L.marker([this.survivor.lat, this.survivor.lng], {icon: survivorIcon}).addTo(this.map);
            this.survivorMarker.on('click', () => {
                this.modalOpen = true;
            });

            // UAV Marker
            const uavIcon = L.divIcon({
                className: 'custom-leaflet-marker bg-transparent border-none',
                html: '<div class="w-6 h-6 bg-white rounded-full border-2 border-aeris flex items-center justify-center text-aeris shadow-md transition-transform duration-300" style="transform: rotate(' + this.uav.heading + 'deg)"><i class="ph-fill ph-navigation-arrow text-sm"></i></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            this.uavMarker = L.marker([this.uav.lat, this.uav.lng], {icon: uavIcon}).addTo(this.map);

            this.mapInitialized = true;
        },

        get formattedMissionTime() {
            const h = Math.floor(this.missionTimeSeconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((this.missionTimeSeconds % 3600) / 60).toString().padStart(2, '0');
            const s = (this.missionTimeSeconds % 60).toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
        },

        updateTelemetry() {
            this.uav.altitude += (Math.random() - 0.5) * 0.5;
            this.uav.speed = Math.max(0, this.uav.speed + (Math.random() - 0.5) * 0.2);
            if (Math.random() > 0.95) this.uav.battery = Math.max(0, this.uav.battery - 0.1);

            this.link.wifi.latency = Math.max(30, this.link.wifi.latency + (Math.random() - 0.5) * 5);
            this.link.lora.latency = Math.max(60, this.link.lora.latency + (Math.random() - 0.5) * 8);
            this.link.wifi.rssi += (Math.random() - 0.5) * 2;
            this.link.lora.rssi += (Math.random() - 0.5) * 1.5;
            
            // Move UAV slowly
            if (this.uavMarker) {
                // simulate circling around survivor
                const time = Date.now() / 5000;
                this.uav.lat = this.survivor.lat + Math.sin(time) * 0.001;
                this.uav.lng = this.survivor.lng + Math.cos(time) * 0.001;
                this.uav.heading = (this.uav.heading + 2) % 360;
                
                this.uavMarker.setLatLng([this.uav.lat, this.uav.lng]);
                
                // update rotation visually
                const iconEl = this.uavMarker.getElement();
                if(iconEl) {
                    const arrow = iconEl.querySelector('div');
                    if(arrow) arrow.style.transform = `rotate(${this.uav.heading}deg)`;
                }
            }
        },

        acknowledgeAlert() {
            this.alertAcknowledged = true;
            setTimeout(() => {
                this.modalOpen = false;
            }, 500);
            
            if(this.survivorMarker) {
                // Remove ping animation on acknowledge
                const iconEl = this.survivorMarker.getElement();
                if(iconEl) {
                    const ping = iconEl.querySelector('.animate-ping');
                    if(ping) ping.remove();
                }
            }
        },
        
        viewOnMap() {
            this.modalOpen = false;
            this.activeTab = 'dashboard';
            setTimeout(() => {
                if(this.map) {
                    this.map.invalidateSize();
                    this.map.flyTo([this.survivor.lat, this.survivor.lng], 18, {duration: 1.5});
                }
            }, 300);
        },
        
        dispatchRescue() {
            alert('Rescue team dispatched to Maragondon, Cavite!');
            this.modalOpen = false;
        },
        
        recenterMap() {
            if(this.map) {
                this.map.flyTo([this.uav.lat, this.uav.lng], 16, {duration: 1});
            }
        },

        get pageTitle() {
            const titles = {
                'dashboard': 'DASHBOARD',
                'livefeed': 'LIVE SURVEILLANCE FEED',
                'detections': 'SURVIVOR DETECTIONS',
                'map': 'OPERATIONAL MAP',
                'settings': 'SYSTEM SETTINGS'
            };
            return titles[this.activeTab];
        },
        
        get pageSubtitle() {
            const subtitles = {
                'dashboard': 'Live Operational Overview',
                'livefeed': '5GHz Real-time Video Stream',
                'detections': 'AI-Generated Survivor Alerts',
                'map': 'UAV Flight Path & Coverage',
                'settings': 'System Configuration'
            };
            return subtitles[this.activeTab];
        }
    }));
});
