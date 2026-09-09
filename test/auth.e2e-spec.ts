import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';
import request from 'supertest';
import { EmailService } from '../src/modules/notifications/email.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('UsersController and AuthController (e2e)', () => {
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

    it('POST /users and POST /auth/login - should return 201 and userview of a created user', async () => {
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
    });

    it('POST /auth/registration - should return status 204 and create new user and send confirmation email with code', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };

        await request(app.getHttpServer())
            .post('/auth/registration')
            .send(user_1)
            .expect(204);

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);
        expect(sendConfirmationEmailSpy.mock.calls[0][0]).toBe(user_1.email);
    });

    it('POST /auth/registration - should return status 400 while trying to register user with same email', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };

        const user_2 = {
            login: 'qwerty2',
            password: 'lg-988508_',
            email: 'example@example.dev',
        };

        await request(app.getHttpServer())
            .post('/auth/registration')
            .send(user_1)
            .expect(204);

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);
        expect(sendConfirmationEmailSpy.mock.calls[0][0]).toBe(user_1.email);

        await request(app.getHttpServer())
            .post('/auth/registration')
            .send(user_2)
            .expect(400);

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);
    });

    it('POST /auth/registration-email-resending - status 204, should send email with new code if user exists but not confirmed yet', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };

        const user_1_resending = {
            email: 'example@example.dev',
        };

        await request(app.getHttpServer())
            .post('/auth/registration')
            .send(user_1)
            .expect(204);

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);
        expect(sendConfirmationEmailSpy.mock.calls[0][0]).toBe(user_1.email);

        await request(app.getHttpServer())
            .post('/auth/registration-email-resending')
            .send(user_1_resending)
            .expect(204);

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(2);
        expect(sendConfirmationEmailSpy.mock.calls[1][0]).toBe(user_1.email);
    });

    it('POST /auth/registration-confirmation - status 204, should confirm registration by email', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };

        await request(app.getHttpServer())
            .post('/auth/registration')
            .send(user_1)
            .expect(204);

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);
        expect(sendConfirmationEmailSpy.mock.calls[0][0]).toBe(user_1.email);
        expect(sendConfirmationEmailSpy.mock.calls[0][1]).toStrictEqual(
            expect.any(String),
        );

        const userConfirmationCode = {
            code: sendConfirmationEmailSpy.mock.calls[0][1],
        };

        await request(app.getHttpServer())
            .post('/auth/registration-confirmation')
            .send(userConfirmationCode)
            .expect(204);

        await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);
    });

    it('POST /auth/registration-confirmation - status 400, should return error if code already confirmed', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };

        const res = await request(app.getHttpServer())
            .post('/auth/registration')
            .send(user_1)
            .expect(204);

        // if (res.status === 500) {
        //     console.log('РЕАЛЬНАЯ ОШИБКА 500:', res.body);
        // }

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);

        const userConfirmationCode = {
            code: sendConfirmationEmailSpy.mock.calls[0][1],
        };

        await request(app.getHttpServer())
            .post('/auth/registration-confirmation')
            .send(userConfirmationCode)
            .expect(204);

        await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        await request(app.getHttpServer())
            .post('/auth/registration-confirmation')
            .send(userConfirmationCode)
            .expect(400);
    });

    it('POST /auth/registration-email-resending - status 400, should return error if email already confirmed', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };

        await request(app.getHttpServer())
            .post('/auth/registration')
            .send(user_1)
            .expect(204);

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);

        const userConfirmationCode = {
            code: sendConfirmationEmailSpy.mock.calls[0][1],
        };

        await request(app.getHttpServer())
            .post('/auth/registration-confirmation')
            .send(userConfirmationCode)
            .expect(204);

        const user_1_resending = {
            email: 'example@example.dev',
        };

        await request(app.getHttpServer())
            .post('/auth/registration-email-resending')
            .send(user_1_resending)
            .expect(400);
    });

    it('POST /auth/registration-confirmation - status 400, should return error if code doesnt exist', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };

        await request(app.getHttpServer())
            .post('/auth/registration')
            .send(user_1)
            .expect(204);

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);

        const userConfirmationCode = {
            code: 'not existing code',
        };

        await request(app.getHttpServer())
            .post('/auth/registration-confirmation')
            .send(userConfirmationCode)
            .expect(400);
    });

    it('POST /auth/registration-email-resending - status 400, should return error if user email doesnt exist', async () => {
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-988508',
            email: 'example@example.dev',
        };

        await request(app.getHttpServer())
            .post('/auth/registration')
            .send(user_1)
            .expect(204);

        expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);

        const user_1_resending = {
            email: 'non_existing@example.dev',
        };

        await request(app.getHttpServer())
            .post('/auth/registration-email-resending')
            .send(user_1_resending)
            .expect(400);
    });
});