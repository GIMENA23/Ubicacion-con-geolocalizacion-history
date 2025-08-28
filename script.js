let watchID = null; 
let historyLocations = [];
let map;
let userMarker;
let userPath;

// Función para obtener la ubicación inicial y mostrar los otros botones y el mapa
function getInitialLocation() {
    document.getElementById('initial-btn').style.display = 'none';
    document.getElementById('tracking-buttons').style.display = 'flex';
    document.getElementById('main-content').style.display = 'block';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(ubicacionExitosa, manejarError);
    } else {
        const outputDiv = document.getElementById('output');
        outputDiv.innerHTML = `<p class="error-message">Geolocalización no es soportada por este navegador.</p>`;
        outputDiv.classList.add('error');
    }
}

// Función para iniciar el seguimiento continuo (cada 1 segundo)
function startTracking() {
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = `<p style="text-align: center; width: 100%; color: var(--success-color); font-weight: bold;">✅ Recorrido iniciado. Actualizando cada 1 segundo.</p>`;
    outputDiv.classList.remove('error');
    
    document.getElementById('history-section').style.display = 'block';

    if (navigator.geolocation) {
        const configuracion = {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 1000
        };
        
        if (watchID) {
            navigator.geolocation.clearWatch(watchID);
        }
        watchID = navigator.geolocation.watchPosition(ubicacionExitosa, manejarError, configuracion);
    } else {
        outputDiv.innerHTML = `<p class="error-message">Geolocalización no es soportada por este navegador.</p>`;
        outputDiv.classList.add('error');
    }
}

// Función para detener el seguimiento
function stopTracking() {
    if (watchID) {
        navigator.geolocation.clearWatch(watchID);
        watchID = null;
        const outputDiv = document.getElementById('output');
        outputDiv.innerHTML = `<p style="text-align: center; width: 100%; color: var(--secondary-color);">Seguimiento detenido.</p>`;
    }
}

// Función para limpiar el historial
function clearHistory() {
    stopTracking();
    historyLocations = [];
    updateHistoryList();
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = `<p style="text-align: center; width: 100%; color: var(--secondary-color);">Historial limpiado.</p>`;
    window.history.replaceState({}, '', window.location.pathname);
    
    document.getElementById('history-section').style.display = 'none';
    
    // Limpiar el rastro del mapa y el marcador
    if (userPath) {
        userPath.setLatLngs([]);
    }
    if (userMarker) {
        userMarker.remove();
        userMarker = null;
    }
    if (map) {
        map.remove();
        map = null;
    }
}

// Esta función ahora también inicializa el mapa
function ubicacionExitosa(posicion) {
    const coords = posicion.coords;
    const newLocation = [coords.latitude, coords.longitude];

    // Si el mapa aún no ha sido inicializado, lo hacemos aquí
    if (!map) {
        map = L.map('map').setView(newLocation, 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        userMarker = L.marker(newLocation).addTo(map);
        userPath = L.polyline([], { color: '#007bff', weight: 4 }).addTo(map);
    }

    historyLocations.push({ coords: { latitude: newLocation[0], longitude: newLocation[1], accuracy: coords.accuracy }, timestamp: posicion.timestamp });
    
    // Actualizar el mapa
    if (userMarker && userPath) {
        userMarker.setLatLng(newLocation);
        map.setView(newLocation);
        
        const path = userPath.getLatLngs();
        path.push(newLocation);
        userPath.setLatLngs(path);
    }
    
    // Actualizar la interfaz de usuario con la información de la ubicación
    updateUI({ coords: { latitude: newLocation[0], longitude: newLocation[1], accuracy: coords.accuracy }, timestamp: posicion.timestamp });
}

function updateUI(locationData) {
    const outputDiv = document.getElementById('output');
    outputDiv.classList.add('success');
    const coords = locationData.coords;

    outputDiv.innerHTML = `
        <p class="output-title">Ubicación Actual</p>
        <p class="info-item"><span class="info-label">Latitud:</span> <span class="info-value">${coords.latitude.toFixed(6)}°</span></p>
        <p class="info-item"><span class="info-label">Longitud:</span> <span class="info-value">${coords.longitude.toFixed(6)}°</span></p>
        <p class="info-item"><span class="info-label">Precisión:</span> <span class="info-value">${coords.accuracy.toFixed(2)} m</span></p>
        <p class="info-item"><span class="info-label">Fecha/Hora:</span> <span class="info-value">${new Date(locationData.timestamp).toLocaleString()}</span></p>
    `;
    
    updateHistoryList();
}

function updateHistoryList() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (historyLocations.length === 0) {
        historyList.innerHTML = `<p style="text-align: center; color: var(--secondary-color);">El historial está vacío.</p>`;
        return;
    }

    historyLocations.forEach((loc, index) => {
        const listItem = document.createElement('li');
        const coords = loc.coords;
        listItem.innerHTML = `
            <strong>Punto ${index + 1}:</strong><br>
            Lat: ${coords.latitude.toFixed(6)}°, Long: ${coords.longitude.toFixed(6)}°
        `;
        historyList.appendChild(listItem);
    });
    historyList.scrollTop = historyList.scrollHeight;
}

function manejarError(error) {
    const outputDiv = document.getElementById('output');
    outputDiv.classList.add('error');
    let mensajeError = "";

    switch(error.code) {
        case error.PERMISSION_DENIED:
            mensajeError = "Permiso denegado. Habilita la geolocalización en la configuración.";
            break;
        case error.POSITION_UNAVAILABLE:
            mensajeError = "Ubicación no disponible. El dispositivo no pudo encontrar su posición.";
            break;
        case error.TIMEOUT:
            mensajeError = "Tiempo de espera excedido. La señal es débil o la conexión es lenta.";
            break;
        default:
            mensajeError = "Ocurrió un error desconocido. Código: " + error.code;
            break;
    }
    outputDiv.innerHTML = `<p class="error-message">${mensajeError}</p>`;
    console.error(`ERROR(${error.code}): ${error.message}`);
}

window.addEventListener('popstate', (event) => {
    if (event.state && event.state.locations) {
        historyLocations = event.state.locations;
        updateUI(event.state.currentPosition);
    } else {
        historyLocations = [];
        updateHistoryList();
    }
});