// backend/models/usuarioModel.js
const { getConnection, closeConnection } = require('../config/db');

// La función se llama 'create'
async function create({ nombre_completo, correo, telefono, area, usuario_login, contrasena }) { // contrasena es el hash
  let connection;
  try {
    connection = await getConnection();
    // ID_USUARIO, ROL, y FECHA_REGISTRO tienen DEFAULTs en la definición de la tabla.
    const sql = `
      INSERT INTO ADMIN.USUARIO
      (NOMBRE_COMPLETO, CORREO, TELEFONO, AREA, USUARIO_LOGIN, CONTRASENA) 
      VALUES (:nombre_completo_param, :correo_param, :telefono_param, :area_param, :usuario_login_param, :contrasena_hash_param)
    `;
    const binds = { 
        nombre_completo_param: nombre_completo, 
        correo_param: correo, 
        telefono_param: telefono, 
        area_param: area, 
        usuario_login_param: usuario_login, 
        contrasena_hash_param: contrasena 
    };
    const result = await connection.execute(sql, binds, { autoCommit: true });

    if (result.rowsAffected === 1) {
        return { usuario_login, correo, message: "Usuario creado en BD." }; 
    } else {
        throw new Error("La inserción del usuario no afectó ninguna fila, lo cual es inesperado.");
    }
  } catch (err) {
    if (err.errorNum && err.errorNum === 1) { 
        const msgUpper = err.message.toUpperCase();
        // Asegúrate que los nombres de constraint UK_... coincidan con los de tu DDL final.
        // O usa los nombres generados por Oracle SYS_C... si no nombraste las constraints.
        if (msgUpper.includes("UK_USUARIO_CORREO") || msgUpper.includes("SYS_C008455")) { 
            throw new Error(`El correo electrónico '${correo}' ya está registrado.`);
        }
        if (msgUpper.includes("UK_USUARIO_LOGIN") || msgUpper.includes("SYS_C008456")) { 
            throw new Error(`El nombre de usuario '${usuario_login}' ya está en uso.`);
        }
    }
    console.error("Error detallado en usuarioModel.create:", err);
    throw err; 
  } finally {
    await closeConnection(connection);
  }
}

async function findUserByEmail(email) {
  let connection;
  try {
    connection = await getConnection();
    const sql = `SELECT ID_USUARIO, USUARIO_LOGIN, CONTRASENA, NOMBRE_COMPLETO, AREA, ROL 
                 FROM ADMIN.USUARIO 
                 WHERE CORREO = :correo_param`;
    const result = await connection.execute(sql, { correo_param: email });
    return result.rows.length ? result.rows[0] : null;
  } catch (err) {
      console.error(`Error en usuarioModel.findUserByEmail para email ${email}:`, err);
      throw err;
  } finally {
    await closeConnection(connection);
  }
}

async function findByLogin(usuario_login) { 
  let connection;
  try {
    connection = await getConnection();
    const sql = `SELECT ID_USUARIO, USUARIO_LOGIN, CONTRASENA, NOMBRE_COMPLETO, AREA, ROL 
                 FROM ADMIN.USUARIO 
                 WHERE USUARIO_LOGIN = :usuario_login_param`;
    const result = await connection.execute(sql, { usuario_login_param: usuario_login });
    return result.rows.length ? result.rows[0] : null;
  } catch (err) {
      console.error(`Error en usuarioModel.findByLogin para login ${usuario_login}:`, err);
      throw err;
  } finally {
    await closeConnection(connection);
  }
}

async function getById(idUsuario) {
    let connection;
    const parsedId = parseInt(idUsuario);
    if (isNaN(parsedId)) {
        throw new Error("El ID de usuario proporcionado debe ser un número válido.");
    }
    try {
        connection = await getConnection();
        const sql = `SELECT ID_USUARIO, NOMBRE_COMPLETO, CORREO, TELEFONO, AREA, USUARIO_LOGIN, ROL, FECHA_REGISTRO 
                     FROM ADMIN.USUARIO 
                     WHERE ID_USUARIO = :id_usuario_param`;
        const result = await connection.execute(sql, { id_usuario_param: parsedId });
        return result.rows.length ? result.rows[0] : null;
    } catch (err) {
        console.error(`Error en usuarioModel.getById para ID ${parsedId}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

module.exports = { 
    create,  // <<<--- Exportando la función como 'create'
    findUserByEmail, 
    findByLogin,
    getById 
};