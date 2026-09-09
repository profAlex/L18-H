import {Test, TestingModule} from "@nestjs/testing";
import {BlogsCommandRepository} from "./blogs.command-repository";
import {getModelToken} from "@nestjs/mongoose";
import {Blog} from "../domain/blog.entity";

describe('BlogsCommandRepository', () => {
    let repository: BlogsCommandRepository;

    // Мок для самой модели (класса)
    const mockBlogModel = {
        findOne: jest.fn(),
        deleteOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BlogsCommandRepository,
                {
                    provide: getModelToken(Blog.name),
                    useValue: mockBlogModel,
                },
            ],
        }).compile();

        repository = module.get<BlogsCommandRepository>(BlogsCommandRepository);
        jest.clearAllMocks();
    });

    describe('save', () => {
        it('should call save method on the provided document', async () => {
            // Создаем фейковый документ блога, у которого есть метод save
            const fakeBlogDocument = {
                save: jest.fn().mockResolvedValue(null),
            };

            // Передаем его в репозиторий
            // Приводим к any, так как это не настоящий Mongoose-документ
            await repository.save(fakeBlogDocument as any);

            // Проверяем, что репозиторий "дернул" метод save у самого документа
            expect(fakeBlogDocument.save).toHaveBeenCalled();
        });
    });

    describe('getBlogDocumentById', () => {
        it('should return document if it exists and not deleted', async () => {
            const blogId = 'some-id';
            const fakeDocument = { _id: blogId, name: 'Test Blog' };

            mockBlogModel.findOne.mockResolvedValue(fakeDocument);

            const result = await repository.getBlogDocumentById(blogId);

            expect(mockBlogModel.findOne).toHaveBeenCalledWith({
                _id: blogId,
                deletedAt: null
            });
            expect(result).toEqual(fakeDocument);
        });

        it('should return null if blog not found', async () => {
            mockBlogModel.findOne.mockResolvedValue(null);

            const result = await repository.getBlogDocumentById('absent-id');

            expect(result).toBeNull();
        });
    });

    // describe('delete', () => {
    //     it('should return true if document was deleted', async () => {
    //         // Mongoose deleteOne возвращает объект { deletedCount: 1 }
    //         mockBlogModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
    //
    //         const result = await repository.delete('id-to-delete');
    //
    //         expect(mockBlogModel.deleteOne).toHaveBeenCalledWith({ _id: 'id-to-delete' });
    //         expect(result).toBe(true);
    //     });
    //
    //     it('should return false if document was not found to delete', async () => {
    //         mockBlogModel.deleteOne.mockResolvedValue({ deletedCount: 0 });
    //
    //         const result = await repository.delete('missing-id');
    //
    //         expect(result).toBe(false);
    //     });
    // });
});