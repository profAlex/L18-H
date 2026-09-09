import { CommentLike } from './comment-like.entity';
import { LikeStatus } from '../../../../core/enums/like-status.enum';

describe('CommentLike Domain Entity', () => {
    describe('createInstance', () => {
        it('should successfully create a new comment-like instance with default parameters', () => {
            // Входные данные для создания (DTO)
            const dto = {
                commentId: 'comment-123',
                userId: 'user-789',
            };

            // Так как внутри createInstance вызывается `new this()`,
            // для чистого юнит-теста мы подменяем контекст (this) через .call
            const mockConstructor = function (this: any) {};

            const result = CommentLike.createInstance.call(
                mockConstructor as any,
                dto,
            );

            // Проверяем, что поля заполнились правильно
            expect(result.commentId).toBe(dto.commentId);
            expect(result.userId).toBe(dto.userId);
            expect(result.deletedAt).toBeNull();
            expect(result.likeStatus).toBe(LikeStatus.None);

            // Проверяем, что дата создания — это текущее время (плюс-минус пара секунд)
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(Date.now() - result.createdAt.getTime()).toBeLessThan(2000);
        });
    });

    describe('updateLikeStatus', () => {
        let commentLikeInstance: CommentLike;

        beforeEach(() => {
            // Перед каждым тестом создаем чистый инстанс сущности
            commentLikeInstance = new CommentLike();
            commentLikeInstance.commentId = 'comment-123';
            commentLikeInstance.userId = 'user-789';
            commentLikeInstance.likeStatus = LikeStatus.None;
        });

        it('should change status and return true when new status is different', () => {
            const dto = { likeStatus: LikeStatus.Like };

            // Вызываем метод изменения статуса
            const isUpdated = commentLikeInstance.updateLikeStatus(dto);

            // Проверяем, что метод вернул true (статус изменился)
            expect(isUpdated).toBe(true);
            // Проверяем, что статус в объекте реально перезаписался
            expect(commentLikeInstance.likeStatus).toBe(LikeStatus.Like);
        });

        it('should NOT change status and return false when new status is the same as current', () => {
            // Устанавливаем текущий статус в Like
            commentLikeInstance.likeStatus = LikeStatus.Like;
            const dto = { likeStatus: LikeStatus.Like };

            // Пытаемся обновить на точно такой же Like
            const isUpdated = commentLikeInstance.updateLikeStatus(dto);

            // Метод должен вернуть false, так как изменений не произошло
            expect(isUpdated).toBe(false);
            expect(commentLikeInstance.likeStatus).toBe(LikeStatus.Like);
        });

        it('should successfully change status from Like to Dislike', () => {
            commentLikeInstance.likeStatus = LikeStatus.Like;
            const dto = { likeStatus: LikeStatus.Dislike };

            const isUpdated = commentLikeInstance.updateLikeStatus(dto);

            expect(isUpdated).toBe(true);
            expect(commentLikeInstance.likeStatus).toBe(LikeStatus.Dislike);
        });
    });
});
