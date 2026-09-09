import {PostsQueryRepository} from "./posts.query-repository";
import {getModelToken} from "@nestjs/mongoose";
import {Post} from "../../domain/post.entity";
import {Test, TestingModule} from "@nestjs/testing";
import {GetPostsQueryParams} from "../../api/input-dto/get-posts-query-params.input-dto";
import {SortDirection} from "../../../../../core/dto/base.query-params.input-dto";
import {PostsSortBy} from "../../api/input-dto/posts-sort-by";
import {PostViewDto} from "../../api/view-dto/posts.view-dto";

describe('PostsQueryRepository', () => {
    let queryRepository: PostsQueryRepository;

    const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    };

    const mockPostModel = {
        countDocuments: jest.fn(),
        find: jest.fn().mockReturnValue(mockQuery),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PostsQueryRepository,
                {
                    provide: getModelToken(Post.name),
                    useValue: mockPostModel,
                }
            ]
        }).compile();

        queryRepository = module.get<PostsQueryRepository>(PostsQueryRepository);

        jest.clearAllMocks();
    });

    it('ifPostExists should return true if count > 0', async () => {
        const someId = 'some-id';
        mockPostModel.countDocuments.mockResolvedValue(1);

        const result = await queryRepository.ifPostExists(someId);

        expect(result).toBe(true);
    });

    it('ifPostExists should return false if count = 0', async () => {
        const someId = 'some-id';
        mockPostModel.countDocuments.mockResolvedValue(0);

        const result = await queryRepository.ifPostExists(someId);

        expect(result).toBe(false);
    });

    it('getPostsByBlogId should return correctly mapped and paginated posts', async () => {
        // 1. Arrange (Подготовка данных)
        const testBlogId = 'blog123';
        const testUserId = 'user456';

        // Создаем параметры запроса (допустим, 1 страница, размер 5)
        const testQueryParams = new GetPostsQueryParams();
        testQueryParams.pageSize = 5;
        testQueryParams.pageNumber = 1;
        testQueryParams.sortDirection = SortDirection.Asc;
        testQueryParams.sortBy = PostsSortBy.BlogId;

        // Данные, которые "как будто" вернула база (минимальный набор для маппера)
        const fakePostsFromDb = [
            { _id: 'post1', title: 'First Post' },
            { _id: 'post2', title: 'Second Post' }
        ];
        const totalCountInDb = 2;

        // Результат, который "как будто" вернул маппер одного поста
        const fakeMappedPost = { id: 'p1', title: 'Mapped Title' } as PostViewDto;

        // Настраиваем цепочку моков Mongoose
        mockQuery.lean.mockResolvedValue(fakePostsFromDb);
        mockPostModel.countDocuments.mockResolvedValue(totalCountInDb);

        // Мокаем PostViewDto.mapToView, чтобы не зависеть от его сложной внутренней логики
        const spyPostMapper = jest.spyOn(PostViewDto, 'mapToView')
            .mockReturnValue(fakeMappedPost);

        // 2. Act (Выполнение действия)
        const result = await queryRepository.getPostsByBlogId({
            userId: testUserId,
            blogId: testBlogId,
            query: testQueryParams
        });

        // 3. Assert (Проверка результатов)

        // Проверяем вызов find с правильными фильтрами (soft delete и blogId)
        expect(mockPostModel.find).toHaveBeenCalledWith({
            deletedAt: null,
            blogId: testBlogId
        });

        // Проверяем работу цепочки (sort, skip, limit)
        expect(mockQuery.sort).toHaveBeenCalledWith({ [testQueryParams.sortBy]: 1 }); // Asc превратился в 1
        expect(mockQuery.skip).toHaveBeenCalledWith(0); // (1-1)*5 = 0
        expect(mockQuery.limit).toHaveBeenCalledWith(5);

        // Проверяем, что маппер был вызван для каждого поста из базы
        expect(spyPostMapper).toHaveBeenCalledTimes(fakePostsFromDb.length);
        expect(spyPostMapper).toHaveBeenCalledWith(fakePostsFromDb[0]);

        // Проверяем итоговую структуру PaginatedViewDto
        expect(result).toEqual({
            totalCount: totalCountInDb,
            pagesCount: 1, // Math.ceil(2 / 5)
            page: 1,
            pageSize: 5,
            items: [fakeMappedPost, fakeMappedPost] // Массив из двух замоканных результатов
        });

        // Очищаем шпион после теста
        spyPostMapper.mockRestore();
    });
});