const API_BASE = window.location.origin;
let selectedEstado = '';

// ─── Tabs ──────────────────────────────────────────────────────────────────

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === tabId);
    });
}

// ─── UI Helpers ────────────────────────────────────────────────────────────

function setLoading(btn, loading) {
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
}

function showResponse(id, data, isSuccess) {
    const el = document.getElementById(id);
    const label = isSuccess ? '✓ Respuesta exitosa' : '✗ Error';
    el.className = `response ${isSuccess ? 'success' : 'error'} visible`;
    el.innerHTML = `<div class="response-label">${label}</div>${JSON.stringify(data, null, 2)}`;
}

function selectEstado(el, value) {
    document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    selectedEstado = value;
}

// ─── API Calls ─────────────────────────────────────────────────────────────

async function crearEnvio() {
    const btn = document.getElementById('btnCrear');
    const remitente        = document.getElementById('remitente').value.trim();
    const destinatario     = document.getElementById('destinatario').value.trim();
    const direccion_destino = document.getElementById('direccion_destino').value.trim();
    const peso             = parseFloat(document.getElementById('peso').value);

    if (!remitente || !destinatario || !direccion_destino || isNaN(peso)) {
        showResponse('crearResponse', { error: 'Por favor completa todos los campos.' }, false);
        return;
    }

    setLoading(btn, true);
    try {
        const res = await fetch(`${API_BASE}/envios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remitente, destinatario, direccion_destino, peso })
        });
        const result = await res.json();
        showResponse('crearResponse', result, res.ok);
        if (res.ok) {
            document.getElementById('remitente').value = '';
            document.getElementById('destinatario').value = '';
            document.getElementById('direccion_destino').value = '';
            document.getElementById('peso').value = '';
        }
    } catch (err) {
        showResponse('crearResponse', { error: 'Error de conexión: ' + err.message }, false);
    }
    setLoading(btn, false);
}

async function buscarEnvio() {
    const btn    = document.getElementById('btnBuscar');
    const codigo = document.getElementById('codigo_tracking').value.trim();

    if (!codigo) {
        showResponse('buscarResponse', { error: 'Ingresa un código de tracking.' }, false);
        return;
    }

    setLoading(btn, true);
    try {
        const res    = await fetch(`${API_BASE}/envios/${codigo}`);
        const result = await res.json();
        showResponse('buscarResponse', result, res.ok);
    } catch (err) {
        showResponse('buscarResponse', { error: 'Error de conexión: ' + err.message }, false);
    }
    setLoading(btn, false);
}

async function actualizarEstado() {
    const btn    = document.getElementById('btnActualizar');
    const codigo = document.getElementById('codigo_tracking_update').value.trim();

    if (!codigo || !selectedEstado) {
        showResponse('actualizarResponse', { error: 'Ingresa el código de tracking y selecciona un estado.' }, false);
        return;
    }

    setLoading(btn, true);
    try {
        const res = await fetch(`${API_BASE}/envios/${codigo}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: selectedEstado })
        });
        const result = await res.json();
        showResponse('actualizarResponse', result, res.ok);
        if (res.ok) {
            document.getElementById('codigo_tracking_update').value = '';
            document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
            selectedEstado = '';
        }
    } catch (err) {
        showResponse('actualizarResponse', { error: 'Error de conexión: ' + err.message }, false);
    }
    setLoading(btn, false);
}

// ─── Enter key support ─────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    const panel = e.target.closest('.tab-panel');
    const btn   = panel?.querySelector('.btn');
    if (btn) btn.click();
});