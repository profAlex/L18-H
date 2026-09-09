import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';
import request from 'supertest';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User, UserDocument } from '../src/modules/user-accounts/domain/user.entity';

describe('BlogsController (e2e)', () => {
    let app: INestApplication;

    // Выносим Basic-авторизацию в общие переменные модуля
    const adminLogin = 'admin';
    const adminPassword = 'qwerty';
    const authHeader =
        'Basic ' + Buffer.from(`${adminLogin}:${adminPassword}`).toString('base64');

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        appSetup(app);
        await app.init();

        // Синхронизируем индексы Mongoose для защиты от гонки в общем прогоне
        try {
            const userModel = moduleFixture.get<Model<UserDocument>>(
                getModelToken(User.name),
            );
            await userModel.collection.dropIndexes();
            await userModel.ensureIndexes();
        } catch (e) {
            // Игнорируем, если коллекция еще не была создана
        }
    });

    afterAll(async () => {
        if (app) {
            await request(app.getHttpServer()).delete('/testing/all-data');
            await app.close();
        }
    });

    beforeEach(async () => {
        await request(app.getHttpServer()).delete('/testing/all-data');
    });

    it('should return 200 and paginated blogs storage', async () => {
        const createDto = {
            name: 'Test Blog',
            description: 'Test Description',
            websiteUrl: 'https://test.com',
        };

        await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader) // <--- Basic Auth
            .send(createDto)
            .expect(201);

        const response = await request(app.getHttpServer())
            .get('/blogs')
            .expect(200);

        expect(response.body).toEqual({
            pagesCount: 1,
            page: 1,
            pageSize: 10,
            totalCount: 1,
            items: [
                {
                    id: expect.any(String),
                    name: createDto.name,
                    description: createDto.description,
                    websiteUrl: createDto.websiteUrl,
                    createdAt: expect.any(String),
                    isMembership: false,
                },
            ],
        });
    });

    it('sent empty query, should return 200 and paginated blogs storage with default query settings', async () => {
        const createDto_1 = {
            name: 'Test Blog 1',
            description: 'Test Description 1',
            websiteUrl: 'https://test1.com',
        };

        await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader) // <--- Basic Auth
            .send(createDto_1)
            .expect(201);

        const createDto_2 = {
            name: 'Test Blog 2',
            description: 'Test Description 2',
            websiteUrl: 'https://test2.com',
        };

        await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader) // <--- Basic Auth
            .send(createDto_2)
            .expect(201);

        const response = await request(app.getHttpServer())
            .get('/blogs')
            .expect(200);

        expect(response.body).toEqual({
            pagesCount: 1,
            page: 1,
            pageSize: 10,
            totalCount: 2,
            items: [
                {
                    id: expect.any(String),
                    name: createDto_2.name,
                    description: createDto_2.description,
                    websiteUrl: createDto_2.websiteUrl,
                    createdAt: expect.any(String),
                    isMembership: false,
                },
                {
                    id: expect.any(String),
                    name: createDto_1.name,
                    description: createDto_1.description,
                    websiteUrl: createDto_1.websiteUrl,
                    createdAt: expect.any(String),
                    isMembership: false,
                },
            ],
        });
    });

    it('should return empty pagination if no blogs exist', async () => {
        const response = await request(app.getHttpServer())
            .get('/blogs')
            .expect(200);

        expect(response.body).toEqual({
            pagesCount: 0,
            page: 1,
            pageSize: 10,
            totalCount: 0,
            items: [],
        });
    });

    it('GET /blogs/:blogId/posts - should return 200 and paginated posts for specific blog', async () => {
        const createBlogResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader) // <--- Basic Auth
            .send({
                name: 'NodeJS Blog',
                description: 'Backend news',
                websiteUrl: 'https://nodejs.org',
            })
            .expect(201);

        const blog = createBlogResponse.body;

        const createPostDto = {
            title: 'NestJS Testing',
            shortDescription: 'How to write e2e tests',
            content: 'Very long and useful content about supertest...',
        };

        const createPostResponse = await request(app.getHttpServer())
            .post(`/blogs/${blog.id}/posts`)
            .set('Authorization', authHeader) // <--- Basic Auth
            .send(createPostDto)
            .expect(201);

        const createdPost = createPostResponse.body;

        const response = await request(app.getHttpServer())
            .get(`/blogs/${blog.id}/posts`)
            .expect(200);

        expect(response.body).toEqual({
            pagesCount: 1,
            page: 1,
            pageSize: 10,
            totalCount: 1,
            items: [
                {
                    id: createdPost.id,
                    title: createPostDto.title,
                    shortDescription: createPostDto.shortDescription,
                    content: createPostDto.content,
                    blogId: blog.id,
                    blogName: blog.name,
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
    });

    it('should return 404 if blog does not exist', async () => {
        const fakeBlogId = '6633973977c688d054942944';

        await request(app.getHttpServer())
            .get(`/blogs/${fakeBlogId}/posts`)
            .expect(404);
    });

    it('POST /blogs/:blogId/posts -> should create post for blog and return 201', async () => {
        const createBlogDto = {
            name: 'Blog for Post',
            description: 'Description',
            websiteUrl: 'https://test.com',
        };

        const blogResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader) // <--- Basic Auth
            .send(createBlogDto)
            .expect(201);

        const blog = blogResponse.body;

        const createPostDto = {
            title: 'New Post Title',
            shortDescription: 'Short desc for post',
            content: 'Content of the post',
        };

        const response = await request(app.getHttpServer())
            .post(`/blogs/${blog.id}/posts`)
            .set('Authorization', authHeader) // <--- Basic Auth
            .send(createPostDto)
            .expect(201);

        expect(response.body).toEqual({
            id: expect.any(String),
            title: createPostDto.title,
            shortDescription: createPostDto.shortDescription,
            content: createPostDto.content,
            blogId: blog.id,
            blogName: blog.name,
            createdAt: expect.any(String),
            extendedLikesInfo: {
                likesCount: 0,
                dislikesCount: 0,
                myStatus: 'None',
                newestLikes: [],
            },
        });

        await request(app.getHttpServer())
            .get(`/blogs/${blog.id}/posts`)
            .expect(200)
            .then((res) => {
                expect(res.body.items[0].id).toBe(response.body.id);
            });
    });

    it('POST /blogs/:blogId/posts -> should return 404 if blog does not exist', async () => {
        const fakeBlogId = '6633973977c688d054942944';

        const createPostDto = {
            title: 'Title',
            shortDescription: 'Desc',
            content: 'Content',
        };

        await request(app.getHttpServer())
            .post(`/blogs/${fakeBlogId}/posts`)
            .set('Authorization', authHeader) // <--- Basic Auth
            .send(createPostDto)
            .expect(404);
    });

    it('GET /blogs/:id -> should return 200 and blog object', async () => {
        const createBlogDto = {
            name: 'Target Blog',
            description: 'Get me by ID',
            websiteUrl: 'https://find-me.com',
        };

        const createResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader) // <--- Basic Auth
            .send(createBlogDto)
            .expect(201);

        const createdBlog = createResponse.body;

        const response = await request(app.getHttpServer())
            .get(`/blogs/${createdBlog.id}`)
            .expect(200);

        expect(response.body).toEqual({
            id: createdBlog.id,
            name: createBlogDto.name,
            description: createBlogDto.description,
            websiteUrl: createBlogDto.websiteUrl,
            createdAt: expect.any(String),
            isMembership: expect.any(Boolean),
        });
    });

    it('GET /blogs/:id -> should return 404 if blog does not exist', async () => {
        const nonExistentId = '6633973977c688d054942944';

        await request(app.getHttpServer())
            .get(`/blogs/${nonExistentId}`)
            .expect(404);
    });

    it('PUT /blogs/:id -> should update blog and return 204', async () => {
        const createResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader) // <--- Basic Auth
            .send({
                name: 'Old Name',
                description: 'Old Description',
                websiteUrl: 'https://old.com',
            })
            .expect(201);

        const blogId = createResponse.body.id;

        const updateDto = {
            name: 'New Name',
            description: 'New Description',
            websiteUrl: 'https://new.com',
        };

        await request(app.getHttpServer())
            .put(`/blogs/${blogId}`)
            .set('Authorization', authHeader) // <--- Basic Auth
            .send(updateDto)
            .expect(204);

        const getResponse = await request(app.getHttpServer())
            .get(`/blogs/${blogId}`)
            .expect(200);

        expect(getResponse.body.name).toBe(updateDto.name);
        expect(getResponse.body.description).toBe(updateDto.description);
        expect(getResponse.body.websiteUrl).toBe(updateDto.websiteUrl);
    });

    it('PUT /blogs/:id -> should return 404 if blog not found', async () => {
        await request(app.getHttpServer())
            .put('/blogs/6633973977c688d054942944')
            .set('Authorization', authHeader) // <--- Basic Auth
            .send({
                name: 'Name',
                description: 'Desc',
                websiteUrl: 'https://ok.com',
            })
            .expect(404);
    });

    it('DELETE /blogs/:id -> should delete blog and return 204', async () => {
        const createResponse = await request(app.getHttpServer())
            .post('/blogs')
            .set('Authorization', authHeader) // <--- Basic Auth
            .send({
                name: 'Delete Me',
                description: 'To be deleted',
                websiteUrl: 'https://delete.com',
            })
            .expect(201);

        const blogId = createResponse.body.id;

        await request(app.getHttpServer())
            .delete(`/blogs/${blogId}`)
            .set('Authorization', authHeader) // <--- Basic Auth
            .expect(204);

        await request(app.getHttpServer()).get(`/blogs/${blogId}`).expect(404);
    });

    it('DELETE /blogs/:id -> should return 404 if blog does not exist', async () => {
        await request(app.getHttpServer())
            .delete('/blogs/6633973977c688d054942944')
            .set('Authorization', authHeader) // <--- Basic Auth
            .expect(404);
    });

    it('GET /blogs/:blogId/posts - with user likes and statuses', async () => {
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

        const createUserResponse1 = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_1)
            .expect(201);

        await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_2)
            .expect(201);

        await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader)
            .send(user_3)
            .expect(201);

        expect(createUserResponse1.body).toEqual({
            id: expect.any(String),
            login: user_1.login,
            email: user_1.email,
            createdAt: expect.any(String),
        });

        const createAuthLoginResponse1 = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_1.login, password: user_1.password })
            .expect(200);

        const createAuthLoginResponse2 = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_2.login, password: user_2.password })
            .expect(200);

        const createAuthLoginResponse3 = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginOrEmail: user_3.login, password: user_3.password })
            .expect(200);

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

        const createPostDto = {
            title: 'NestJS Testing',
            shortDescription: 'How to write e2e tests',
            content: 'Very long and useful content about supertest...',
            blogId: blog.id,
        };

        const createPostResponse = await request(app.getHttpServer())
            .post(`/blogs/${blog.id}/posts`)
            .set('Authorization', authHeader)
            .send(createPostDto)
            .expect(201);
        const createdPost = createPostResponse.body;

        await request(app.getHttpServer())
            .put(`/posts/${createdPost.id}/like-status`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse1.body.accessToken}`,
            )
            .send({ likeStatus: 'Like' })
            .expect(204);

        await request(app.getHttpServer())
            .put(`/posts/${createdPost.id}/like-status`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse2.body.accessToken}`,
            )
            .send({ likeStatus: 'Like' })
            .expect(204);

        await request(app.getHttpServer())
            .put(`/posts/${createdPost.id}/like-status`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse3.body.accessToken}`,
            )
            .send({ likeStatus: 'Dislike' })
            .expect(204);

        const result = await request(app.getHttpServer())
            .get(`/blogs/${blog.id}/posts`)
            .expect(200);

        expect(result.body.items[0].extendedLikesInfo.myStatus).toEqual('None');

        const resultWithToken = await request(app.getHttpServer())
            .get(`/blogs/${blog.id}/posts`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse2.body.accessToken}`,
            )
            .expect(200);

        expect(
            resultWithToken.body.items[0].extendedLikesInfo.myStatus,
        ).toEqual('Like');

        const resultWithToken2 = await request(app.getHttpServer())
            .get(`/blogs/${blog.id}/posts`)
            .set(
                'Authorization',
                `Bearer ${createAuthLoginResponse3.body.accessToken}`,
            )
            .expect(200);

        expect(
            resultWithToken2.body.items[0].extendedLikesInfo.myStatus,
        ).toEqual('Dislike');
    });
});