import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';
import request from 'supertest';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Comment } from '../src/modules/bloggers-platform/comments/domain/comment.entity';
import {
    User,
    UserDocument,
} from '../src/modules/user-accounts/domain/user.entity';

describe('CommentsController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        appSetup(app); // не забываем подключить глобальные префиксы, пайпы
        await app.init();

        // ======= ВОТ ЭТОТ БЛОК РЕШАЕТ ПРОБЛЕМУ С ИНДЕКСАМИ =======
        // Получаем модель пользователя напрямую из Nest DI контейнера
        const userModel = moduleFixture.get<Model<UserDocument>>(
            getModelToken(User.name),
        );

        // Дропаем все старые индексы в этой коллекции (кроме дефолтного _id)
        await userModel.collection.dropIndexes();

        // Заставляем Mongoose синхронизировать и создать новые индексы из твоего обновленного кода
        await userModel.ensureIndexes();
        // ========================================================
    });

    afterAll(async () => {
        await request(app.getHttpServer()).delete('/testing/all-data');
        await app.close();
    });

    // Очищаем базу перед каждым тестом через специальный контроллер
    beforeEach(async () => {
        await request(app.getHttpServer()).delete('/testing/all-data');
    });

    it('PUT /commentId/like-status - should return 204, putting like create 6 posts then change like-status with different users and the get all posts with the right order', async () => {
        // создание пользователя
        const user_1 = {
            login: 'qwerty1',
            password: 'lg-885081',
            email: 'example@example1.dev',
        };
        const user_2 = {
            login: 'qwerty2',
            password: 'lg-885082',
            email: 'example@example2.dev',
        };
        const user_3 = {
            login: 'qwerty3',
            password: 'lg-885083',
            email: 'example@example3.dev',
        };
        const login = 'admin';
        const password = 'qwerty';
        const authHeader =
            'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

        const createUserResponse1 = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_1)
            .expect(201);

        const createUserResponse2 = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_2)
            .expect(201);

        const createUserResponse3 = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_3)
            .expect(201);

        // проверяем что юзер создался коректно
        expect(createUserResponse1.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        // логиним созданного юзера
        const createAuthLoginResponse1 = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        // {
        //     "accessToken" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMWM1YWM4ODdiNmFiNTlhYjg2ZDFmMiIsImlhdCI6MTc4MDI0MzE0NiwiZXhwIjoxNzgwMjQ2NzQ2fQ.jDyTdoIO-_KcGpM3pEQsDWvPLiME2TscR_7UK0H2-qk"
        // }

        // проверяем что нам вернулись рефреш токен и эксесс токен
        expect(createAuthLoginResponse1.body.accessToken).toBeDefined();
        expect(createAuthLoginResponse1.body.accessToken).toEqual(
            expect.any(String),
        );

        // проверяем, что массив заголовков set-cookie вообще существует
        expect(createAuthLoginResponse1.headers['set-cookie']).toBeDefined();

        // ищем нашу куку среди установленных кук
        const rawCookies = createAuthLoginResponse1.headers['set-cookie'];

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

        // логиним еще двух пользователей
        const createAuthLoginResponse2 = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_2.login, password: user_2.password })
            .expect(200);

        const createAuthLoginResponse3 = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_3.login, password: user_3.password })
            .expect(200);

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
            .post(`/blogs/${blog.id}/posts`)
            .set('Authorization', authHeader)
            .send(createPostDto)
            .expect(201);
        const createdPost = createPostResponse.body;
        // `Bearer ${createAuthLoginResponse.body.accessToken}`

        // создаем коммент с использованием bearer-authorisation первого пользователя
        console.log("ACCESS TOKEN: ", createAuthLoginResponse1.body.accessToken)
        const createCommentResponse = await request(app.getHttpServer())
            .post(`/posts/${createdPost.id}/comments`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse1.body.accessToken}`,
            )
            .send({
                content: `Comment created by ${user_1.login}...`,
            })
            .expect(201);

        const createdComment = createCommentResponse.body;

        // лайкаем коммент первым пользователем
        const createCommentLike1 = await request(app.getHttpServer())
            .put(`/comments/${createdComment.id}/like-status`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse1.body.accessToken}`,
            )
            .send({
                likeStatus: 'Like',
            })
            .expect(204);

        // лайкаем коммент вторым пользователем
        const createCommentLike2 = await request(app.getHttpServer())
            .put(`/comments/${createdComment.id}/like-status`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse2.body.accessToken}`,
            )
            .send({
                likeStatus: 'Like',
            })
            .expect(204);

        // лайкаем коммент третьим пользователем
        const createCommentLike3 = await request(app.getHttpServer())
            .put(`/comments/${createdComment.id}/like-status`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse3.body.accessToken}`,
            )
            .send({
                likeStatus: 'Dislike',
            })
            .expect(204);

        // проверяем состояние поста
        const result = await request(app.getHttpServer())
            .get(`/posts/${createdPost.id}/comments`)
            .expect(200);

        // console.log(result.body);

        // т.к. обращались как анонимные то должен быть None
        expect(result.body.items[0].likesInfo.myStatus).toEqual('None');

        // проверяем состояние поста но уже с токеном от имени второго пользователя
        const resultWithToken = await request(app.getHttpServer())
            .get(`/posts/${createdPost.id}/comments`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse2.body.accessToken}`,
            )
            .expect(200);

        console.log(resultWithToken.body);
        console.log(resultWithToken.body.items[0].likesInfo);

        // т.к. обращались как залогиненый юзер то должен быть Like
        expect(resultWithToken.body.items[0].likesInfo.myStatus).toEqual(
            'Like',
        );

        // проверяем состояние поста но уже с токеном от имени третьего пользователя
        const resultWithToken2 = await request(app.getHttpServer())
            .get(`/posts/${createdPost.id}/comments`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse3.body.accessToken}`,
            )
            .expect(200);

        // т.к. обращались как залогиненый юзер то должен быть Like
        expect(resultWithToken2.body.items[0].likesInfo.myStatus).toEqual(
            'Dislike',
        );
    });
});
