import { CommentsService } from './comments.service';
import { PostsQueryRepository } from '../../posts/infrastructure/query/posts.query-repository';
import { CommentsQueryRepository } from '../infrastructure/query/comments.query-repository';
import { Test, TestingModule } from '@nestjs/testing';
import { GetCommentsQueryParams } from '../api/input-dto/get-comments-query-params.input-dto';
import { CommentsSortBy } from '../api/input-dto/comments-sort-by';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { CommentViewDto } from '../api/view-dto/comments.view-dto';
import { NotFoundException } from '@nestjs/common';
import {
    GetCommentsForSpecificPostId,
    GetCommentsForSpecificPostIdHandler,
} from './usecases/get-comments-for-specified-post-id.usecase';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';

describe('GetCommentsForSpecificPostIdHandler', () => {
    let handler: GetCommentsForSpecificPostIdHandler;

    const mockPostsQueryRepository = {
        ifPostExists: jest.fn(),
    };

    const mockCommentsQueryRepository = {
        getCommentsByPostId: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                // Тестируем теперь непосредственно сам обработчик CQRS
                GetCommentsForSpecificPostIdHandler,
                {
                    provide: PostsQueryRepository,
                    useValue: mockPostsQueryRepository,
                },
                {
                    provide: CommentsQueryRepository,
                    useValue: mockCommentsQueryRepository,
                },
            ],
        }).compile();

        handler = module.get<GetCommentsForSpecificPostIdHandler>(
            GetCommentsForSpecificPostIdHandler,
        );

        jest.clearAllMocks();
    });

    it('should find all comments related to the post and return them in paginated format', async () => {
        const fakePostId = 'somePostId';
        const fakeUserId = 'someUserId';
        const fakeQuery: GetCommentsQueryParams = new GetCommentsQueryParams();
        fakeQuery.pageSize = 10;
        fakeQuery.pageNumber = 1;

        const expectedResult = {
            totalCount: 1,
            pagesCount: 1,
            page: 1,
            pageSize: 10,
            items: [],
        };

        mockPostsQueryRepository.ifPostExists.mockResolvedValue(true);
        mockCommentsQueryRepository.getCommentsByPostId.mockResolvedValue(
            expectedResult,
        );

        // В CQRS мы создаем инстанс Query/Command класса
        // Используй синтаксис (с объектом или через запятую) в зависимости от того, какой конструктор ты выбрал ранее
        const queryInstance = new GetCommentsForSpecificPostId(
            fakePostId,
            fakeQuery,
            fakeUserId,
        );

        // Вызываем напрямую метод execute у хэндлера
        const result = await handler.execute(queryInstance);

        expect(mockPostsQueryRepository.ifPostExists).toHaveBeenCalledWith(
            fakePostId,
        );
        expect(result).toEqual(expectedResult);
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('totalCount');
    });

    it('should fail due to absent postId', async () => {
        const fakePostId = 'somePostId';
        const fakeUserId = 'someUserId';
        const fakeQuery: GetCommentsQueryParams = new GetCommentsQueryParams();
        fakeQuery.pageSize = 10;
        fakeQuery.pageNumber = 1;

        mockPostsQueryRepository.ifPostExists.mockResolvedValue(false);

        const queryInstance = new GetCommentsForSpecificPostId(
            fakePostId,
            fakeQuery,
            fakeUserId,
        );

        // В хэндлере у тебя выбрасывается DomainException, поэтому проверяем именно его!
        await expect(handler.execute(queryInstance)).rejects.toThrow(
            DomainException,
        );

        expect(mockPostsQueryRepository.ifPostExists).toHaveBeenCalledWith(
            fakePostId,
        );
        expect(
            mockCommentsQueryRepository.getCommentsByPostId,
        ).not.toHaveBeenCalled();
    });
});
