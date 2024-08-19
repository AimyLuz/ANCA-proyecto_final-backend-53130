//user.router.js
import express from "express";
import passport from "passport";
import UserController from "../controllers/user.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
const uc = new UserController();
import checkUserRole from "../middleware/checkrole.js";
import UserRepository from "../repositories/user.repository.js";
const ur = new UserRepository();
const router = express.Router();


// Nueva ruta para obtener todos los usuarios
router.get("/", async (req, res) => {
    try {
        const users = await ur.getAll();
        res.status(200).json(users);
    } catch (error) {
        req.logger.error('Error al obtener los usuarios: ' + error.message);
        res.status(500).send('Error al obtener los usuarios');
    }
});
router.get("/:uid", async (req, res) => {
    try {
        const userId = req.params.uid;
        const user = await ur.getById(userId); // Suponiendo que tienes un método getById en tu UserRepository
        if (!user) {
            return res.status(404).send({ error: 'Usuario no encontrado' });
        }
        res.status(200).json(user);
    } catch (error) {
        req.logger.error('Error al obtener el usuario: ' + error.message);
        res.status(500).send('Error al obtener el usuario');
    }
});
router.post("/", async (req, res) => {
    try {
        const newUser = req.body;
        const createdUser = await ur.create(newUser); // Suponiendo que tienes un método create en tu UserRepository
        res.status(201).json(createdUser);
    } catch (error) {
        req.logger.error('Error al crear el usuario: ' + error.message);
        res.status(500).send('Error al crear el usuario');
    }
});
// Rutas para registrar y loguear usuarios
router.post("/register", passport.authenticate("register", { failureRedirect: "/failedregister" }), uc.register);
router.post("/login", passport.authenticate("login", { failureRedirect: "/faillogin" }), uc.login);

// Rutas protegidas que requieren autenticación
router.get("/profile", authMiddleware, uc.profile);
//router.post("/logout", authMiddleware, uc.logout);
router.post("/logout", authMiddleware, uc.logout); // Usamos POST para logout

router.get("/admin", authMiddleware, checkUserRole(['admin']), uc.admin);

router.post("/users", uc.createUser);

router.get("/failedregister", (req, res) => res.send("Registro Fallido!"));
router.get("/faillogin", (req, res) => res.send("Fallo todo, vamos a morir"));

router.get("/github", passport.authenticate("github", { scope: ["user:email"] }), (req, res) => {});
router.get("/githubcallback", passport.authenticate("github", { failureRedirect: "/login" }), (req, res) => {
    req.session.user = req.user;
    req.session.login = true;
    res.redirect("/profile");
});

router.get('/current', authMiddleware, async (req, res) => {
    try {
        const userDTO = await ur.getById(req.user._id);
        res.json(userDTO);
    } catch (error) {
        res.status(500).send('Error interno del servidor');
    }
});
//Tercer integradora: 

//Nueva ruta!
router.post("/requestPasswordReset", uc.requestPasswordReset);
router.post("/reset-password", uc.resetPassword);
router.put("/premium/:uid", uc.cambiarRolPremium);
export default router;