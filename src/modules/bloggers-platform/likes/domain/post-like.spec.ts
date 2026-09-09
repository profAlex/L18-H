import { PostLike } from './post-like.entity';
import { LikeStatus } from '../../../../core/enums/like-status.enum';

describe('PostLike Domain Entity', () => {
    describe('createInstance', () => {
        it('should successfully create a new post-like instance with correct user info', () => {
            // Входные данные (CreatePostLikeDomainDto)
            const dto = {
                postId: 'post-abc-123',
                userId: 'user-id-777',
                userLogin: 'super_hacker_99',
            };

            // Обходим вызов `new this()` через подмену контекста выполнения
            const mockConstructor = function (this: any) {};

            const result = PostLike.createInstance.call(
                mockConstructor as any,
                dto,
            );

            // Проверяем заполнение всех доменных полей
            expect(result.postId).toBe(dto.postId);
            expect(result.userId).toBe(dto.userId);
            expect(result.userLogin).toBe(dto.userLogin); // Важное отличие от комментов!
            expect(result.likeStatus).toBe(LikeStatus.None);

            // Проверяем валидность созданной даты
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(Date.now() - result.createdAt.getTime()).toBeLessThan(2000);
        });
    });

    describe('updateLikeStatus', () => {
        let postLikeInstance: PostLike;

        beforeEach(() => {
            // Инициализируем чистый объект перед каждым тестом
            postLikeInstance = new PostLike();
            postLikeInstance.postId = 'post-abc-123';
            postLikeInstance.userId = 'user-id-777';
            postLikeInstance.userLogin = 'super_hacker_99';
            postLikeInstance.likeStatus = LikeStatus.None;
        });

        it('should update status to Like and return true if current status is None', () => {
            const dto = { likeStatus: LikeStatus.Like };

            const isUpdated = postLikeInstance.updateLikeStatus(dto);

            expect(isUpdated).toBe(true);
            expect(postLikeInstance.likeStatus).toBe(LikeStatus.Like);
        });

        it('should return false and make no changes if new status is identical to current status', () => {
            // Устанавливаем статус, который будем "обновлять"
            postLikeInstance.likeStatus = LikeStatus.Dislike;
            const dto = { likeStatus: LikeStatus.Dislike };

            const isUpdated = postLikeInstance.updateLikeStatus(dto);

            expect(isUpdated).toBe(false);
            expect(postLikeInstance.likeStatus).toBe(LikeStatus.Dislike); // Остался прежним
        });

        it('should successfully change status from Dislike back to None', () => {
            postLikeInstance.likeStatus = LikeStatus.Dislike;
            const dto = { likeStatus: LikeStatus.None };

            const isUpdated = postLikeInstance.updateLikeStatus(dto);

            expect(isUpdated).toBe(true);
            expect(postLikeInstance.likeStatus).toBe(LikeStatus.None);
        });
    });
});
