// frontend/js/auth/register.js

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.getElementById('message');

    if (typeof window.fetchData !== 'function' || typeof window.showMessage !== 'function' || typeof window.clearMessage !== 'function') {
        console.error("Error crítico: Funciones de utils.js no disponibles.");
        if (messageDiv) showMessage(messageDiv.id, "Error crítico al cargar la página. Intenta refrescar.", "error");
        return;
    }

    if (!registerForm) {
        console.error("Formulario de registro no encontrado (ID: 'registerForm').");
        return;
    }
    if (!messageDiv) {
        console.warn("Elemento de mensaje no encontrado (ID: 'message').");
    }

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (messageDiv) clearMessage(messageDiv.id);

        const nombre_completo = document.getElementById('nombre_completo').value.trim();
        const correo = document.getElementById('correo').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const area = document.getElementById('area').value;
        const usuario_login = document.getElementById('usuario_login').value.trim();
        const contrasena = document.getElementById('contrasena').value;

        if (!nombre_completo || !correo || !telefono || !area || !usuario_login || !contrasena) {
            if (messageDiv) showMessage(messageDiv.id, 'Todos los campos son obligatorios.', 'error');
            return;
        }
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(correo)) {
            if (messageDiv) showMessage(messageDiv.id, 'Por favor, ingresa un correo válido.', 'error');
            return;
        }
        if (!/^\d{10}$/.test(telefono)) {
            if (messageDiv) showMessage(messageDiv.id, 'El teléfono debe tener 10 dígitos numéricos.', 'error');
            return;
        }
        if (area === "") {
            if (messageDiv) showMessage(messageDiv.id, 'Por favor, selecciona un área.', 'error');
            return;
        }
        if (usuario_login.length < 4 || usuario_login.length > 30 || !/^[a-zA-Z0-9]+$/.test(usuario_login)) {
            if (messageDiv) showMessage(messageDiv.id, 'Login: 4-30 caracteres alfanuméricos.', 'error');
            return;
        }
        if (contrasena.length < 6 || contrasena.length > 50) {
            if (messageDiv) showMessage(messageDiv.id, 'Contraseña: 6-50 caracteres.', 'error');
            return;
        }

        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Registrando...';
        }

        const userData = { nombre_completo, correo, telefono, area, usuario_login, contrasena };

        try {
            const data = await fetchData('/api/v1/auth/register', { // fetchData de window
                method: 'POST',
                body: userData
            });

            if (messageDiv) showMessage(messageDiv.id, data.message || '¡Registro exitoso!', 'success');
            registerForm.reset(); 
            
            const loginLink = registerForm.querySelector('.form-link-section a[href="login.html"]');
            if (loginLink && messageDiv) {
                 showMessage(messageDiv.id, `${data.message || '¡Registro exitoso!'} Ahora puedes <a href="${loginLink.href}" style="font-weight:bold; text-decoration:underline;">iniciar sesión aquí</a>.`, 'success');
            }


        } catch (error) {
            console.error('Error en el registro:', error);
            let displayMessage = error.message || 'Error en el registro.';
            if (error.data && Array.isArray(error.data.errors)) {
                displayMessage = error.data.errors.map(e => e.msg).join(' <br>');
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