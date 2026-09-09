import {PostsCommandRepository} from "./posts.command-repository";
import {getModelToken} from "@nestjs/mongoose";
import {Test, TestingModule} from "@nestjs/testing";
import {Post} from "../domain/post.entity";

describe('PostsCommandRepository', () => {
    let repository: PostsCommandRepository;

    const mockPostModel = {
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PostsCommandRepository,
                {
                    provide: getModelToken(Post.name),
                    useValue: mockPostModel,
                },
            ],
        }).compile();

        repository = module.get<PostsCommandRepository>(PostsCommandRepository);
        jest.clearAllMocks();
    });


    it('save - should call save method on the provided document', async () => {
        // Создаем фейковый документ блога, у которого есть метод save
        const fakePostDocument = {
            save: jest.fn().mockResolvedValue(null),
        };

        // Передаем его в репозиторий
        // Приводим к any, так как это не настоящий Mongoose-документ
        await repository.save(fakePostDocument as any);

        // Проверяем, что репозиторий "дернул" метод save у самого документа
        expect(fakePostDocument.save).toHaveBeenCalled();
    });

    describe('findSinglePostById', () => {
        it('should return post if it exists and not deleted', async () => {
            const postId = 'some-id';
            const fakeDocument = { _id: postId, name: 'Test Post' };

            mockPostModel.findOne.mockResolvedValue(fakeDocument);

            const result = await repository.findSinglePostById(postId);

            expect(mockPostModel.findOne).toHaveBeenCalledWith({
                _id: postId,
                deletedAt: null
            });
            expect(result).toEqual(fakeDocument);
        });

        it('should return null if post not found', async () => {
            mockPostModel.findOne.mockResolvedValue(null);
            const postId = 'absent-id';

            const result = await repository.findSinglePostById(postId);

            expect(mockPostModel.findOne).toHaveBeenCalledWith({
                _id: postId,
                deletedAt: null
            });
            expect(result).toBeNull();
        });
    });
});