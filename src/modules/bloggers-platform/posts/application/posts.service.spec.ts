import { PostsService } from './posts.service';
import { Test, TestingModule } from '@nestjs/testing';
import { BlogsService } from '../../blogs/application/blogs.service';
import { PostsQueryRepository } from '../infrastructure/query/posts.query-repository';
import { BlogsQueryRepository } from '../../blogs/infrastructure/query/blogs.query-repository';
import { PostsCommandRepository } from '../infrastructure/posts.command-repository';
import { getModelToken } from '@nestjs/mongoose';
import { Post } from '../domain/post.entity';
import { GetPostsQueryParams } from '../api/input-dto/get-posts-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { NotFoundException } from '@nestjs/common';
import { PostViewDto } from '../api/view-dto/posts.view-dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';

describe('PostsService', () => {
    let service: PostsService;

    const mockPostsQueryRepository = {
        getPostsByBlogId: jest.fn(),
    };
    const mockBlogsQueryRepository = {
        ifBlogExists: jest.fn(),
        getBlogName: jest.fn(),
    };
    const mockPostsCommandRepository = {
        save: jest.fn(),
        findSinglePostById: jest.fn(),
    };
    const mockPostModel = {
        createInstance: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PostsService,
                {
                    provide: PostsQueryRepository,
                    useValue: mockPostsQueryRepository,
                },
                {
                    provide: BlogsQueryRepository,
                    useValue: mockBlogsQueryRepository,
                },
                {
                    provide: PostsCommandRepository,
                    useValue: mockPostsCommandRepository,
                },
                {
                    provide: getModelToken(Post.name),
                    useValue: mockPostModel,
                },
            ],
        }).compile();
        service = module.get<PostsService>(PostsService);

        jest.clearAllMocks();
    });

    it('getPostsByBlogId should successfully return fake PaginatedViewDto', async () => {
        mockBlogsQueryRepository.ifBlogExists.mockResolvedValue(true);
        const fakeQuery: GetPostsQueryParams = new GetPostsQueryParams();
        const fakeDto = {
            userId: 'someUserId',
            blogId: 'someBlogId',
            query: fakeQuery,
        };
        const fakePaginatedViewDto = {
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: 10,
            pagesCount: 0,
        };
        mockPostsQueryRepository.getPostsByBlogId.mockResolvedValue(
            fakePaginatedViewDto,
        );

        const result = await service.getPostsByBlogId(fakeDto);

        expect(mockBlogsQueryRepository.ifBlogExists).toHaveBeenCalledWith(
            fakeDto.blogId,
        );
        expect(mockPostsQueryRepository.getPostsByBlogId).toHaveBeenCalledWith(
            fakeDto,
        );
        expect(result).toEqual(fakePaginatedViewDto);
    });

    it('getPostsByBlogId should fail to find blog by blogId', async () => {
        mockBlogsQueryRepository.ifBlogExists.mockResolvedValue(false);
        const fakeBlogId = 'someBlogId';

        await expect(
            service.getPostsByBlogId({
                blogId: fakeBlogId,
                query: new GetPostsQueryParams(),
            }),
        ).rejects.toThrow(DomainException);

        expect(
            mockPostsQueryRepository.getPostsByBlogId,
        ).not.toHaveBeenCalled();
    });

    it('createPostByBlogId: should create and return post', async () => {
        const body = { title: 't', shortDescription: 's', content: 'c' };
        const fakeBlog = { name: 'Blog Name' };
        const fakePost = { id: 'some-id' }; // Здесь может быть любой объект
        const expectedView = { id: '123', title: 't' };

        // Шпионим за маппером и подменяем его ответ
        const spy = jest
            .spyOn(PostViewDto, 'mapToView')
            .mockReturnValue(expectedView as any);

        mockBlogsQueryRepository.getBlogName.mockResolvedValue(fakeBlog);
        mockPostModel.createInstance.mockReturnValue(fakePost);

        const result = await service.createPostByBlogId({
            blogId: 'b1',
            body: body as any,
        });

        expect(result).toEqual(expectedView);
        expect(mockPostsCommandRepository.save).toHaveBeenCalledWith(fakePost);

        spy.mockRestore(); // Обязательно восстанавливаем, чтобы не сломать другие тесты
    });

    it('createPostByBlogId: should throw 404 if blog missing', async () => {
        mockBlogsQueryRepository.getBlogName.mockResolvedValue(null);
        await expect(
            service.createPostByBlogId({ blogId: '404', body: {} as any }),
        ).rejects.toThrow(DomainException);
    });

    // it('createPost: should create post with blogId from body', async () => {
    //     const body = {
    //         title: 't',
    //         blogId: 'b1',
    //         shortDescription: 's',
    //         content: 'c',
    //     };
    //     const fakePost = { id: 'anyId' };
    //     const expectedView = {} as PostViewDto;
    //
    //     const spy = jest
    //         .spyOn(PostViewDto, 'mapToView')
    //         .mockReturnValue(expectedView as any);
    //
    //     mockBlogsQueryRepository.getBlogName.mockResolvedValue({
    //         name: 'Blog Name',
    //     });
    //     mockPostModel.createInstance.mockReturnValue(fakePost);
    //
    //     const result = await service.createPost(body as any);
    //
    //     expect(mockBlogsQueryRepository.getBlogName).toHaveBeenCalledWith('b1');
    //     expect(mockPostsCommandRepository.save).toHaveBeenCalledWith(fakePost);
    //     expect(result).toBe(expectedView);
    //
    //     spy.mockRestore(); // Обязательно восстанавливаем, чтобы не сломать другие тесты
    // });
    //
    // it('updatePostById: should call domain update and save', async () => {
    //     const fakePost = { updatePost: jest.fn() };
    //     mockPostsCommandRepository.findSinglePostById.mockResolvedValue(
    //         fakePost,
    //     );
    //
    //     await service.updatePostById({
    //         postId: 'p1',
    //         updateInputData: { title: 'new' } as any,
    //     });
    //
    //     expect(fakePost.updatePost).toHaveBeenCalledWith({ title: 'new' });
    //     expect(mockPostsCommandRepository.save).toHaveBeenCalledWith(fakePost);
    // });
    //
    // it('updatePostById: should throw 404 if post missing', async () => {
    //     mockPostsCommandRepository.findSinglePostById.mockResolvedValue(null);
    //     await expect(
    //         service.updatePostById({
    //             postId: 'p1',
    //             updateInputData: {} as any,
    //         }),
    //     ).rejects.toThrow(DomainException);
    // });
    //
    // it('deletePostById: should call makeDeleted and save', async () => {
    //     const fakePost = { makeDeleted: jest.fn() };
    //     mockPostsCommandRepository.findSinglePostById.mockResolvedValue(
    //         fakePost,
    //     );
    //
    //     await service.deletePostById('p1');
    //
    //     expect(fakePost.makeDeleted).toHaveBeenCalled();
    //     expect(mockPostsCommandRepository.save).toHaveBeenCalledWith(fakePost);
    // });
    //
    // it('deletePostById: should throw 404 if post missing', async () => {
    //     mockPostsCommandRepository.findSinglePostById.mockResolvedValue(null);
    //     await expect(service.deletePostById('p1')).rejects.toThrow(
    //         DomainException,
    //     );
    // });
});
