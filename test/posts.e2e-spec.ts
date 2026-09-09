import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';
import request from 'supertest';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Comment } from '../src/modules/bloggers-platform/comments/domain/comment.entity';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('PostsController (e2e)', () => {
    let app: INestApplication;
    let commentModel: Model<any>; // Переменная для прямой работы с БД

    beforeAll(async () => {
        const testingAppModule: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(ThrottlerGuard) // отключаем троттлер, т.к. он запарывает тесты изза обращения к логину пользователя слишком часто
            .useValue({
                canActivate: () => true, // Разрешаем абсолютно любые запросы без ограничений
            })
            .compile();
        app = testingAppModule.createNestApplication();
        appSetup(app); // не забываем подключить глобальные префиксы, пайпы
        await app.init();

        // достаем модель комментариев напрямую из контейнера NestJS
        commentModel = app.get<Model<any>>(getModelToken(Comment.name));
    });

    afterAll(async () => {
        await request(app.getHttpServer()).delete('/testing/all-data');
        await app.close();
    });

    // Очищаем базу перед каждым тестом через специальный контроллер
    beforeEach(async () => {
        await request(app.getHttpServer()).delete('/testing/all-data');
    });

    it('GET /posts - should return 201 and paginated post list', async () => {
        // создание пользователя
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
            .set('Authorization', authHeader) // <--- УСТАНАВЛИВАЕМ ХЕДЕР ТУТ
            .send(user_1)
            .expect(201);

        // проверяем что юзер создался коректно
        expect(createUserResponse.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        // логиним созданного юзера
        const createAuthLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        // {
        //     "accessToken" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMWM1YWM4ODdiNmFiNTlhYjg2ZDFmMiIsImlhdCI6MTc4MDI0MzE0NiwiZXhwIjoxNzgwMjQ2NzQ2fQ.jDyTdoIO-_KcGpM3pEQsDWvPLiME2TscR_7UK0H2-qk"
        // }

        // проверяем что нам вернулись рефреш токен и эксесс токен
        expect(createAuthLoginResponse.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse.body.accessToken).toEqual(
            expect.any(String),
        );

        // ==========================================
        // ПРОВЕРКА КУКИ REFRESH-ТОКЕНА
        // ==========================================

        // проверяем, что массив заголовков set-cookie вообще существует
        expect(createAuthLoginResponse.headers['set-cookie']).toBeDefined();

        // ищем нашу куку среди установленных кук
        const rawCookies = createAuthLoginResponse.headers['set-cookie'];

        // Превращаем в массив в любом случае (если это была строка, оборачиваем в массив)
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshTokenCookie = cookies.find((cookie) =>
            cookie.includes('refreshToken'),
        );

        // кука с именем refreshToken была найдена
        expect(refreshTokenCookie).toBeDefined();

        // проверка флагов безопасности
        expect(refreshTokenCookie).toContain('refreshToken=');
        expect(refreshTokenCookie).toContain('HttpOnly');

        // создание блога с использованием basic-authorisation
        const createBlogResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader)
            .send({
                name: 'NodeJS Blog',
                description: 'Backend news',
                websiteUrl: 'https://nodejs.org',
            })
            .expect(201);

        const blog = createBlogResponse.body;
        // структура возвращаемого блога
        /*
        {
        "id": "69f629a4b705ee0b0e4b874e",
        "name": "NodeJS Blog",
        "description": "Backend news",
        "websiteUrl": "https://nodejs.org",
        "createdAt": "2026-05-02T16:43:16.921Z",
        "isMembership": true
        }
        */

        // создание поста для этого блога
        const createPostDto = {
            title: 'NestJS Testing',
            shortDescription: 'How to write e2e tests',
            content: 'Very long and useful content about supertest...',
        };
        // с использованием basic-authorisation
        const createPostResponse = await request(app.getHttpServer())
            .post(`/blogs/${blog.id}/posts`)
            .set('Authorization', authHeader)
            .send(createPostDto)
            .expect(201);

        // `Bearer ${createAuthLoginResponse.body.accessToken}`
        const createdPost = createPostResponse.body;

        // закомментированное относится к комментам, они не находятся непосредственно в ответе
        // const createCommentDto = {
        //     relatedPostId: createdPost.id,
        //     content: 'comment',
        //     commentatorInfo: {
        //         userId: 'some userId',
        //         userLogin: 'some login',
        //     },
        // };

        // // создаем коммент в посте createdPost.id
        // const createCommentResponse = await request(app.getHttpServer())
        //     .post(`/comments/`)
        //     .send(createCommentDto)
        //     .expect(201);
        //
        // // просто дополнительная проверка того, что размещение коммента отработало как надо
        // expect(createCommentResponse.body).toEqual({
        //     id: expect.any(String),
        //     content: "comment",
        //     commentatorInfo: {
        //         userId: "some userId",
        //         userLogin: "some login"
        //     },
        //     createdAt: expect.any(String),
        //     likesInfo: {
        //         likesCount: 0,
        //         dislikesCount: 0,
        //         myStatus: "None"
        //     }
        // });
        // console.log(createCommentResponse.body);

        const result = await request(app.getHttpServer())
            .get('/posts')
            .expect(200);

        expect(result.body).toEqual({
            totalCount: 1,
            pagesCount: 1,
            page: 1,
            pageSize: 10,
            items: [
                {
                    id: expect.any(String),
                    title: 'NestJS Testing',
                    shortDescription: 'How to write e2e tests',
                    content: 'Very long and useful content about supertest...',
                    blogId: expect.any(String),
                    blogName: 'NodeJS Blog',
                    createdAt: expect.any(String),
                    extendedLikesInfo: {
                        likesCount: 0,
                        dislikesCount: 0,
                        myStatus: 'None',
                        newestLikes: [],
                    },
                },
            ],
        });
        // console.log(result.body);
    });

    it('POST /posts - should return 201 and created post', async () => {
        // создание пользователя
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
            .set('Authorization', authHeader) // <--- УСТАНАВЛИВАЕМ ХЕДЕР ТУТ
            .send(user_1)
            .expect(201);

        // проверяем что юзер создался коректно
        expect(createUserResponse.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        // логиним созданного юзера
        const createAuthLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        // {
        //     "accessToken" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMWM1YWM4ODdiNmFiNTlhYjg2ZDFmMiIsImlhdCI6MTc4MDI0MzE0NiwiZXhwIjoxNzgwMjQ2NzQ2fQ.jDyTdoIO-_KcGpM3pEQsDWvPLiME2TscR_7UK0H2-qk"
        // }

        // проверяем что нам вернулись рефреш токен и эксесс токен
        expect(createAuthLoginResponse.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse.body.accessToken).toEqual(
            expect.any(String),
        );

        // проверяем, что массив заголовков set-cookie вообще существует
        expect(createAuthLoginResponse.headers['set-cookie']).toBeDefined();

        // ищем нашу куку среди установленных кук
        const rawCookies = createAuthLoginResponse.headers['set-cookie'];

        // Превращаем в массив в любом случае (если это была строка, оборачиваем в массив)
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshTokenCookie = cookies.find((cookie) =>
            cookie.includes('refreshToken'),
        );

        // кука с именем refreshToken была найдена
        expect(refreshTokenCookie).toBeDefined();

        // проверка флагов безопасности
        expect(refreshTokenCookie).toContain('refreshToken=');
        expect(refreshTokenCookie).toContain('HttpOnly');

        // создание блога с использованием basic-authorisation
        const createBlogResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader)
            .send({
                name: 'NodeJS Blog',
                description: 'Backend news',
                websiteUrl: 'https://nodejs.org',
            })
            .expect(201);

        const blog = createBlogResponse.body;
        // структура возвращаемого блога
        /*
        {
        "id": "69f629a4b705ee0b0e4b874e",
        "name": "NodeJS Blog",
        "description": "Backend news",
        "websiteUrl": "https://nodejs.org",
        "createdAt": "2026-05-02T16:43:16.921Z",
        "isMembership": true
        }
        */

        // создание поста для этого блога
        const createPostDto = {
            title: 'NestJS Testing',
            shortDescription: 'How to write e2e tests',
            content: 'Very long and useful content about supertest...',
            blogId: blog.id,
        };

        // console.log('ACCESS TOKEN: ', createAuthLoginResponse.body.accessToken);

        // с использованием basic-authorisation
        const createPostResponse = await request(app.getHttpServer())
            .post(`/posts`)
            .set('Authorization', authHeader)
            .send(createPostDto)
            .expect(201);
        const createdPost = createPostResponse.body;
        // `Bearer ${createAuthLoginResponse.body.accessToken}`

        // структура ответа с содержанием созданного поста
        // {
        //     "id": "6a09e013dc2fce1338ab466a",
        //     "title": "NestJS Testing",
        //     "shortDescription": "How to write e2e tests",
        //     "content": "Very long and useful content about supertest...",
        //     "blogId": "6a09e012dc2fce1338ab4666",
        //     "blogName": "NodeJS Blog",
        //     "createdAt": "2026-05-17T15:34:43.367Z",
        //     "extendedLikesInfo": {
        //     "likesCount": 0,
        //         "dislikesCount": 0,
        //         "myStatus": "None",
        //         "newestLikes": []
        // }
        // }

        expect(createPostResponse.body).toEqual({
            id: expect.any(String),
            title: 'NestJS Testing',
            shortDescription: 'How to write e2e tests',
            content: 'Very long and useful content about supertest...',
            blogId: expect.any(String),
            blogName: 'NodeJS Blog',
            createdAt: expect.any(String),
            extendedLikesInfo: {
                likesCount: 0,
                dislikesCount: 0,
                myStatus: 'None',
                newestLikes: [],
            },
        });
    });

    it('POST /posts - should return 400 when passed wrong body data for creation', async () => {
        // создание пользователя
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

        // проверяем что юзер создался коректно
        expect(createUserResponse.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        // логиним созданного юзера
        const createAuthLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        // {
        //     "accessToken" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMWM1YWM4ODdiNmFiNTlhYjg2ZDFmMiIsImlhdCI6MTc4MDI0MzE0NiwiZXhwIjoxNzgwMjQ2NzQ2fQ.jDyTdoIO-_KcGpM3pEQsDWvPLiME2TscR_7UK0H2-qk"
        // }

        // проверяем что нам вернулись рефреш токен и эксесс токен
        expect(createAuthLoginResponse.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse.body.accessToken).toEqual(
            expect.any(String),
        );

        // проверяем, что массив заголовков set-cookie вообще существует
        expect(createAuthLoginResponse.headers['set-cookie']).toBeDefined();

        // ищем нашу куку среди установленных кук
        const rawCookies = createAuthLoginResponse.headers['set-cookie'];

        // Превращаем в массив в любом случае (если это была строка, оборачиваем в массив)
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshTokenCookie = cookies.find((cookie) =>
            cookie.includes('refreshToken'),
        );

        // кука с именем refreshToken была найдена
        expect(refreshTokenCookie).toBeDefined();

        // проверка флагов безопасности
        expect(refreshTokenCookie).toContain('refreshToken=');
        expect(refreshTokenCookie).toContain('HttpOnly');

        // создание блога с использованием basic-authorisation
        const createBlogResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader)
            .send({
                name: 'NodeJS Blog',
                description: 'Backend news',
                websiteUrl: 'https://nodejs.org',
            })
            .expect(201);

        const blog = createBlogResponse.body;
        // структура возвращаемого блога
        /*
        {
        "id": "69f629a4b705ee0b0e4b874e",
        "name": "NodeJS Blog",
        "description": "Backend news",
        "websiteUrl": "https://nodejs.org",
        "createdAt": "2026-05-02T16:43:16.921Z",
        "isMembership": true
        }
        */

        // создание неверного dto для поста этого блога
        const createPostDto = {
            title: '     ',
            shortDescription: 'How to write e2e tests',
            content: '      ',
            blogId: blog.id,
        };

        // console.log('ACCESS TOKEN: ', createAuthLoginResponse.body.accessToken);

        // с использованием basic-authorisation
        const createPostResponse = await request(app.getHttpServer())
            .post(`/posts`)
            .set('Authorization', authHeader)
            .send(createPostDto)
            .expect(400);
        const createdPost = createPostResponse.body;
        // `Bearer ${createAuthLoginResponse.body.accessToken}`
    });

    it('GET /posts/:postId/comments - should return 200 and paginated comments list', async () => {
        // создание пользователя
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
            .set('Authorization', authHeader) // <--- УСТАНАВЛИВАЕМ ХЕДЕР ТУТ
            .send(user_1)
            .expect(201);

        // проверяем что юзер создался коректно
        expect(createUserResponse.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        // логиним созданного юзера
        const createAuthLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        // {
        //     "accessToken" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMWM1YWM4ODdiNmFiNTlhYjg2ZDFmMiIsImlhdCI6MTc4MDI0MzE0NiwiZXhwIjoxNzgwMjQ2NzQ2fQ.jDyTdoIO-_KcGpM3pEQsDWvPLiME2TscR_7UK0H2-qk"
        // }

        // проверяем что нам вернулись рефреш токен и эксесс токен
        expect(createAuthLoginResponse.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse.body.accessToken).toEqual(
            expect.any(String),
        );

        // проверяем, что массив заголовков set-cookie вообще существует
        expect(createAuthLoginResponse.headers['set-cookie']).toBeDefined();

        // ищем нашу куку среди установленных кук
        const rawCookies = createAuthLoginResponse.headers['set-cookie'];

        // Превращаем в массив в любом случае (если это была строка, оборачиваем в массив)
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshTokenCookie = cookies.find((cookie) =>
            cookie.includes('refreshToken'),
        );

        // кука с именем refreshToken была найдена
        expect(refreshTokenCookie).toBeDefined();

        // проверка флагов безопасности
        expect(refreshTokenCookie).toContain('refreshToken=');
        expect(refreshTokenCookie).toContain('HttpOnly');

        // создание блога с использованием basic-authorisation
        const createBlogResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader)
            .send({
                name: 'NodeJS Blog',
                description: 'Backend news',
                websiteUrl: 'https://nodejs.org',
            })
            .expect(201);

        const blog = createBlogResponse.body;
        // структура возвращаемого блога
        /*
        {
        "id": "69f629a4b705ee0b0e4b874e",
        "name": "NodeJS Blog",
        "description": "Backend news",
        "websiteUrl": "https://nodejs.org",
        "createdAt": "2026-05-02T16:43:16.921Z",
        "isMembership": true
        }
        */

        // создание поста для этого блога
        const createPostDto = {
            title: 'NestJS Testing',
            shortDescription: 'How to write e2e tests',
            content: 'Very long and useful content about supertest...',
            blogId: blog.id,
        };

        // console.log('ACCESS TOKEN: ', createAuthLoginResponse.body.accessToken);

        // с использованием basic-authorisation
        const createPostResponse = await request(app.getHttpServer())
            .post(`/posts`)
            .set('Authorization', authHeader)
            .send(createPostDto)
            .expect(201);
        const createdPost = createPostResponse.body;
        // `Bearer ${createAuthLoginResponse.body.accessToken}`

        // создаем коммент с использованием bearer-authorisation
        const createCommentResponse = await request(app.getHttpServer())
            .post(`/posts/${createdPost.id}/comments`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse.body.accessToken}`,
            )
            .send({
                content: 'This query bus approach is incredibly clean!',
            })
            .expect(201);

        // Вызываем тестируемый эндпоинт, который внутри использует QueryBus
        const result = await request(app.getHttpServer())
            .get(`/posts/${createdPost.id}/comments`)
            .query({ pageNumber: 1, pageSize: 10 })
            .expect(200);

        // Проверяем, что QueryBus успешно достал из базы созданный ранее объект и отмаппил в ViewDto
        expect(result.body).toEqual({
            totalCount: 1,
            pagesCount: 1,
            page: 1,
            pageSize: 10,
            items: [
                {
                    id: expect.any(String),
                    content: 'This query bus approach is incredibly clean!',
                    commentatorInfo: {
                        userId: createUserResponse.body.id,
                        userLogin: createUserResponse.body.login,
                    },
                    createdAt: expect.any(String),
                    likesInfo: {
                        likesCount: 0,
                        dislikesCount: 0,
                        myStatus: 'None',
                    },
                },
            ],
        });
    });

    it('PUT /posts/:postId/like-status - should return 200, like status counters and correctly detect myStatus with anonymous and logged-in user', async () => {
        // создание пользователя
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
            .set('Authorization', authHeader) // <--- УСТАНАВЛИВАЕМ ХЕДЕР ТУТ
            .send(user_1)
            .expect(201);

        // проверяем что юзер создался коректно
        expect(createUserResponse.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        // логиним созданного юзера
        const createAuthLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        // {
        //     "accessToken" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMWM1YWM4ODdiNmFiNTlhYjg2ZDFmMiIsImlhdCI6MTc4MDI0MzE0NiwiZXhwIjoxNzgwMjQ2NzQ2fQ.jDyTdoIO-_KcGpM3pEQsDWvPLiME2TscR_7UK0H2-qk"
        // }

        // проверяем что нам вернулись рефреш токен и эксесс токен
        expect(createAuthLoginResponse.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse.body.accessToken).toEqual(
            expect.any(String),
        );

        // проверяем, что массив заголовков set-cookie вообще существует
        expect(createAuthLoginResponse.headers['set-cookie']).toBeDefined();

        // ищем нашу куку среди установленных кук
        const rawCookies = createAuthLoginResponse.headers['set-cookie'];

        // Превращаем в массив в любом случае (если это была строка, оборачиваем в массив)
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshTokenCookie = cookies.find((cookie) =>
            cookie.includes('refreshToken'),
        );

        // кука с именем refreshToken была найдена
        expect(refreshTokenCookie).toBeDefined();

        // проверка флагов безопасности
        expect(refreshTokenCookie).toContain('refreshToken=');
        expect(refreshTokenCookie).toContain('HttpOnly');

        // создание блога с использованием basic-authorisation
        const createBlogResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader)
            .send({
                name: 'NodeJS Blog',
                description: 'Backend news',
                websiteUrl: 'https://nodejs.org',
            })
            .expect(201);

        const blog = createBlogResponse.body;
        // структура возвращаемого блога
        /*
        {
        "id": "69f629a4b705ee0b0e4b874e",
        "name": "NodeJS Blog",
        "description": "Backend news",
        "websiteUrl": "https://nodejs.org",
        "createdAt": "2026-05-02T16:43:16.921Z",
        "isMembership": true
        }
        */

        // создание поста для этого блога
        const createPostDto = {
            title: 'NestJS Testing',
            shortDescription: 'How to write e2e tests',
            content: 'Very long and useful content about supertest...',
            blogId: blog.id,
        };

        // console.log('ACCESS TOKEN: ', createAuthLoginResponse.body.accessToken);

        // с использованием basic-authorisation
        const createPostResponse = await request(app.getHttpServer())
            .post(`/posts`)
            .set('Authorization', authHeader)
            .send(createPostDto)
            .expect(201);
        const createdPost = createPostResponse.body;
        // `Bearer ${createAuthLoginResponse.body.accessToken}`

        // Лайкаем пост
        const createPostLike = await request(app.getHttpServer())
            .put(`/posts/${createdPost.id}/like-status`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse.body.accessToken}`,
            )
            .send({
                likeStatus: 'Like',
            })
            .expect(204);

        // проверяем состояние поста
        const result = await request(app.getHttpServer())
            .get(`/posts/${createdPost.id}`)
            .expect(200);

        // console.log(result.body);

        // т.к. обращались как анонимные то должен быть None
        expect(result.body.extendedLikesInfo.myStatus).toEqual('None');

        // проверяем состояние поста но уже с токеном
        const resultWithToken = await request(app.getHttpServer())
            .get(`/posts/${createdPost.id}`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse.body.accessToken}`,
            )
            .expect(200);

        console.log(resultWithToken.body);

        // т.к. обращались как залогиненый юзер то должен быть Like
        expect(resultWithToken.body.extendedLikesInfo.myStatus).toEqual('Like');
    });

    // GET -> "/posts": create 6 posts then: like post 1 by user 1, user 2;
    // like post 2 by user 2, user 3; dislike post 3 by user 1;
    // like post 4 by user 1, user 4, user 2, user 3;
    // like post 5 by user 2, dislike by user 3; like post 6 by user 1, dislike by user 2.
    // Get the posts by user 1 after all likes NewestLikes should be sorted
    // in descending; status 200; content: posts array with pagination;
    // used additional methods: POST -> /blogs, POST -> /posts,
    // PUT -> posts/:postId/like-status;
    it('GET /posts - should return 200, create 6 posts then change like-status with different users and the get all posts with the right order', async () => {
        // создание пользователя
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
            .set('Authorization', authHeader) // <--- УСТАНАВЛИВАЕМ ХЕДЕР ТУТ
            .send(user_1)
            .expect(201);

        // проверяем что юзер создался коректно
        expect(createUserResponse.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        // задержка иначе сработает троттлер, который надо бы отключить в beforeAll
        // ОТКЛЮЧИЛ
        // await new Promise((resolve) => setTimeout(resolve, 10000));

        // логиним созданного юзера
        const createAuthLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);
        // console.log('LOGIN STATUS:', createAuthLoginResponse.status);
        // console.log('LOGIN BODY:', createAuthLoginResponse.body);

        // {
        //     "accessToken" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMWM1YWM4ODdiNmFiNTlhYjg2ZDFmMiIsImlhdCI6MTc4MDI0MzE0NiwiZXhwIjoxNzgwMjQ2NzQ2fQ.jDyTdoIO-_KcGpM3pEQsDWvPLiME2TscR_7UK0H2-qk"
        // }

        // проверяем что нам вернулись рефреш токен и эксесс токен
        expect(createAuthLoginResponse.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse.body.accessToken).toEqual(
            expect.any(String),
        );

        // проверяем, что массив заголовков set-cookie вообще существует
        expect(createAuthLoginResponse.headers['set-cookie']).toBeDefined();

        // ищем нашу куку среди установленных кук
        const rawCookies = createAuthLoginResponse.headers['set-cookie'];

        // Превращаем в массив в любом случае (если это была строка, оборачиваем в массив)
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshTokenCookie = cookies.find((cookie) =>
            cookie.includes('refreshToken'),
        );

        // кука с именем refreshToken была найдена
        expect(refreshTokenCookie).toBeDefined();

        // проверка флагов безопасности
        expect(refreshTokenCookie).toContain('refreshToken=');
        expect(refreshTokenCookie).toContain('HttpOnly');

        // создание блога с использованием basic-authorisation
        const createBlogResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader)
            .send({
                name: 'NodeJS Blog',
                description: 'Backend news',
                websiteUrl: 'https://nodejs.org',
            })
            .expect(201);

        const blog = createBlogResponse.body;
        // структура возвращаемого блога
        /*
        {
        "id": "69f629a4b705ee0b0e4b874e",
        "name": "NodeJS Blog",
        "description": "Backend news",
        "websiteUrl": "https://nodejs.org",
        "createdAt": "2026-05-02T16:43:16.921Z",
        "isMembership": true
        }
        */

        // создание поста для этого блога
        const createPostDto = {
            title: 'NestJS Testing',
            shortDescription: 'How to write e2e tests',
            content: 'Very long and useful content about supertest...',
            blogId: blog.id,
        };

        // console.log('ACCESS TOKEN: ', createAuthLoginResponse.body.accessToken);

        // с использованием basic-authorisation
        const createPostResponse = await request(app.getHttpServer())
            .post(`/posts`)
            .set('Authorization', authHeader)
            .send(createPostDto)
            .expect(201);
        const createdPost = createPostResponse.body;
        // `Bearer ${createAuthLoginResponse.body.accessToken}`

        // Лайкаем пост
        const createPostLike = await request(app.getHttpServer())
            .put(`/posts/${createdPost.id}/like-status`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse.body.accessToken}`,
            )
            .send({
                likeStatus: 'Like',
            })
            .expect(204);

        // проверяем состояние поста
        const result = await request(app.getHttpServer())
            .get(`/posts/${createdPost.id}`)
            .expect(200);

        // console.log(result.body);

        // т.к. обращались как анонимные то должен быть None
        expect(result.body.extendedLikesInfo.myStatus).toEqual('None');

        // проверяем состояние поста но уже с токеном
        const resultWithToken = await request(app.getHttpServer())
            .get(`/posts/${createdPost.id}`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse.body.accessToken}`,
            )
            .expect(200);

        console.log(resultWithToken.body);

        // т.к. обращались как залогиненый юзер то должен быть Like
        expect(resultWithToken.body.extendedLikesInfo.myStatus).toEqual('Like');
    }, 15000);
});
