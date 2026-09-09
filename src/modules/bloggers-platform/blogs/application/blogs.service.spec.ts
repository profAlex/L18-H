import { Test, TestingModule } from '@nestjs/testing';
import { BlogsService } from './blogs.service';
import { BlogsCommandRepository } from '../infrastructure/blogs.command-repository';
import { getModelToken } from '@nestjs/mongoose';
import { Blog } from '../domain/blog.entity';
import { NotFoundException } from '@nestjs/common';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';

describe('BlogsService', () => {
    let service: BlogsService;

    const mockBlogsCommandRepository = {
        getBlogDocumentById: jest.fn(),
        save: jest.fn(),
    };

    // cоздаю мок для модели, даже если она не используется напрямую в тесте
    // это нужно просто чтобы Nest смог "собрать" конструктор сервиса
    const mockBlogModel = {
        createInstance: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BlogsService,
                {
                    provide: BlogsCommandRepository,
                    useValue: mockBlogsCommandRepository,
                },
                {
                    // Это "ключ", под которым Nest ищет модель
                    provide: getModelToken(Blog.name),
                    // Это "значение", которое он подставит
                    useValue: mockBlogModel,
                },
            ],
        }).compile();

        service = module.get<BlogsService>(BlogsService);

        jest.clearAllMocks();
    });

    it('deleteBlogById should find blog and call makeDeleted', async () => {
        // 1. Arrange
        const fakeBlog = { makeDeleted: jest.fn() }; // Фейковый документ блога
        mockBlogsCommandRepository.getBlogDocumentById.mockResolvedValue(
            fakeBlog,
        ); // Говорим репозиторию вернуть фейк

        // 2. Act
        await service.deleteBlogById('some-id');

        // 3. Assert
        expect(
            mockBlogsCommandRepository.getBlogDocumentById,
        ).toHaveBeenCalledWith('some-id');
        expect(fakeBlog.makeDeleted).toHaveBeenCalled();
        expect(mockBlogsCommandRepository.save).toHaveBeenCalledWith(fakeBlog);
    });

    it('updateBlogById should update blog and call updateBlog', async () => {
        // arrange
        const someDto = {
            name: 'some-name',
            description: 'some description',
            websiteUrl: 'http://some-url.com',
        };
        const blogId = 'some-id';

        const fakeBlog = { updateBlog: jest.fn() };
        mockBlogsCommandRepository.getBlogDocumentById.mockResolvedValue(
            fakeBlog,
        ); // говорим репозиторию зарезолвить фейковый блог

        // act
        await service.updateBlogById({ blogId, ...someDto });

        // assert
        expect(
            mockBlogsCommandRepository.getBlogDocumentById,
        ).toHaveBeenCalledWith('some-id');
        expect(fakeBlog.updateBlog).toHaveBeenCalledWith(someDto);
        expect(mockBlogsCommandRepository.save).toHaveBeenCalledWith(fakeBlog);
    });

    it('updateBlogById should throw NotFoundException if blog exists', async () => {
        mockBlogsCommandRepository.getBlogDocumentById.mockResolvedValue(null);
        const someDto = {
            name: 'some-name',
            description: 'some description',
            websiteUrl: 'http://some-url.com',
        };
        const blogId = 'some-id';

        await expect(
            service.updateBlogById({ blogId, ...someDto }),
        ).rejects.toThrow(DomainException);

        expect(
            mockBlogsCommandRepository.getBlogDocumentById,
        ).toHaveBeenCalledWith('some-id');
        expect(mockBlogsCommandRepository.save).not.toHaveBeenCalled();
    });

    it('createNewBlog should create a new blog', async () => {
        // arrange
        const someDto = {
            name: 'some-name',
            description: 'some description',
            websiteUrl: 'http://some-url.com',
        };

        const fakeBlogEntity = { id: 'some-id' };
        mockBlogModel.createInstance.mockReturnValue(fakeBlogEntity);

        // act
        const result = await service.createNewBlog(someDto);

        // assert
        expect(mockBlogModel.createInstance).toHaveBeenCalledWith(someDto);
        expect(mockBlogsCommandRepository.save).toHaveBeenCalledWith(
            fakeBlogEntity,
        );
        expect(result).toEqual('some-id');
    });
});
