import { BlogsQueryRepository } from './blogs.query-repository';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Blog } from '../../domain/blog.entity';
import { BlogViewDto } from '../../api/view-dto/blogs.view-dto';
import { NotFoundException } from '@nestjs/common';
import { GetBlogsQueryParams } from '../../api/input-dto/get-blogs-query-params.input-dto';
import { SortDirection } from '../../../../../core/dto/base.query-params.input-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';

describe('BlogsQueryRepository', () => {
    let repository: BlogsQueryRepository;

    // 1. Создаем объект-цепочку для имитации методов Mongoose (Query Builder)
    const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    };

    // 2. Создаем мок самой модели
    const mockBlogModel = {
        find: jest.fn().mockReturnValue(mockQuery),
        findOne: jest.fn().mockReturnValue(mockQuery),
        countDocuments: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BlogsQueryRepository,
                {
                    // Используем getModelToken, чтобы Nest понял, куда внедрять мок
                    provide: getModelToken(Blog.name),
                    useValue: mockBlogModel,
                },
            ],
        }).compile();

        repository = module.get<BlogsQueryRepository>(BlogsQueryRepository);

        // Сбрасываем историю вызовов перед каждым тестом
        jest.clearAllMocks();
    });

    describe('getBlogByIdOrNotFoundFail', () => {
        it('should return mapped blog if found', async () => {
            const fakeBlog = {
                _id: 'id123',
                name: 'Blog Name',
                websiteUrl: 'http://url.com',
                createdAt: new Date(Date.now() / 1000),
            };

            // Настраиваем цепочку: findOne -> lean (resolved value)
            mockQuery.lean.mockResolvedValue(fakeBlog);

            // Шпионим за маппером, чтобы проверить факт его вызова
            const spyMapper = jest.spyOn(BlogViewDto, 'mapToView');

            const result = await repository.getBlogByIdOrNotFoundFail('id123');

            expect(mockBlogModel.findOne).toHaveBeenCalled();
            expect(spyMapper).toHaveBeenCalledWith(fakeBlog);
            expect(result.name).toBe('Blog Name');

            spyMapper.mockRestore(); // Восстанавливаем оригинальный маппер
        });

        it('should throw NotFoundException if blog is missing', async () => {
            mockQuery.lean.mockResolvedValue(null);

            await expect(
                repository.getBlogByIdOrNotFoundFail('invalid-id'),
            ).rejects.toThrow(DomainException);
        });
    });

    describe('getAllBlogs', () => {
        it('should apply filters and return paginated object', async () => {
            // Arrange
            const query = new GetBlogsQueryParams();
            query.searchNameTerm = 'tech';
            query.pageNumber = 1;
            query.pageSize = 5;
            query.sortDirection = SortDirection.Asc;

            const fakeBlogs = [
                { _id: '1', name: 'tech blog', createdAt: new Date() },
            ];
            mockQuery.limit.mockResolvedValue(fakeBlogs);
            mockBlogModel.countDocuments.mockResolvedValue(1);

            // Act
            const result = await repository.getAllBlogs(query);

            // Assert
            // Проверяем, что фильтр сформирован верно (включая твой if с regex)
            expect(mockBlogModel.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    $or: [{ name: { $regex: 'tech', $options: 'i' } }],
                }),
            );

            // Проверяем вызовы цепочки
            expect(mockQuery.sort).toHaveBeenCalledWith({ [query.sortBy]: 1 });
            expect(mockQuery.limit).toHaveBeenCalledWith(query.pageSize);

            // Проверяем итоговую структуру
            expect(result.items).toHaveLength(1);
            expect(result.totalCount).toBe(1);
            expect(result.page).toBe(1);
        });

        it('should not add $or to filter if searchNameTerm is missing', async () => {
            const query = new GetBlogsQueryParams();
            query.searchNameTerm = null;

            mockQuery.limit.mockResolvedValue([]);
            mockBlogModel.countDocuments.mockResolvedValue(0);

            await repository.getAllBlogs(query);

            // Проверяем, что в фильтре нет $or (твой блок if в коде сработал правильно)
            const lastFindCall = mockBlogModel.find.mock.calls[0][0];
            expect(lastFindCall).not.toHaveProperty('$or');
            expect(lastFindCall).toEqual({ deletedAt: null });
        });
    });

    describe('ifBlogExists', () => {
        it('should return true if count > 0', async () => {
            mockBlogModel.countDocuments.mockResolvedValue(1);

            const exists = await repository.ifBlogExists('id');

            expect(exists).toBe(true);
            expect(mockBlogModel.countDocuments).toHaveBeenCalledWith({
                _id: 'id',
                deletedAt: null,
            });
        });

        it('should return false if count is 0', async () => {
            mockBlogModel.countDocuments.mockResolvedValue(0);
            const exists = await repository.ifBlogExists('id');
            expect(exists).toBe(false);
        });
    });
});
