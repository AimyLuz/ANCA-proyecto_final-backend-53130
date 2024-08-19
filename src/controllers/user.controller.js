//user.controller.js
import CartsModel from "../models/carts.model.js";
import { createHash, isValidPassword } from "../utils/hashbcryp.js";
import UserDTO from "../dto/user.dto.js";
import UsersModel from "../models/users.model.js";
import ensureCart from "../middleware/ensureCart.js";
import { addLogger, logger } from "../utils/logger.js";
import generarResetToken from "../utils/tokenreset.js";
import EmailManager from "../service/email.js";
const emailManager = new EmailManager();

class UserController {
    async register(req, res) {
        const { first_name, last_name, email, password, age } = req.body;
        try {
            const existeUsuario = await UsersModel.findOne({ email });
            if (existeUsuario) {
                return res.status(400).send("El usuario ya existe");
            }

            const nuevoCarrito = new CartsModel();
            await nuevoCarrito.save();

            const nuevoUsuario = await UsersModel.create({
                first_name,
                last_name,
                email,
                cart: nuevoCarrito._id,
                password: createHash(password),
                age
            });

            await nuevoUsuario.save();

            res.redirect("/login");
        } catch (error) {
            next(createError(ERROR_TYPES.SERVER_ERROR, "Error interno del servidor", { originalError: error.message }));
            req.logger.error("Error interno del servidor" + error.mensaje)
        }
    }

    async login(req, res) {
        if (!req.user) {
            return res.status(400).send("Credenciales inválidas");
        }

        // Asegurar que el usuario tenga un carrito
        await ensureCart(req, res, async () => {
            req.session.user = {
                _id: req.user._id,
                first_name: req.user.first_name,
                last_name: req.user.last_name,
                age: req.user.age,
                email: req.user.email,
                cart: req.user.cart
            };

            req.session.login = true;
            res.redirect("/profile");
        });
        console.log("Sesión del usuario después de login:", req.session.user);
    }
    async createUser(req, res) {
        try {
            // Lógica para crear un usuario
            const user = await UsersModel.create(req.body);
            res.status(201).json(user);
        } catch (error) {
            next(createError(ERROR_TYPES.SERVER_ERROR, "Error interno del servidor", { originalError: error.message }));
            req.logger.error("Error interno del servidor" + error.mensaje)
        }
    }

    async profile(req, res) {
        if (req.isAuthenticated()) {
            res.json(req.user);
        } else {
            res.status(401).send("No autorizado");
        }
    }

    async logout(req, res) {
            try {
                req.session.destroy((err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Logout failed' });
                    }
                    res.clearCookie('connect.sid'); // Clear the session cookie
                    return res.redirect('/login'); // Redirigir después de borrar la cookie y destruir la sesión
                });
            } catch (error) {
                next(createError(ERROR_TYPES.SERVER_ERROR, "Error interno del servidor", { originalError: error.message }));
                req.logger.error("Error interno del servidor" + error.mensaje)
            }
        }

    async admin(req, res) {
        if (req.session.user.role !== "admin") {
            return res.status(403).send("Acceso denegado");

        }
        res.render("admin");
    }

//Tercer Integradora: 

async requestPasswordReset(req, res) {
    const { email } = req.body;
    try {
        //Buscar al usuario por email
        const user = await UsersModel.findOne({ email });

        if (!user) {
            //Si no hay usuario tiro error y el metodo termina aca. 
            return res.status(404).send("Usuario no encontrado");
        }

        //Peeero, si hay usuario, le genero un token: 

        const token = generarResetToken();
        //Recuerden que esto esta en la carpetita utils. 

        //Una vez que tenemos el token se lo podemos agregar al usuario: 

        user.resetToken = {
            token: token,
            expire: new Date(Date.now() + 3600000) // 1 Hora de duración. 
        }

        await user.save();

        //Despues que guardamos los cambios, mandamos el mail: 
        await emailManager.enviarCorreoRestablecimiento(email, user.first_name, token);

        res.redirect("/confirmacion-envio");
    } catch (error) {
        res.status(500).send("Error interno del servidor");
    }
}

async resetPassword(req, res) {
    const { email, password, token } = req.body;

    try {
        //Busco el usuario: 
        const user = await UsersModel.findOne({ email });
        if (!user) {
            return res.render("passwordcambio", { error: "Usuario no encontrado" });
        }

        //Saco token y lo verificamos: 
        const resetToken = user.resetToken;
        if (!resetToken || resetToken.token !== token) {
            return res.render("passwordreset", { error: "El token es invalido" });
        }

        //Verificamos si el token expiro: 
        const ahora = new Date();
        if (ahora > resetToken.expire) {
            return res.render("passwordreset", { error: "El token es invalido" });
        }

        //Verificamos que la contraseña nueva no sea igual a la anterior: 
        if (isValidPassword(password, user)) {
            return res.render("passwordcambio", { error: "La nueva contraseña no puede ser igual a la anterior" });
        }

        //Actualizo la contraseña: 
        user.password = createHash(password);

        //Marcamos como usado el token: 
        user.resetToken = undefined;
        await user.save();

        return res.redirect("/login");

    } catch (error) {
        res.status(500).render("passwordreset", { error: "Error interno del servidor" });
    }
}

//Cambiar el rol del usuario: 

async cambiarRolPremium(req, res) {
    const {uid} = req.params; 
    try {
        //Busco el usuario: 
        const user = await UsersModel.findById(uid); 

        if(!user) {
            return res.status(404).send("Usuario no encontrado"); 
        }

        //Peeeeero si lo encuentro, le cambio el rol: 

        const nuevoRol = user.role === "usuario" ? "premium" : "usuario"; 

        const actualizado = await UsersModel.findByIdAndUpdate(uid, {role: nuevoRol});
        res.json(actualizado); 
    } catch (error) {
        res.status(500).send("Error en el servidor, a Fede le baja la temperatura a -4 grados ahora en verano"); 
    }
}


}
export default UserController;