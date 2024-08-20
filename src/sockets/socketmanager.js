//sockets/socketmanager.js
import { Server } from "socket.io";
import MessageModel from "../models/mesagge.model.js";

class SocketManager {
    constructor(httpServer) {
        this.io = new Server(httpServer); // Usa 'new Server' en lugar de 'Socket'
        this.initSocketEvents();
    }

    async initSocketEvents() {
        this.io.on("connection", async (socket) => {
            console.log("Un cliente se conectó");

            socket.on("message", async (data) => {
                await MessageModel.create(data);
                const messages = await MessageModel.find();
                this.io.emit("messagesLogs", messages); // Usa 'this.io.emit' en lugar de 'socket.emit'
            });
        });
    }
}

export default SocketManager;