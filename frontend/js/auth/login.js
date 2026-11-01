// frontend/js/auth/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    // Verificar si las funciones de utils.js están disponibles (ahora estarán en window)
    if (typeof window.fetchData !== 'function' || typeof window.showMessage !== 'function' || typeof window.clearMessage !== 'function') {
        console.error("Error crítico: Funciones de utils.js no disponibles.");
        if (messageDiv) showMessage(messageDiv.id, "Error crítico al cargar la página. Intenta refrescar.", "error");
        return;
    }

    if (!loginForm) {
        console.error("Formulario de login no encontrado (ID: 'loginForm').");
        return;
    }
    
    if (!messageDiv) {
        console.warn("Elemento de mensaje no encontrado (ID: 'message'). Los mensajes de feedback no se mostrarán.");
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        if (messageDiv) clearMessage(messageDiv.id); // Usa clearMessage de window

        const usuarioLoginInput = document.getElementById('usuario_login');
        const contrasenaInput = document.getElementById('contrasena');

        if (!usuarioLoginInput || !contrasenaInput) {
            console.error("Campos de usuario o contraseña no encontrados.");
            if (messageDiv) showMessage(messageDiv.id, 'Error interno del formulario.', 'error');
            return;
        }

        const usuario_login = usuarioLoginInput.value.trim();
        const contrasena = contrasenaInput.value;

        if (!usuario_login || !contrasena) {
            if (messageDiv) showMessage(messageDiv.id, 'Por favor, ingresa tu usuario y contraseña.', 'error');
            return;
        }

        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : 'Ingresar';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Ingresando...';
        }

        try {
            // fetchData ahora está en window y usa API_BASE_URL de window.utils.js
            const data = await fetchData('/api/v1/auth/login', { 
                method: 'POST',
                body: { usuario_login, contrasena } 
            });

            if (data && data.token && data.usuario) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.usuario));

                if (messageDiv) showMessage(messageDiv.id, `¡Inicio Exitoso!`, 'success');
                
                setTimeout(() => {
                    if (data.usuario.rol === 'admin' || data.usuario.rol === 'tecnico') {
                        window.location.href = 'dashboard_tecnico.html';
                    } else if (data.usuario.rol === 'usuario') {
                        window.location.href = 'dashboard_usuario.html';
                    } else {
                        console.error('Rol de usuario desconocido:', data.usuario.rol);
                        if (messageDiv) showMessage(messageDiv.id, 'Rol de usuario no reconocido.', 'error');
                    }
                }, 1000); 
            } else {
                throw new Error(data.message || 'Respuesta inesperada del servidor.');
            }
        } catch (error) {
            console.error('Error en el inicio de sesión:', error);
            let displayMessage = error.message || 'No se pudo iniciar sesión.';
            if (error.data && Array.isArray(error.data.errors)) {
                displayMessage = error.data.errors.map(e => e.msg).join(' ');
            } else if (error.data && error.data.message) {
                displayMessage = error.data.message;
            }
            if (messageDiv) showMessage(messageDiv.id, displayMessage, 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });
});