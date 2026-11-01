# Mesa de ayuda (Helpdesk)

Sistema web de tickets de soporte, desarrollado como proyecto integrador académico en 2025. Permite crear, asignar y hacer seguimiento a solicitudes, con vistas según el tipo de usuario.

## Funcionalidades

- Registro e inicio de sesión con contraseñas cifradas (bcrypt) y tokens JWT.
- Control de acceso por rol en el backend.
- Creación y consulta de tickets, comentarios, asignación a técnicos, cambio de estado y cierre.
- Paneles para usuarios y técnicos.
- Administración de categorías, prioridades y técnicos.

## Tecnologías

- **Backend:** Node.js, Express, express-validator, JWT y bcrypt.
- **Base de datos:** Oracle.
- **Frontend:** HTML, CSS y JavaScript, sin frameworks.

## Modelo de datos

![Modelo entidad-relación](docs/modelo-entidad-relacion.png)

## Cómo ejecutarlo

Necesitas Node.js y una base de datos Oracle creada según el modelo de datos. El repositorio no incluye el script de creación de tablas.

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` como `.env` y completa tus valores.
3. Genera la clave JWT con `node generate-secret.js`.
4. Inicia el servidor con `npm start`.

## Equipo

- **Luis Mario Chamizo Tiafi:** servidor base y autenticación de usuarios.
- **Juan Diego Chamizo Tiafi:** gestión de tickets y categorías.
- **Diego Muñoz:** gestión de técnicos, comentarios y prioridades.

El desarrollo original se hizo en un repositorio privado. Esta copia se publica sin credenciales ni historial anterior.
