import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';
import request from 'supertest';
import { EmailService } from '../src/modules/notifications/email.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('SecurityDevicesController (e2e)', () => {
    let app: INestApplication;
    let sendConfirmationEmailSpy: jest.SpyInstance;

    beforeAll(async () => {
        const testingAppModule: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(ThrottlerGuard)
            .useValue({
                // Разрешаем абсолютно все запросы в тестах
                canActivate: (context: ExecutionContext) => true,
            })
            .compile();

        app = testingAppModule.createNestApplication();
        appSetup(app);
        await app.init();
    });

    afterAll(async () => {
        if (app) {
            await request(app.getHttpServer()).delete('/testing/all-data');
            await app.close();
        }
    });

    beforeEach(async () => {
        await request(app.getHttpServer()).delete('/testing/all-data');

        // Создаем шпион И подменяем его реализацию в одном месте
        sendConfirmationEmailSpy = jest
            .spyOn(EmailService.prototype, 'sendConfirmationEmail')
            .mockImplementation(async () => Promise.resolve());
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    it('GET /security/devices - should return 200 and an array of DeviceViewModel', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };
        const login = 'admin';
        const password = 'qwerty';
        const authHeader =
            'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

        const createUserResponse = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_1)
            .expect(201);

        expect(createUserResponse.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        const createAuthLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        expect(createAuthLoginResponse.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse.body.accessToken).toEqual(
            expect.any(String),
        );

        expect(createAuthLoginResponse.headers['set-cookie']).toBeDefined();

        const rawCookies = createAuthLoginResponse.headers['set-cookie'];
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshTokenCookie = cookies.find((cookie) =>
            cookie.includes('refreshToken'),
        );

        expect(refreshTokenCookie).toBeDefined();
        expect(refreshTokenCookie).toContain('refreshToken=');
        expect(refreshTokenCookie).toContain('HttpOnly');

        // const cleanCookie = refreshTokenCookie.split(';')[0];

        // запрос на эндпоинт /security/devices с передачей куки
        const devicesResponse = await request(app.getHttpServer())
            .get('/security/devices')
            .set('Cookie', refreshTokenCookie)
            .expect(200);


        // Проверяем, что в теле пришел массив устройств
        expect(Array.isArray(devicesResponse.body)).toBe(true);
        expect(devicesResponse.body).toHaveLength(1);

        // Проверяем структуру элементов массива (DeviceViewModel)
        expect(devicesResponse.body[0]).toEqual({
            ip: expect.any(String),
            title: expect.any(String), // User-Agent / deviceName
            lastActiveDate: expect.any(String),
            deviceId: expect.any(String),
        });
    });


    it('GET /security/devices - multiple devices logged in from single user, should return 200 and an array of DeviceViewModel', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };
        const login = 'admin';
        const password = 'qwerty';
        const authHeader =
            'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

        const createUserResponse = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_1)
            .expect(201);

        expect(createUserResponse.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        const createAuthLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        expect(createAuthLoginResponse.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse.body.accessToken).toEqual(
            expect.any(String),
        );

        expect(createAuthLoginResponse.headers['set-cookie']).toBeDefined();

        const rawCookies = createAuthLoginResponse.headers['set-cookie'];
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshTokenCookie = cookies.find((cookie) =>
            cookie.includes('refreshToken'),
        );

        expect(refreshTokenCookie).toBeDefined();
        expect(refreshTokenCookie).toContain('refreshToken=');
        expect(refreshTokenCookie).toContain('HttpOnly');


        // логиним юзера второй раз
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const createAuthLoginResponse1 = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        expect(createAuthLoginResponse1.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse1.body.accessToken).toEqual(
            expect.any(String),
        );

        expect(createAuthLoginResponse1.headers['set-cookie']).toBeDefined();

        // const rawCookies1 = createAuthLoginResponse1.headers['set-cookie'];
        // const cookies1 = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        // const refreshTokenCookie1 = cookies.find((cookie) =>
        //     cookie.includes('refreshToken'),
        // );


        // запрос на эндпоинт /security/devices с передачей куки
        const devicesResponse = await request(app.getHttpServer())
            .get('/security/devices')
            .set('Cookie', refreshTokenCookie)
            .expect(200);


        // Проверяем, что в теле пришел массив устройств
        expect(Array.isArray(devicesResponse.body)).toBe(true);
        expect(devicesResponse.body).toHaveLength(2);

        // Проверяем структуру элементов массива (DeviceViewModel)
        expect(devicesResponse.body[0]).toEqual({
            ip: expect.any(String),
            title: expect.any(String), // User-Agent / deviceName
            lastActiveDate: expect.any(String),
            deviceId: expect.any(String),
        });
    });


    it('DELETE /security/devices/:deviceId - should return 404 error if deviceId uri param not found ', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };
        const login = 'admin';
        const password = 'qwerty';
        const authHeader =
            'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

        const createUserResponse = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_1)
            .expect(201);

        expect(createUserResponse.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        const createAuthLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        expect(createAuthLoginResponse.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse.body.accessToken).toEqual(
            expect.any(String),
        );

        expect(createAuthLoginResponse.headers['set-cookie']).toBeDefined();

        const rawCookies = createAuthLoginResponse.headers['set-cookie'];
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshTokenCookie = cookies.find((cookie) =>
            cookie.includes('refreshToken'),
        );

        expect(refreshTokenCookie).toBeDefined();
        expect(refreshTokenCookie).toContain('refreshToken=');
        expect(refreshTokenCookie).toContain('HttpOnly');

        // const cleanCookie = refreshTokenCookie.split(';')[0];

        // запрос на эндпоинт /security/devices с передачей куки
        const devicesResponse = await request(app.getHttpServer())
            .get('/security/devices')
            .set('Cookie', refreshTokenCookie)
            .expect(200);


        // Проверяем, что в теле пришел массив устройств
        expect(Array.isArray(devicesResponse.body)).toBe(true);
        expect(devicesResponse.body).toHaveLength(1);

        // Проверяем структуру элементов массива (DeviceViewModel)
        expect(devicesResponse.body[0]).toEqual({
            ip: expect.any(String),
            title: expect.any(String), // User-Agent / deviceName
            lastActiveDate: expect.any(String),
            deviceId: expect.any(String),
        });

        // const deviceId = devicesResponse.body[0].deviceId;

        const devicesResponseDeleteAttempt = await request(app.getHttpServer())
            .delete('/security/devices/111111')
            .set('Cookie', refreshTokenCookie)
            .expect(404);
    });


    it('DELETE /security/devices/:deviceId - should return 403 error if user tries to delete another user device', async () => {
        // 1. Создаем и логиним 1-го пользователя
        const user_1 = {
            login: 'user1',
            password: 'lg-988508',
            email: 'user1@example.dev',
        };

        const login = 'admin';
        const password = 'qwerty';
        const authHeader =
            'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

        await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_1)
            .expect(201);

        const loginRes1 = await request(app.getHttpServer())
            .post('/auth/login')
            .set('User-Agent', 'Device-User-1')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        const cookies1 = Array.isArray(loginRes1.headers['set-cookie'])
            ? loginRes1.headers['set-cookie']
            : [loginRes1.headers['set-cookie']];
        const refreshTokenUser1 = cookies1.find((c) => c.includes('refreshToken'));

        // Получаем deviceId 1-го пользователя
        const devicesRes1 = await request(app.getHttpServer())
            .get('/security/devices')
            .set('Cookie', refreshTokenUser1)
            .expect(200);

        const deviceIdUser1 = devicesRes1.body[0].deviceId;

        // 2. Создаем и логиним 2-го пользователя
        const user_2 = {
            login: 'user2',
            password: 'lg-988508',
            email: 'user2@example.dev',
        };

        await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_2)
            .expect(201);

        const loginRes2 = await request(app.getHttpServer())
            .post('/auth/login')
            .set('User-Agent', 'Device-User-2')
            .send({ loginOrEmail: user_2.login, password: user_2.password })
            .expect(200);

        const cookies2 = Array.isArray(loginRes2.headers['set-cookie'])
            ? loginRes2.headers['set-cookie']
            : [loginRes2.headers['set-cookie']];
        const refreshTokenUser2 = cookies2.find((c) => c.includes('refreshToken'));

        // 3. Пытаемся 2-м пользователем удалить сессию 1-го пользователя -> 403 Forbidden
        await request(app.getHttpServer())
            .delete(`/security/devices/${deviceIdUser1}`)
            .set('Cookie', refreshTokenUser2)
            .expect(403);
    });

    it('DELETE /security/devices - should terminate all other sessions except current and return 204', async () => {
        const user = {
            login: 'multi_d', // multi_device_user
            password: 'lg-988508',
            email: 'multid@example.dev',
        };

        const login = 'admin';
        const password = 'qwerty';
        const authHeader =
            'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

        await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user)
            .expect(201);

        // Логин с 1-го устройства
        await request(app.getHttpServer())
            .post('/auth/login')
            .set('User-Agent', 'Browser-Chrome')
            .send({ loginOrEmail: user.login, password: user.password })
            .expect(200);

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Логин со 2-го устройства (активная сессия, с которой будем удалять остальные)
        const activeLoginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .set('User-Agent', 'Browser-Safari')
            .send({ loginOrEmail: user.login, password: user.password })
            .expect(200);

        const cookies = Array.isArray(activeLoginRes.headers['set-cookie'])
            ? activeLoginRes.headers['set-cookie']
            : [activeLoginRes.headers['set-cookie']];
        const activeRefreshToken = cookies.find((c) => c.includes('refreshToken'));

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Логин с 3-го устройства
        await request(app.getHttpServer())
            .post('/auth/login')
            .set('User-Agent', 'Browser-MobileApp')
            .send({ loginOrEmail: user.login, password: user.password })
            .expect(200);

        // Убеждаемся, что сейчас у юзера 3 активных устройства
        const beforeDeleteRes = await request(app.getHttpServer())
            .get('/security/devices')
            .set('Cookie', activeRefreshToken)
            .expect(200);

        expect(beforeDeleteRes.body).toHaveLength(3);

        // Отправляем DELETE /security/devices со 2-го устройства
        await request(app.getHttpServer())
            .delete('/security/devices')
            .set('Cookie', activeRefreshToken)
            .expect(204);

        // Проверяем, что осталась ТОЛЬКО текущая активная сессия (1 устройство)
        const afterDeleteRes = await request(app.getHttpServer())
            .get('/security/devices')
            .set('Cookie', activeRefreshToken)
            .expect(200);

        expect(afterDeleteRes.body).toHaveLength(1);
        expect(afterDeleteRes.body[0].title).toContain('Browser-Safari');
    });
});