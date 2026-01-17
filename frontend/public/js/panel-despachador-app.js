// js/panel-despachador-app.js (Extracto con modificaciones clave)

// ... (Imports y funciones de utilidad anteriores) ...

// --- NUEVA FUNCIÓN: Obtener los conductores asignados a este despachador ---
const getDispatcherDrivers = async () => {
    if (!despachadorId) return [];

    try {
        // Asumiendo que tienes una colecciÃ³n 'drivers' donde almacenas la info del conductor
        // y que cada conductor tiene un campo 'despachadorId' o 'cooperativaId'
        const q = query(
            collection(db, "drivers"), 
            where("despachadorId", "==", despachadorId),
            where("status", "==", "available"), // Solo conductores que estÃ¡n disponibles
            where("type", "==", "intermunicipal") // Solo conductores intermunicipales
        );
        
        const driverSnapshot = await getDocs(q);
        
        const drivers = [];
        driverSnapshot.forEach(doc => {
            drivers.push({ id: doc.id, ...doc.data() });
        });
        
        return drivers; // Retorna la lista filtrada de TUS conductores intermunicipales disponibles.
    } catch (e) {
        console.error("Error al buscar conductores del despachador:", e);
        showMessage("Error al cargar la lista de conductores.", "error");
        return [];
    }
};

// --- FUNCIÃ“N MODIFICADA: Renderizar Viaje ---
// Ahora renderizamos un <select> con solo los conductores del despachador
const renderViaje = (id, data, availableDrivers) => {
    // ... (CÃ³digo anterior para crear la card) ...

    // Crear el select de conductores
    let driverOptions = availableDrivers.map(driver => 
        `<option value="${driver.id}" data-name="${driver.name}" data-car="${driver.car}" data-plate="${driver.plate}">
            ${driver.name} (${driver.plate} / Interno: ${driver.internalNumber || 'N/A'})
        </option>`
    ).join('');

    const selectHtml = `
        <label for="conductor-select-${id}" class="block mt-3 text-sm font-medium text-gray-700">Asignar a:</label>
        <select id="conductor-select-${id}" class="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="" disabled selected>-- Selecciona un Conductor --</option>
            ${driverOptions}
        </select>
    `;

    card.innerHTML = `
        ${selectHtml}

        <div class="mt-4 space-x-2 border-t pt-3">
            <button data-id="${id}" class="btn-asignar bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition" ${isAssigned ? 'disabled' : ''}>
                <i class="fas fa-motorcycle mr-1"></i> ${isAssigned ? 'ASIGNADO' : 'Asignar'}
            </button>
            <button data-id="${id}" class="btn-cancelar bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition">
                <i class="fas fa-times-circle mr-1"></i> Cancelar
            </button>
        </div>
    `;

    // ... (Adjuntar eventos) ...
};

// --- FUNCIÃ“N MODIFICADA: Escuchar Viajes (Incluyendo la carga de conductores) ---
const listenViajes = async () => {
    const availableDrivers = await getDispatcherDrivers(); // Cargar TUS conductores disponibles

    // ... (CÃ³digo anterior: query(collection(db, "trips"), where("serviceType", "==", "intermunicipal")) ) ...

    onSnapshot(q, snap => {
        // ... (CÃ³digo anterior para manejar snap) ...
        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (['requested', 'assigned_whatsapp', 'assigned_app'].includes(data.status)) {
                // Pasamos la lista de conductores a la funciÃ³n de renderizado
                renderViaje(docSnap.id, data, availableDrivers); 
                hasPendingTrips = true;
            }
        });
        // ... (CÃ³digo anterior para mostrar mensaje sin viajes) ...
    }, err => { /* ... */ });
};

// --- FUNCIÃ“N MODIFICADA: Asignar Conductor ---
const asignarConductor = async (tripId) => {
    if (!despachadorId) { showMessage("Error: ID de despachador no cargado.", "error"); return; }
    
    const select = document.getElementById(`conductor-select-${tripId}`);
    const driverId = select.value;
    
    if (!driverId) {
        showMessage("Por favor, selecciona un conductor de la lista.", "error");
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const driverName = selectedOption.dataset.name;
    const driverCar = selectedOption.dataset.car;
    const driverPlate = selectedOption.dataset.plate;

    try {
        const tripRef = doc(db, "trips", tripId);
        
        await updateDoc(tripRef, {
            status: "assigned_app", 
            despachadorId: despachadorId,
            driverId: driverId, // Usamos el ID del conductor
            driverName: driverName,
            driverCar: driverCar,
            driverLicensePlate: driverPlate,
            assignmentTime: new Date()
        });

        showMessage(`Viaje #${tripId.substring(0, 6)} asignado a ${driverName}.`, "success");
    } catch (err) {
        // ... (Manejo de errores) ...
    }
};

// ... (Resto del cÃ³digo de AutenticaciÃ³n) ...