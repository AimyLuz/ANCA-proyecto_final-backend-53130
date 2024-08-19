import supertest from 'supertest';
import { expect } from "chai";
import mongoose from 'mongoose';
import config from '../src/config/config.js';
import ProductsModel from '../src/models/products.model.js';
const requester = supertest('http://localhost:8080');
import userDAO from '../src/dao/userDAO.js';
describe('Testing de la Web App ArrabalMusicStore', () => {
    let token;

    before(async () => {
        await mongoose.connect(config.mongo_url, {
        });

        // Obtener token de autenticación
        const loginResponse = await requester.post('/api/auth/login').send({
            email: 'lachiqjui@legrand.com',
            password: 12364
        });
        token = loginResponse.body.token;
    });

    after(async () => {
        await mongoose.connection.close();
    });

    it("El DAO debe poder agregar un usuario nuevo a la Base de Datos", async function () {
        let newUser = {
            first_name: "Mirtha",
            last_name: "Legrand",
            email: "lachiqjui@legrand.com",
            password: 12364
        }

        const createdUser = await userDAO.create(newUser);

        expect(createdUser).to.have.property("_id"); 
    });

    describe('Testing de productos', () => {
        beforeEach(async () => {
            await ProductsModel.deleteMany({ forTesting: true });
        });

        afterEach(async () => {
            await ProductsModel.deleteMany({ forTesting: true });
        });

        it('GET /api/products - debe obtener todos los productos', async () => {
            const { statusCode, body } = await requester
                .get('/api/products')
                .set('Authorization', `Bearer ${token}`);
            expect(statusCode).to.equal(200);
            expect(body).to.have.property('status', 'success');
            expect(body.payload).to.be.an('array');
        });

        it('GET /api/products/:pid - debe obtener un producto por ID', async () => {
            const productId = '665610b103bbffe081d90c72'; // Ajusta este ID según tu base de datos
            const { statusCode, body } = await requester.get(`/api/products/${productId}`);
            expect(statusCode).to.equal(200);
            expect(body).to.have.property('message', 'Product found:');
            expect(body.product).to.be.an('object');
        });

        it('GET /api/products/:pid - debe devolver 404 para un ID de producto no existente', async () => {
            const nonExistentProductId = 'nonExistentProductId';
            const { statusCode, body } = await requester.get(`/api/products/${nonExistentProductId}`);
            expect(statusCode).to.equal(404);
            expect(body).to.have.property('message', `A product with the id ${nonExistentProductId} was not found`);
        });

        it('POST /api/products - debe añadir un nuevo producto', async () => {
            const newProduct = {
                title: 'New Product',
                description: 'This is a new product',
                category: 'Electronics',
                price: 99.99,
                code: 'NP123',
                stock: 50,
                status: true,
                forTesting: true
            };

            const { statusCode, body } = await requester.post('/api/products').send(newProduct);
            expect(statusCode).to.equal(200);
            expect(body).to.have.property('message', 'Product added successfully:');
            expect(body).to.be.an('object');
        });

        it('POST /api/products - debe devolver 400 por falta de campos obligatorios', async () => {
            const newProduct = {
                description: 'This is a new product',
                category: 'Electronics',
                price: 99.99,
                code: 'NP123',
                stock: 50,
                status: true
            };

            const { statusCode, body } = await requester.post('/api/products').send(newProduct);
            expect(statusCode).to.equal(400);
            expect(body).to.have.property('message', 'All fields are mandatory.');
        });

        it('POST /api/products - debe devolver 400 por código de producto duplicado', async () => {
            const existingProduct = {
                title: 'Existing Product',
                description: 'This is an existing product',
                category: 'Electronics',
                price: 99.99,
                code: 'NP123', // Código ya existente
                stock: 50,
                status: true
            };

            const { statusCode, body } = await requester.post('/api/products').send(existingProduct);
            expect(statusCode).to.equal(400);
            expect(body).to.have.property('message', 'A product with that code already exists.');
        });
    });

    describe('Testing de carritos', () => {
        it('POST /api/carts - debe crear un nuevo carrito', async () => {
            const { statusCode, body } = await requester.post('/api/carts');
            expect(statusCode).to.equal(200);
            expect(body).to.have.property('newCart');
            expect(body.newCart).to.be.an('object');
        });

        it('GET /api/carts/:cid - debe obtener un carrito por ID', async () => {
            const cartId = '66552c166d2ea6d8ad2d69d8'; // Ajusta este ID según tu base de datos
            const { statusCode, body } = await requester.get(`/api/carts/${cartId}`);
            expect(statusCode).to.equal(200);
            expect(body).to.be.an('array');
        });

        it('GET /api/carts/:cid - debe devolver 404 para un ID de carrito no existente', async () => {
            const nonExistentCartId = 'nonExistentCartId';
            const { statusCode, body } = await requester.get(`/api/carts/${nonExistentCartId}`);
            expect(statusCode).to.equal(404);
            expect(body).to.have.property('error', `No cart exists with the id ${nonExistentCartId}`);
        });

        it('POST /api/carts/:cid/product/:pid - debe añadir un producto a un carrito', async () => {
            const cartId = '66552c166d2ea6d8ad2d69d8'; // Ajusta este ID según tu base de datos
            const productId = '665610b103bbffe081d90c72'; // Ajusta este ID según tu base de datos
            const { statusCode, header } = await requester.post(`/api/carts/${cartId}/product/${productId}`).send({ quantity: 2 });
            expect(statusCode).to.equal(302); // Código de estado para redirección
            expect(header.location).to.equal(`/carts/${cartId}`);
        });

        it('POST /api/carts/:cid/product/:pid - debe devolver 404 para un ID de carrito no existente', async () => {
            const nonExistentCartId = 'nonExistentCartId';
            const productId = '665610b103bbffe081d90c72';
            const { statusCode, body } = await requester.post(`/api/carts/${nonExistentCartId}/product/${productId}`).send({ quantity: 2 });
            expect(statusCode).to.equal(404);
            expect(body).to.have.property('error', `No cart exists with the id ${nonExistentCartId}`);
        });

        it('POST /api/carts/:cid/product/:pid - debe devolver 404 para un ID de producto no existente', async () => {
            const cartId = '66552c166d2ea6d8ad2d69d8';
            const nonExistentProductId = 'nonExistentProductId';
            const { statusCode, body } = await requester.post(`/api/carts/${cartId}/product/${nonExistentProductId}`).send({ quantity: 2 });
            expect(statusCode).to.equal(404);
            expect(body).to.have.property('error', `A product with the id ${nonExistentProductId} was not found.`);
        });

        it('DELETE /api/carts/:cid - debe vaciar un carrito', async () => {
            const cartId = '66552c166d2ea6d8ad2d69d8'; // Ajusta este ID según tu base de datos
            const { statusCode, body } = await requester.delete(`/api/carts/${cartId}`);
            expect(statusCode).to.equal(200);
            expect(body).to.have.property('message', 'All products have deleted from cart successfully.');
        });

        it('DELETE /api/carts/:cid - debe devolver 404 para un ID de carrito no existente', async () => {
            const nonExistentCartId = 'nonExistentCartId';
            const { statusCode, body } = await requester.delete(`/api/carts/${nonExistentCartId}`);
            expect(statusCode).to.equal(404);
            expect(body).to.have.property('error', `No cart exists with the id ${nonExistentCartId}`);
        });

        it('DELETE /api/carts/:cid/product/:pid - debe eliminar un producto de un carrito', async () => {
            const cartId = '66552c166d2ea6d8ad2d69d8'; // Ajusta este ID según tu base de datos
            const productId = '665610b103bbffe081d90c72'; // Ajusta este ID según tu base de datos
            const { statusCode, body } = await requester.delete(`/api/carts/${cartId}/product/${productId}`);
            expect(statusCode).to.equal(200);
            expect(body).to.have.property('message', 'The product has been removed successfully from the cart.');
        });

        it('DELETE /api/carts/:cid/product/:pid - debe devolver 404 para un ID de producto no existente', async () => {
            const cartId = '66552c166d2ea6d8ad2d69d8';
            const nonExistentProductId = 'nonExistentProductId';
            const { statusCode, body } = await requester.delete(`/api/carts/${cartId}/product/${nonExistentProductId}`);
            expect(statusCode).to.equal(404);
            expect(body).to.have.property('error', `A product with the id ${nonExistentProductId} was not found.`);
        });
    });
});