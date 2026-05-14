const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/user');
const mongoose = require('mongoose');

const userOneId = new mongoose.Types.ObjectId();
const userOne = {
    _id: userOneId,
    name: 'TestUser',
    email: 'test@example.com',
    password: 'SuperSecret123!',
    age: 25
};

beforeEach(async () => {
    // Очищаємо колекцію перед кожним тестом
    await User.deleteMany();
    // Створюємо базового користувача для тестів
    await new User(userOne).save();
});

afterAll(async () => {
    await mongoose.connection.close();
});

test('Should signup a new user', async () => {
    const response = await request(app).post('/users').send({
        name: 'NewUser',
        email: 'newuser@example.com',
        password: 'SuperSecret456!',
        age: 20
    }).expect(201); // Або 200, в залежності від того які статуси у вашому API

    // Переконуємось що пароль не повертається завдяки методу toJSON
    expect(response.body.password).toBeUndefined();
    expect(response.body.tokens).toBeUndefined();
});

test('Should login existing user', async () => {
    const response = await request(app).post('/users/login').send({
        email: userOne.email,
        password: userOne.password
    }).expect(200);

    expect(response.body.token).toBeDefined();
});

test('Should update user profile (/users/me)', async () => {
    // Спочатку логінимось
    const loginRes = await request(app).post('/users/login').send({
        email: userOne.email,
        password: userOne.password
    }).expect(200);

    const token = loginRes.body.token;

    // Потім оновлюємо
    await request(app).patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'UpdatedName' })
        .expect(200);

    const user = await User.findById(userOneId);
    expect(user.name).toBe('UpdatedName');
});

test('Should delete user profile (/users/me)', async () => {
    const loginRes = await request(app).post('/users/login').send({
        email: userOne.email,
        password: userOne.password
    }).expect(200);

    const token = loginRes.body.token;

    await request(app).delete('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    const user = await User.findById(userOneId);
    expect(user).toBeNull();
});

test('Should logout from all devices (/users/logoutAll)', async () => {
    const loginRes1 = await request(app).post('/users/login').send({
        email: userOne.email,
        password: userOne.password
    }).expect(200);

    const loginRes2 = await request(app).post('/users/login').send({
        email: userOne.email,
        password: userOne.password
    }).expect(200);

    // Здійснюємо вихід з усіх пристроїв за допомогою одного з токенів
    await request(app).post('/users/logoutAll')
        .set('Authorization', `Bearer ${loginRes1.body.token}`)
        .expect(200);

    const user = await User.findById(userOneId);
    expect(user.tokens.length).toBe(0);
});
