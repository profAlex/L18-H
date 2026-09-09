import {CreatePostInputDto} from "../../dto/create-post-input.dto";

// Этот класс расширяет CreatePostInputDto. Мы добавляем в него blogId и blogName.
// Здесь декораторы @ApiProperty обычно не нужны, потому что этот класс не является входной точкой API. Иными словами,
// расширенные параметры либо учитываются в другом месте (bloId в params) либо вообще вычисляются в процессе
// работы (blogName бует искаться в сервис-слое)
export type CreatePostDomainDto = CreatePostInputDto & {
    blogId: string;
    blogName: string;
};